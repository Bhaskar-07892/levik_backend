import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import { PointsBalanceDao } from '../../points/dao/points-balance.dao.js';
import type { RetailerQueryBo } from '../bo/retailer.bo.js';
import { RetailerDao } from '../dao/retailer.dao.js';

export interface RetailerWithStats {
  retailer: RetailerDao;
  sales30d: number;
  available: number;
}

/** Approved invoice value per retailer over the last 30 days (by invoice date). */
const SALES_30D_SUBQUERY = `(
  select i.retailer_id, sum(l.quantity * l.unit_price) as sales
    from invoices i
    join invoice_lines l on l.invoice_id = i.id
   where i.status = 'Approved' and i.invoice_date >= now() - interval '30 days'
   group by i.retailer_id)`;

const SORT_COLUMNS: Record<NonNullable<RetailerQueryBo['sort']>, string> = {
  id: 'r.id',
  shopName: 'r.shopName',
  sales30d: 'sales30d',
  achievementPct: 'achievement',
};

@Injectable()
export class RetailersRepository extends BaseRepository<RetailerDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, RetailerDao);
  }

  async findPage(query: RetailerQueryBo): Promise<Page<RetailerWithStats>> {
    const qb = this.repo()
      .createQueryBuilder('r')
      .leftJoin(SALES_30D_SUBQUERY, 's', 's.retailer_id = r.id')
      .leftJoin(PointsBalanceDao, 'b', 'b.user_id = r.id')
      .addSelect('coalesce(s.sales, 0)', 'sales30d')
      .addSelect('coalesce(b.available, 0)', 'available')
      .addSelect('case when r.monthly_target > 0 then coalesce(s.sales, 0) * 100.0 / r.monthly_target else 0 end', 'achievement');
    if (query.verificationStatus) qb.andWhere('r.verificationStatus = :v', { v: query.verificationStatus });
    if (query.accountStatus) qb.andWhere('r.accountStatus = :a', { a: query.accountStatus });
    if (query.state) qb.andWhere('r.state = :state', { state: query.state });
    if (query.search) {
      qb.andWhere(`((r.shop_name || ' ' || r.owner_name || ' ' || r.city || ' ' || coalesce(r.gstin, '')) ILIKE :q OR r.id ILIKE :q OR r.mobile ILIKE :q)`, {
        q: likePattern(query.search),
      });
    }
    const total = await qb.getCount();
    qb.orderBy(SORT_COLUMNS[query.sort ?? 'id'], (query.order ?? 'asc').toUpperCase() as 'ASC' | 'DESC')
      .addOrderBy('r.id', 'ASC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize);
    const { entities, raw } = await qb.getRawAndEntities<{ sales30d: string; available: string }>();
    const items = entities.map((retailer, i) => ({ retailer, sales30d: Number(raw[i].sales30d), available: Number(raw[i].available) }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  findById(id: string, manager?: EntityManager): Promise<RetailerDao | null> {
    return this.repo(manager).findOneBy({ id });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<RetailerDao | null> {
    return this.repo(manager).createQueryBuilder('r').setLock('pessimistic_write').where('r.id = :id', { id }).getOne();
  }

  findByMobile(mobile: string, manager?: EntityManager): Promise<RetailerDao | null> {
    return this.repo(manager).findOneBy({ mobile });
  }

  async sales30d(id: string): Promise<number> {
    const [row] = await this.dataSource.query(`select coalesce(sum(sales), 0) as sales from ${SALES_30D_SUBQUERY} s where s.retailer_id = $1`, [id]);
    return Number((row as { sales: string }).sales);
  }

  async distinctStates(): Promise<string[]> {
    const rows = await this.repo().createQueryBuilder('r').select('DISTINCT r.state', 'state').orderBy('state').getRawMany<{ state: string }>();
    return rows.map((r) => r.state);
  }

  /** Approved, active shops for the plumber app. */
  async findStores(filter: { city?: string; search?: string; page: number; pageSize: number }): Promise<Page<RetailerDao>> {
    const qb = this.repo()
      .createQueryBuilder('r')
      .where(`r.verificationStatus = 'Approved' AND r.accountStatus = 'Active'`)
      .orderBy('r.shopName', 'ASC');
    if (filter.city) qb.andWhere('lower(r.city) = lower(:city)', { city: filter.city });
    if (filter.search) qb.andWhere('(r.shopName ILIKE :q OR r.address ILIKE :q OR r.city ILIKE :q)', { q: likePattern(filter.search) });
    const [items, total] = await qb.skip((filter.page - 1) * filter.pageSize).take(filter.pageSize).getManyAndCount();
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }

  async insert(row: Partial<RetailerDao>, manager?: EntityManager): Promise<string> {
    const result = await this.repo(manager).createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async update(id: string, patch: Partial<RetailerDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }
}
