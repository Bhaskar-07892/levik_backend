import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { BaseRepository } from '../../../database/base.repository.js';
import { OtpChallengeDao } from '../dao/otp-challenge.dao.js';

@Injectable()
export class OtpChallengeRepository extends BaseRepository<OtpChallengeDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, OtpChallengeDao);
  }

  async create(row: Pick<OtpChallengeDao, 'phone' | 'codeHash' | 'expiresAt'>): Promise<void> {
    await this.repo().insert(row);
  }

  /** Requests in the window and the most recent one, used for resend throttling. */
  async recentStats(phone: string, since: Date): Promise<{ count: number; lastAt: Date | null }> {
    const row = await this.repo()
      .createQueryBuilder('o')
      .select('count(*)::int', 'count')
      .addSelect('max(o.createdAt)', 'lastAt')
      .where('o.phone = :phone AND o.createdAt >= :since', { phone, since })
      .getRawOne<{ count: number; lastAt: Date | null }>();
    return { count: row?.count ?? 0, lastAt: row?.lastAt ? new Date(row.lastAt) : null };
  }

  findLatestOpenForUpdate(phone: string, manager: EntityManager): Promise<OtpChallengeDao | null> {
    return this.repo(manager)
      .createQueryBuilder('o')
      .setLock('pessimistic_write')
      .where('o.phone = :phone AND o.consumedAt IS NULL', { phone })
      .orderBy('o.createdAt', 'DESC')
      .getOne();
  }

  async save(row: OtpChallengeDao, manager: EntityManager): Promise<void> {
    await this.repo(manager).save(row);
  }
}
