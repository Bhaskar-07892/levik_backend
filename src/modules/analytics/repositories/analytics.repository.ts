import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Bucket } from '../../../common/utils/period.util.js';
import { likePattern } from '../../../common/dto/pagination.dto.js';
import type { DashboardKpisBo, PointsPointBo, SalesPointBo, ScanPointBo, SearchResultBo } from '../bo/analytics.bo.js';

const TZ = 'Asia/Kolkata';
const ISSUED_SOURCES = `('Product Scan', 'Invoice Incentive', 'Scheme Bonus', 'Manual Adjustment')`;

/** Buckets from $2 to $3 (inclusive) in IST, step = 1 $1 (day/week/month). */
const BUCKETS = `
  buckets as (
    select generate_series(
      date_trunc($1, $2::timestamptz at time zone '${TZ}'),
      date_trunc($1, $3::timestamptz at time zone '${TZ}'),
      ('1 ' || $1)::interval) as b)`;

/** Read-only aggregate SQL for dashboards, reports and the admin shell. */
@Injectable()
export class AnalyticsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async earliestActivity(): Promise<Date> {
    const [row] = await this.dataSource.query(
      `select least((select min(created_at) from points_ledger), (select min(invoice_date) from invoices), (select min(scanned_at) from scans), now()) as earliest`,
    );
    return new Date((row as { earliest: Date }).earliest);
  }

  async kpis(from: Date): Promise<DashboardKpisBo> {
    const [row] = await this.dataSource.query(
      `select
         (select count(*) from plumbers)::int as "totalPlumbers",
         (select count(*) from plumbers where verification_status = 'Verified')::int as "verifiedPlumbers",
         (select count(*) from retailers where verification_status = 'Approved' and account_status = 'Active')::int as "activeRetailers",
         (select count(*) from scans where scanned_at >= $1)::int as "productScans",
         (select count(*) from scans where status = 'Pending')::int as "pendingScans",
         (select count(*) from invoices where status in ('Submitted', 'Under Review'))::int as "pendingInvoices",
         (select count(*) from schemes where status = 'Active' and now() between start_date and end_date)::int as "activeSchemes",
         (select coalesce(sum(credit), 0) from points_ledger where created_at >= $1 and source in ${ISSUED_SOURCES})::int as "pointsIssued",
         (select coalesce(sum(debit) filter (where source = 'Redemption'), 0)
                 - coalesce(sum(credit) filter (where source = 'Redemption Reversal'), 0)
            from points_ledger where created_at >= $1)::int as "pointsRedeemed",
         (select count(*) from redemptions where status = 'Requested')::int as "pendingRedemptions",
         (select coalesce(sum(l.quantity * l.unit_price), 0) from invoices i join invoice_lines l on l.invoice_id = i.id
           where i.status = 'Approved' and i.invoice_date >= $1)::bigint as "verifiedSales"`,
      [from],
    );
    const r = row as Record<keyof DashboardKpisBo, string | number>;
    return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as unknown as DashboardKpisBo;
  }

  async salesTrend(bucket: Bucket, from: Date, to: Date): Promise<SalesPointBo[]> {
    const rows: Array<{ bucket: string; sales: string; invoices: number }> = await this.dataSource.query(
      `with ${BUCKETS},
       approved as (
         select date_trunc($1, i.invoice_date at time zone '${TZ}') as b, i.id, sum(l.quantity * l.unit_price) as amount
           from invoices i join invoice_lines l on l.invoice_id = i.id
          where i.status = 'Approved' and i.invoice_date between $2 and $3
          group by 1, 2)
       select to_char(buckets.b, 'YYYY-MM-DD') as bucket, coalesce(sum(a.amount), 0) as sales, count(a.id)::int as invoices
         from buckets left join approved a on a.b = buckets.b
        group by buckets.b order by buckets.b`,
      [bucket, from, to],
    );
    return rows.map((r) => ({ bucket: r.bucket, sales: Number(r.sales), invoices: r.invoices }));
  }

  async scanTrend(bucket: Bucket, from: Date, to: Date): Promise<ScanPointBo[]> {
    return this.dataSource.query(
      `with ${BUCKETS}
       select to_char(buckets.b, 'YYYY-MM-DD') as bucket,
              count(s.id) filter (where s.status = 'Approved')::int as approved,
              count(s.id) filter (where s.status = 'Pending')::int as pending,
              count(s.id) filter (where s.status = 'Rejected')::int as rejected,
              count(s.id) filter (where s.status = 'Flagged')::int as flagged
         from buckets
         left join scans s on date_trunc($1, s.scanned_at at time zone '${TZ}') = buckets.b and s.scanned_at between $2 and $3
        group by buckets.b order by buckets.b`,
      [bucket, from, to],
    );
  }

  async pointsTrend(bucket: Bucket, from: Date, to: Date): Promise<PointsPointBo[]> {
    return this.dataSource.query(
      `with ${BUCKETS}
       select to_char(buckets.b, 'YYYY-MM-DD') as bucket,
              coalesce(sum(l.credit) filter (where l.source in ${ISSUED_SOURCES}), 0)::int as earned,
              (coalesce(sum(l.debit) filter (where l.source = 'Redemption'), 0)
                - coalesce(sum(l.credit) filter (where l.source = 'Redemption Reversal'), 0))::int as redeemed
         from buckets
         left join points_ledger l on date_trunc($1, l.created_at at time zone '${TZ}') = buckets.b and l.created_at between $2 and $3
        group by buckets.b order by buckets.b`,
      [bucket, from, to],
    );
  }

  scansByStatus(from: Date, to: Date): Promise<Array<{ status: string; count: number }>> {
    return this.dataSource.query(
      `select s.status, count(sc.id)::int as count
         from unnest(enum_range(null::scan_status)) as s(status)
         left join scans sc on sc.status = s.status and sc.scanned_at between $1 and $2
        group by s.status order by s.status`,
      [from, to],
    );
  }

  topRetailers(from: Date, to: Date, limit: number): Promise<Array<{ retailerId: string; name: string; city: string; invoices: number; sales: number; points: number }>> {
    return this.dataSource.query(
      `select r.id as "retailerId", r.shop_name as name, r.city,
              count(distinct i.id)::int as invoices,
              sum(l.quantity * l.unit_price)::bigint as sales,
              (select coalesce(sum(i2.incentive_points), 0) from invoices i2
                where i2.retailer_id = r.id and i2.status = 'Approved' and i2.invoice_date between $1 and $2)::int as points
         from invoices i
         join invoice_lines l on l.invoice_id = i.id
         join retailers r on r.id = i.retailer_id
        where i.status = 'Approved' and i.invoice_date between $1 and $2
        group by r.id
        order by sales desc
        limit $3`,
      [from, to, limit],
    ).then((rows: Array<Record<string, unknown>>) => rows.map((r) => ({ ...r, sales: Number(r.sales) })) as never);
  }

  topProducts(from: Date, to: Date, limit: number): Promise<Array<{ productId: string; name: string; modelCode: string; category: string; scans: number; approved: number; points: number }>> {
    return this.dataSource.query(
      `select p.id as "productId", p.name, p.model_code as "modelCode", p.category,
              count(s.id)::int as scans,
              count(s.id) filter (where s.status = 'Approved')::int as approved,
              coalesce(sum(s.awarded_points) filter (where s.status = 'Approved'), 0)::int as points
         from scans s join products p on p.id = s.product_id
        where s.scanned_at between $1 and $2
        group by p.id
        order by scans desc, approved desc
        limit $3`,
      [from, to, limit],
    );
  }

  /** Global admin search across entities (backed by trigram indexes). Max `limit` results. */
  search(query: string, limit: number): Promise<SearchResultBo[]> {
    return this.dataSource.query(
      `(select 'Plumber' as type, id, name as title, id || ' · ' || city as subtitle from plumbers
         where (name || ' ' || mobile || ' ' || city) ilike $1 or id ilike $1 limit $2)
       union all
       (select 'Retailer', id, shop_name, id || ' · ' || city from retailers
         where (shop_name || ' ' || owner_name || ' ' || city || ' ' || coalesce(gstin, '')) ilike $1 or id ilike $1 limit $2)
       union all
       (select 'Product', id, name, sku || ' · ' || category from products
         where (name || ' ' || model_code || ' ' || sku) ilike $1 or id ilike $1 limit $2)
       union all
       (select 'Scan', id, id, submitted_code || ' · ' || status from scans where id ilike $1 or submitted_code ilike $1 limit $2)
       union all
       (select 'Invoice', id, invoice_number, id || ' · ' || status from invoices
         where id ilike $1 or invoice_number ilike $1 or buyer_name ilike $1 limit $2)
       union all
       (select 'Redemption', id, id, status::text from redemptions where id ilike $1 limit $2)
       union all
       (select 'Scheme', id, name, id || ' · ' || status from schemes where id ilike $1 or name ilike $1 limit $2)
       limit $2`,
      [likePattern(query), limit],
    );
  }

  async queueCounts(lowStockThreshold: number): Promise<{ pendingScans: number; pendingInvoices: number; requestedRedemptions: number; pendingRetailers: number; pendingKyc: number; lowStock: number; openTickets: number }> {
    const [row] = await this.dataSource.query(
      `select
         (select count(*) from scans where status = 'Pending')::int as "pendingScans",
         (select count(*) from invoices where status in ('Submitted', 'Under Review'))::int as "pendingInvoices",
         (select count(*) from redemptions where status = 'Requested')::int as "requestedRedemptions",
         (select count(*) from retailers where verification_status = 'Pending')::int as "pendingRetailers",
         (select count(*) from plumbers where verification_status = 'Pending')::int as "pendingKyc",
         (select count(*) from inventory where quantity <= $1)::int as "lowStock",
         (select count(*) from support_tickets where status in ('Open', 'In Progress'))::int as "openTickets"`,
      [lowStockThreshold],
    );
    return row as never;
  }
}
