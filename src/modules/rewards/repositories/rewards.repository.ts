import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { RewardInputBo, RewardQueryBo } from '../bo/reward.bo.js';
import { RewardDao } from '../dao/reward.dao.js';

@Injectable()
export class RewardsRepository extends BaseRepository<RewardDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, RewardDao);
  }

  async findPage(query: RewardQueryBo): Promise<Page<RewardDao>> {
    const qb = this.repo().createQueryBuilder('w').orderBy('w.pointsRequired', 'ASC').addOrderBy('w.id', 'ASC');
    if (query.category) qb.andWhere('w.category = :category', { category: query.category });
    if (query.isActive !== undefined) qb.andWhere('w.isActive = :isActive', { isActive: query.isActive });
    if (query.eligibleRole) qb.andWhere(':role = ANY(w.eligible_roles)', { role: query.eligibleRole });
    if (query.search) qb.andWhere('(w.name ILIKE :q OR w.id ILIKE :q OR w.description ILIKE :q)', { q: likePattern(query.search) });
    const [items, total] = await qb.skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  findById(id: string, manager?: EntityManager): Promise<RewardDao | null> {
    return this.repo(manager).findOneBy({ id });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<RewardDao | null> {
    return this.repo(manager).createQueryBuilder('w').setLock('pessimistic_write').where('w.id = :id', { id }).getOne();
  }

  /** Approved and not refunded redemptions per reward, in one grouped query. */
  async redeemedCounts(rewardIds: string[]): Promise<Map<string, number>> {
    if (rewardIds.length === 0) return new Map();
    const rows: Array<{ reward_id: string; count: number }> = await this.dataSource.query(
      `select reward_id, count(*)::int as count from redemptions
        where reward_id = any($1) and debit_txn_id is not null and reversal_txn_id is null
        group by reward_id`,
      [rewardIds],
    );
    return new Map(rows.map((r) => [r.reward_id, r.count]));
  }

  async insert(input: RewardInputBo): Promise<string> {
    const result = await this.repo().createQueryBuilder().insert().values(input).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async update(id: string, patch: Partial<RewardDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }

  /** Atomic stock change guarded by the CHECK (stock >= 0) constraint. */
  async changeStock(id: string, delta: number, manager: EntityManager): Promise<number> {
    const rows: Array<{ stock: number }> = await manager.query(`update rewards set stock = stock + $2 where id = $1 returning stock`, [id, delta]);
    return rows[0].stock;
  }
}
