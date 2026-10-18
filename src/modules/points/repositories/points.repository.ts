import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, type SelectQueryBuilder } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { LedgerQueryBo } from '../bo/points.bo.js';
import { PointsBalanceDao } from '../dao/points-balance.dao.js';
import { PointsTransactionDao } from '../dao/points-transaction.dao.js';

@Injectable()
export class PointsRepository extends BaseRepository<PointsTransactionDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, PointsTransactionDao);
  }

  /** Inserts one ledger row and returns its generated ID. */
  async insert(
    row: Pick<PointsTransactionDao, 'userId' | 'userRole' | 'source' | 'relatedType' | 'relatedId' | 'credit' | 'debit' | 'note' | 'createdBy'>,
    manager: EntityManager,
  ): Promise<string> {
    const result = await this.repo(manager).createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async available(userId: string, manager?: EntityManager): Promise<number> {
    const [row] = await this.manager(manager).query(
      'select coalesce(sum(credit) - sum(debit), 0)::int as available from points_ledger where user_id = $1',
      [userId],
    );
    return (row as { available: number }).available;
  }

  async balance(userId: string): Promise<PointsBalanceDao | null> {
    return this.manager().getRepository(PointsBalanceDao).findOneBy({ userId });
  }

  async balances(userIds: string[]): Promise<Map<string, PointsBalanceDao>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.manager()
      .getRepository(PointsBalanceDao)
      .createQueryBuilder('b')
      .where('b.user_id = ANY(:ids)', { ids: userIds })
      .getMany();
    return new Map(rows.map((r) => [r.userId, r]));
  }

  findById(id: string): Promise<PointsTransactionDao | null> {
    return this.repo().findOneBy({ id });
  }

  async findPage(query: LedgerQueryBo): Promise<Page<PointsTransactionDao>> {
    const qb = this.filtered(query).orderBy('l.createdAt', 'DESC').addOrderBy('l.id', 'DESC');
    const [items, total] = await qb.skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async totals(query: LedgerQueryBo): Promise<{ credited: number; debited: number; count: number }> {
    const row = await this.filtered(query)
      .select('coalesce(sum(l.credit), 0)::int', 'credited')
      .addSelect('coalesce(sum(l.debit), 0)::int', 'debited')
      .addSelect('count(*)::int', 'count')
      .getRawOne<{ credited: number; debited: number; count: number }>();
    return row ?? { credited: 0, debited: 0, count: 0 };
  }

  private filtered(query: LedgerQueryBo): SelectQueryBuilder<PointsTransactionDao> {
    const qb = this.repo().createQueryBuilder('l');
    if (query.userId) qb.andWhere('l.userId = :userId', { userId: query.userId });
    if (query.role) qb.andWhere('l.userRole = :role', { role: query.role });
    if (query.source) qb.andWhere('l.source = :source', { source: query.source });
    if (query.direction === 'credit') qb.andWhere('l.credit > 0');
    if (query.direction === 'debit') qb.andWhere('l.debit > 0');
    if (query.relatedType) qb.andWhere('l.relatedType = :relatedType', { relatedType: query.relatedType });
    if (query.relatedId) qb.andWhere('l.relatedId = :relatedId', { relatedId: query.relatedId });
    if (query.from) qb.andWhere('l.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('l.createdAt <= :to', { to: query.to });
    if (query.search) {
      // Matches transaction/user/related IDs, the note, or the participant's name.
      qb.andWhere(
        `(l.id ILIKE :q OR l.userId ILIKE :q OR l.note ILIKE :q OR l.relatedId ILIKE :q
          OR l.userId IN (SELECT id FROM plumbers WHERE name ILIKE :q UNION ALL SELECT id FROM retailers WHERE shop_name ILIKE :q))`,
        { q: likePattern(query.search) },
      );
    }
    return qb;
  }
}
