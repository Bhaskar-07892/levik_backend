import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { AuditQueryBo } from '../bo/audit.bo.js';
import { AuditLogDao } from '../dao/audit-log.dao.js';

@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLogDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, AuditLogDao);
  }

  async insert(row: Pick<AuditLogDao, 'adminName' | 'adminId' | 'action' | 'entityType' | 'entityId' | 'summary'>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).insert(row);
  }

  async findPage(query: AuditQueryBo): Promise<Page<AuditLogDao>> {
    const [items, total] = await this.filtered(query)
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Newest first, at most `limit` rows (CSV export). */
  findForExport(query: Omit<AuditQueryBo, 'page' | 'pageSize'>, limit: number): Promise<AuditLogDao[]> {
    return this.filtered(query).take(limit).getMany();
  }

  private filtered(query: Omit<AuditQueryBo, 'page' | 'pageSize'>) {
    const qb = this.repo().createQueryBuilder('a').orderBy('a.at', 'DESC').addOrderBy('a.id', 'DESC');
    if (query.entityType) qb.andWhere('a.entityType = :entityType', { entityType: query.entityType });
    if (query.adminName) qb.andWhere('a.adminName = :adminName', { adminName: query.adminName });
    if (query.from) qb.andWhere('a.at >= :from', { from: query.from });
    if (query.to) qb.andWhere('a.at <= :to', { to: query.to });
    if (query.search) {
      qb.andWhere('(a.action ILIKE :q OR a.entityId ILIKE :q OR a.summary ILIKE :q)', { q: likePattern(query.search) });
    }
    return qb;
  }

  async distinctAdminNames(): Promise<string[]> {
    const rows = await this.repo()
      .createQueryBuilder('a')
      .select('DISTINCT a.adminName', 'name')
      .orderBy('name')
      .getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }
}
