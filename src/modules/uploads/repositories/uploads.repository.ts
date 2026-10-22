import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { BaseRepository } from '../../../database/base.repository.js';
import { UploadDao } from '../dao/upload.dao.js';

@Injectable()
export class UploadsRepository extends BaseRepository<UploadDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, UploadDao);
  }

  async insert(row: Omit<UploadDao, 'createdAt'>): Promise<void> {
    await this.repo().insert(row);
  }

  async reassign(key: string, ownerId: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ key }, { ownerId });
  }

  findByKey(key: string, manager?: EntityManager): Promise<UploadDao | null> {
    return this.repo(manager).findOneBy({ key });
  }
}
