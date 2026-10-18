import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { BaseRepository } from '../../../database/base.repository.js';
import { SettingsDao } from '../dao/settings.dao.js';

@Injectable()
export class SettingsRepository extends BaseRepository<SettingsDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, SettingsDao);
  }

  get(manager?: EntityManager): Promise<SettingsDao> {
    return this.repo(manager).findOneByOrFail({ id: true });
  }

  async update(patch: Partial<SettingsDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id: true }, patch);
  }
}
