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

  findByKey(key: string, manager?: EntityManager): Promise<UploadDao | null> {
    return this.repo(manager).findOneBy({ key });
  }
}
