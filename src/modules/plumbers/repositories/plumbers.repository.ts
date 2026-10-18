import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import type { AccountStatus, PlumberVerificationStatus } from '../../../common/domain/enums.js';
import { BaseRepository } from '../../../database/base.repository.js';
import { PointsBalanceDao } from '../../points/dao/points-balance.dao.js';
import type { PlumberQueryBo } from '../bo/plumber.bo.js';
import { PlumberDao } from '../dao/plumber.dao.js';

export interface PlumberWithPoints {
  plumber: PlumberDao;
  lifetime: number;
  available: number;
}

const SORT_COLUMNS: Record<NonNullable<PlumberQueryBo['sort']>, string> = {
  id: 'p.id',
  name: 'p.name',
  registeredAt: 'p.registeredAt',
  availablePoints: 'available',
};

@Injectable()
export class PlumbersRepository extends BaseRepository<PlumberDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, PlumberDao);
  }

  /** One query: plumbers + derived balances (LEFT JOIN on the balances view) + count. */
  async findPage(query: PlumberQueryBo): Promise<Page<PlumberWithPoints>> {
    const qb = this.repo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.preferredRetailer', 'r')
      .leftJoin(PointsBalanceDao, 'b', 'b.user_id = p.id')
      .addSelect('coalesce(b.lifetime, 0)', 'lifetime')
      .addSelect('coalesce(b.available, 0)', 'available');
    if (query.verificationStatus) qb.andWhere('p.verificationStatus = :v', { v: query.verificationStatus });
    if (query.accountStatus) qb.andWhere('p.accountStatus = :a', { a: query.accountStatus });
    if (query.state) qb.andWhere('p.state = :state', { state: query.state });
    if (query.search) {
      qb.andWhere(`((p.name || ' ' || p.mobile || ' ' || p.city) ILIKE :q OR p.id ILIKE :q)`, { q: likePattern(query.search) });
    }
    const total = await qb.getCount();
    qb.orderBy(SORT_COLUMNS[query.sort ?? 'id'], (query.order ?? 'asc').toUpperCase() as 'ASC' | 'DESC')
      .addOrderBy('p.id', 'ASC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize);
    const { entities, raw } = await qb.getRawAndEntities<{ lifetime: string; available: string }>();
    const items = entities.map((plumber, i) => ({ plumber, lifetime: Number(raw[i].lifetime), available: Number(raw[i].available) }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  findById(id: string, manager?: EntityManager): Promise<PlumberDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { preferredRetailer: true } });
  }

  findByMobile(mobile: string): Promise<PlumberDao | null> {
    return this.repo().findOneBy({ mobile });
  }

  async distinctStates(): Promise<string[]> {
    const rows = await this.repo().createQueryBuilder('p').select('DISTINCT p.state', 'state').orderBy('state').getRawMany<{ state: string }>();
    return rows.map((r) => r.state);
  }

  async scanCounts(id: string): Promise<{ total: number; approved: number; pending: number }> {
    const [row] = await this.dataSource.query(
      `select count(*)::int as total,
              count(*) filter (where status = 'Approved')::int as approved,
              count(*) filter (where status = 'Pending')::int as pending
         from scans where plumber_id = $1`,
      [id],
    );
    return row as { total: number; approved: number; pending: number };
  }

  async insert(row: Partial<PlumberDao>): Promise<string> {
    const result = await this.repo().createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async update(id: string, patch: Partial<PlumberDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }

  async setVerification(id: string, status: PlumberVerificationStatus, note: string | null, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, { verificationStatus: status, verificationNote: note });
  }

  async setAccountStatus(id: string, status: AccountStatus, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, { accountStatus: status });
  }
}
