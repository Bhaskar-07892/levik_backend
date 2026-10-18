import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import type { DealerRowBo, DealerSummaryBo, ExploreProductRowBo, ExploreQueryBo, LiveSchemeBo, ParticipantRole } from '../bo/explore.bo.js';

/** Dealers shown in Explore: approved, active shops only. */
const LISTED_DEALER = `r.verification_status = 'Approved' and r.account_status = 'Active'`;

const PRODUCT_COLUMNS = `p.id, p.name, p.model_code as "modelCode", p.category, p.description, p.dimensions, p.features,
  p.image_url as "imageUrl", p.mrp::int as mrp, p.plumber_points as "plumberPoints", p.reward_eligible as "rewardEligible"`;

/**
 * Read model over products × retailer-reported inventory × stores. Each method is a single query;
 * dealer availability uses the inventory(product_id) partial index (migration 1761000000000).
 */
@Injectable()
export class ExploreRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Active products with how many listed dealers have them in stock (one aggregate, no N+1). */
  async productPage(query: ExploreQueryBo): Promise<Page<ExploreProductRowBo>> {
    const params: unknown[] = [];
    const where = ['p.is_active'];
    if (query.category) {
      params.push(query.category);
      where.push(`p.category = $${params.length}`);
    }
    if (query.search) {
      params.push(likePattern(query.search));
      where.push(`(p.name ilike $${params.length} or p.model_code ilike $${params.length} or p.category::text ilike $${params.length})`);
    }
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const rows: Array<ExploreProductRowBo & { total: number }> = await this.dataSource.query(
      `with stock as (
         select i.product_id, count(*)::int as dealers
           from inventory i join retailers r on r.id = i.retailer_id
          where i.quantity > 0 and ${LISTED_DEALER}
          group by i.product_id
       )
       select ${PRODUCT_COLUMNS}, coalesce(s.dealers, 0) as "dealersInStock", count(*) over ()::int as total
         from products p left join stock s on s.product_id = p.id
        where ${where.join(' and ')}
        order by coalesce(s.dealers, 0) desc, p.name
        limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    return { items: rows.map(({ total: _total, ...row }) => row), total: rows[0]?.total ?? 0, page: query.page, pageSize: query.pageSize };
  }

  async product(id: string): Promise<ExploreProductRowBo | undefined> {
    const rows: ExploreProductRowBo[] = await this.dataSource.query(
      `select ${PRODUCT_COLUMNS},
              (select count(*)::int from inventory i join retailers r on r.id = i.retailer_id
                where i.product_id = p.id and i.quantity > 0 and ${LISTED_DEALER}) as "dealersInStock"
         from products p where p.id = $1 and p.is_active`,
      [id],
    );
    return rows[0];
  }

  /** Dealers with the product in stock: caller's city first, then most stock. */
  dealersForProduct(productId: string, city: string | null, limit = 50): Promise<Array<DealerRowBo & { quantity: number; updatedAt: Date }>> {
    return this.dataSource.query(
      `select r.id, r.shop_name as "shopName", r.address, r.city, r.state, r.mobile,
              coalesce(lower(r.city) = lower($2), false) as "sameCity", i.quantity, i.updated_at as "updatedAt"
         from inventory i join retailers r on r.id = i.retailer_id
        where i.product_id = $1 and i.quantity > 0 and ${LISTED_DEALER}
        order by "sameCity" desc, i.quantity desc, r.shop_name
        limit $3`,
      [productId, city, limit],
    );
  }

  /** Listed dealers with the number of products in stock: caller's city first. */
  dealers(search: string | undefined, city: string | null, limit = 50): Promise<DealerSummaryBo[]> {
    return this.dataSource.query(
      `select r.id, r.shop_name as "shopName", r.address, r.city, r.state, r.mobile,
              coalesce(lower(r.city) = lower($2), false) as "sameCity",
              count(i.id) filter (where i.quantity > 0)::int as "productsInStock"
         from retailers r left join inventory i on i.retailer_id = r.id
        where ${LISTED_DEALER} and ($1::text is null or r.shop_name ilike $1 or r.city ilike $1 or r.address ilike $1)
        group by r.id
        order by "sameCity" desc, "productsInStock" desc, r.shop_name
        limit $3`,
      [search ? likePattern(search) : null, city, limit],
    );
  }

  async dealer(id: string, city: string | null): Promise<DealerRowBo | undefined> {
    const rows: DealerRowBo[] = await this.dataSource.query(
      `select r.id, r.shop_name as "shopName", r.address, r.city, r.state, r.mobile,
              coalesce(lower(r.city) = lower($2), false) as "sameCity"
         from retailers r where r.id = $1 and ${LISTED_DEALER}`,
      [id, city],
    );
    return rows[0];
  }

  /** Active products a dealer has in stock. */
  dealerProducts(retailerId: string): Promise<Array<ExploreProductRowBo & { quantity: number }>> {
    return this.dataSource.query(
      `select ${PRODUCT_COLUMNS}, 0 as "dealersInStock", i.quantity
         from inventory i join products p on p.id = i.product_id
        where i.retailer_id = $1 and i.quantity > 0 and p.is_active
        order by p.category, p.name`,
      [retailerId],
    );
  }

  /** Schemes running now for a role (few rows; category matching happens in the service). */
  liveSchemes(role: ParticipantRole): Promise<LiveSchemeBo[]> {
    return this.dataSource.query(
      `select id, name, description, eligible_categories::text[] as "eligibleCategories", target_value::int as "targetValue",
              incentive_points as "incentivePoints", end_date as "endDate"
         from schemes
        where role = $1 and status = 'Active' and now() between start_date and end_date
        order by end_date`,
      [role],
    );
  }

  /** The caller's city, used to put nearby dealers first. */
  async cityOf(userId: string): Promise<string | null> {
    const rows: Array<{ city: string }> = await this.dataSource.query(
      `select city from plumbers where id = $1 union all select city from retailers where id = $1 limit 1`,
      [userId],
    );
    return rows[0]?.city ?? null;
  }
}
