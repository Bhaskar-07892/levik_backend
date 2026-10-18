import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../database/base.repository.js';
import { AdminDao } from '../dao/admin.dao.js';

@Injectable()
export class AdminsRepository extends BaseRepository<AdminDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, AdminDao);
  }

  findById(id: string): Promise<AdminDao | null> {
    return this.repo().findOneBy({ id });
  }

  /** Includes the password hash, which is excluded from every other read. */
  findByEmailWithPassword(email: string): Promise<AdminDao | null> {
    return this.repo()
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  async create(row: Pick<AdminDao, 'name' | 'email' | 'passwordHash'>): Promise<AdminDao> {
    return this.repo().save(this.repo().create({ ...row, email: row.email.trim().toLowerCase() }));
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.repo().update({ id }, { lastLoginAt: () => 'now()' });
  }

  async updateName(id: string, name: string): Promise<void> {
    await this.repo().update({ id }, { name });
  }
}
