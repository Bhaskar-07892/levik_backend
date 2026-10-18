import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { RedemptionQueryBo } from '../bo/redemption.bo.js';
import { RedemptionDao } from '../dao/redemption.dao.js';

@Injectable()
export class RedemptionsRepository extends BaseRepository<RedemptionDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, RedemptionDao);
  }

  async findPage(query: RedemptionQueryBo): Promise<Page<RedemptionDao>> {
    const qb = this.repo().createQueryBuilder('d').innerJoinAndSelect('d.reward', 'w');
    if (query.status) qb.andWhere('d.status = :status', { status: query.status });
    if (query.role) qb.andWhere('d.userRole = :role', { role: query.role });
    if (query.userId) qb.andWhere('d.userId = :userId', { userId: query.userId });
    if (query.rewardId) qb.andWhere('d.rewardId = :rewardId', { rewardId: query.rewardId });
    if (query.search) {
      qb.andWhere(
        `(d.id ILIKE :q OR w.name ILIKE :q OR d.fulfilmentRef ILIKE :q OR d.userId ILIKE :q
          OR d.userId IN (SELECT id FROM plumbers WHERE name ILIKE :q UNION ALL SELECT id FROM retailers WHERE shop_name ILIKE :q))`,
        { q: likePattern(query.search) },
      );
    }
    const [items, total] = await qb
      .orderBy('d.requestedAt', 'DESC')
      .addOrderBy('d.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async statusCounts(userId?: string): Promise<Record<string, number>> {
    const qb = this.repo().createQueryBuilder('d').select('d.status', 'status').addSelect('count(*)::int', 'count').groupBy('d.status');
    if (userId) qb.where('d.userId = :userId', { userId });
    const rows = await qb.getRawMany<{ status: string; count: number }>();
    return Object.fromEntries(rows.map((r) => [r.status, r.count]));
  }

  findWithReward(id: string, manager?: EntityManager): Promise<RedemptionDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { reward: true } });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<RedemptionDao | null> {
    return this.repo(manager).createQueryBuilder('d').setLock('pessimistic_write').where('d.id = :id', { id }).getOne();
  }

  /** Points already promised to this user's open (not yet approved) requests. */
  async reservedPoints(userId: string, manager: EntityManager): Promise<number> {
    const [row] = await manager.query(`select coalesce(sum(points_cost), 0)::int as reserved from redemptions where user_id = $1 and status = 'Requested'`, [userId]);
    return (row as { reserved: number }).reserved;
  }

  async insert(row: Partial<RedemptionDao>, manager: EntityManager): Promise<string> {
    const result = await this.repo(manager).createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async update(id: string, patch: Partial<RedemptionDao>, manager: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }
}
