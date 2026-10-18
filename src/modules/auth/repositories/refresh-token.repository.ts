import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, IsNull } from 'typeorm';
import { BaseRepository } from '../../../database/base.repository.js';
import { RefreshTokenDao } from '../dao/refresh-token.dao.js';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshTokenDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, RefreshTokenDao);
  }

  async create(row: Pick<RefreshTokenDao, 'subjectId' | 'role' | 'phone' | 'tokenHash' | 'expiresAt' | 'userAgent'>, manager?: EntityManager): Promise<RefreshTokenDao> {
    const repo = this.repo(manager);
    return repo.save(repo.create(row));
  }

  findByHashForUpdate(tokenHash: string, manager: EntityManager): Promise<RefreshTokenDao | null> {
    return this.repo(manager)
      .createQueryBuilder('t')
      .setLock('pessimistic_write')
      .where('t.tokenHash = :tokenHash', { tokenHash })
      .getOne();
  }

  async revoke(id: string, replacedBy: string | null, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, { revokedAt: () => 'now()', replacedBy });
  }

  async revokeAllForSubject(subjectId: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ subjectId, revokedAt: IsNull() }, { revokedAt: () => 'now()' });
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.repo().update({ tokenHash, revokedAt: IsNull() }, { revokedAt: () => 'now()' });
  }
}
