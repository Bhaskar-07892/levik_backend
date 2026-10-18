import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { TicketStatus } from '../../../common/domain/enums.js';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { TicketQueryBo } from '../bo/support.bo.js';
import { SupportTicketDao } from '../dao/support-ticket.dao.js';
import { TicketNoteDao } from '../dao/ticket-note.dao.js';

@Injectable()
export class SupportRepository extends BaseRepository<SupportTicketDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, SupportTicketDao);
  }

  async findPage(query: TicketQueryBo): Promise<Page<SupportTicketDao>> {
    const qb = this.repo().createQueryBuilder('t');
    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority });
    if (query.userId) qb.andWhere('t.userId = :userId', { userId: query.userId });
    if (query.search) {
      qb.andWhere(
        `(t.id ILIKE :q OR t.subject ILIKE :q OR t.description ILIKE :q
          OR t.userId IN (SELECT id FROM plumbers WHERE name ILIKE :q UNION ALL SELECT id FROM retailers WHERE shop_name ILIKE :q))`,
        { q: likePattern(query.search) },
      );
    }
    const [items, total] = await qb
      .orderBy('t.updatedAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async statusCounts(): Promise<Record<string, number>> {
    const rows = await this.repo().createQueryBuilder('t').select('t.status', 'status').addSelect('count(*)::int', 'count').groupBy('t.status').getRawMany<{ status: string; count: number }>();
    return Object.fromEntries(rows.map((r) => [r.status, r.count]));
  }

  findWithNotes(id: string, manager?: EntityManager): Promise<SupportTicketDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { notes: true }, order: { notes: { at: 'ASC' } } });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<SupportTicketDao | null> {
    return this.repo(manager).createQueryBuilder('t').setLock('pessimistic_write').where('t.id = :id', { id }).getOne();
  }

  async insert(row: Partial<SupportTicketDao>): Promise<string> {
    const result = await this.repo().createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async setStatus(id: string, status: TicketStatus, manager: EntityManager): Promise<void> {
    // updated_at is maintained by a trigger; touch it even when only a note is added.
    await this.repo(manager).update({ id }, { status });
  }

  async addNote(ticketId: string, byName: string, body: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(TicketNoteDao).insert({ ticketId, byName, body });
  }
}
