import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { RelatedEntity } from '../../../common/domain/enums.js';
import { BaseRepository } from '../../../database/base.repository.js';
import { StatusEventDao } from '../dao/status-event.dao.js';

@Injectable()
export class StatusEventRepository extends BaseRepository<StatusEventDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, StatusEventDao);
  }

  async insert(row: Pick<StatusEventDao, 'entityType' | 'entityId' | 'byName' | 'action' | 'note'>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).insert(row);
  }

  findForEntity(entityType: RelatedEntity, entityId: string): Promise<StatusEventDao[]> {
    return this.repo().find({ where: { entityType, entityId }, order: { at: 'ASC', id: 'ASC' } });
  }
}
