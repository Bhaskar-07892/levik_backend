import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { SchemeStatus, UserRole } from '../../../common/domain/enums.js';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { SchemeQueryBo } from '../bo/scheme.bo.js';
import { SchemeAwardDao } from '../dao/scheme-award.dao.js';
import { SchemeDao } from '../dao/scheme.dao.js';
import { returnedRows } from '../../../database/returned-rows.js';

export interface ParticipantRow {
  id: string;
  name: string;
  location: string;
}

@Injectable()
export class SchemesRepository extends BaseRepository<SchemeDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, SchemeDao);
  }

  async findPage(query: SchemeQueryBo): Promise<Page<SchemeDao>> {
    const qb = this.repo().createQueryBuilder('s').orderBy('s.startDate', 'DESC').addOrderBy('s.id', 'DESC');
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.role) qb.andWhere('s.role = :role', { role: query.role });
    if (query.search) qb.andWhere('(s.name ILIKE :q OR s.id ILIKE :q OR s.description ILIKE :q)', { q: likePattern(query.search) });
    const [items, total] = await qb.skip((query.page - 1) * query.pageSize).take(query.pageSize).getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.repo().createQueryBuilder('s').select('s.status', 'status').addSelect('count(*)::int', 'count').groupBy('s.status').getRawMany<{ status: string; count: number }>();
    return Object.fromEntries(rows.map((r) => [r.status, r.count]));
  }

  findById(id: string, manager?: EntityManager): Promise<SchemeDao | null> {
    return this.repo(manager).findOneBy({ id });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<SchemeDao | null> {
    return this.repo(manager).createQueryBuilder('s').setLock('pessimistic_write').where('s.id = :id', { id }).getOne();
  }

  /** Schemes paying out right now for a role. */
  findLive(role: UserRole, manager?: EntityManager): Promise<SchemeDao[]> {
    return this.repo(manager)
      .createQueryBuilder('s')
      .where(`s.role = :role AND s.status = 'Active' AND now() BETWEEN s.startDate AND s.endDate`, { role })
      .orderBy('s.startDate', 'ASC')
      .getMany();
  }

  findVisibleForRole(role: UserRole): Promise<SchemeDao[]> {
    return this.repo()
      .createQueryBuilder('s')
      .where(`s.role = :role AND s.status IN ('Active', 'Scheduled')`, { role })
      .orderBy('s.startDate', 'ASC')
      .getMany();
  }

  async insert(row: Partial<SchemeDao>): Promise<string> {
    const result = await this.repo().createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async update(id: string, patch: Partial<SchemeDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }

  /** Scheduled → Active and Active/Paused → Completed by date. Returns the affected IDs. */
  async promoteByDate(manager: EntityManager): Promise<{ activated: string[]; completed: string[] }> {
    const activated = returnedRows<{ id: string }>(
      await manager.query(`update schemes set status = 'Active' where status = 'Scheduled' and start_date <= now() and end_date >= now() returning id`),
    );
    const completed = returnedRows<{ id: string }>(
      await manager.query(`update schemes set status = 'Completed' where status in ('Active', 'Paused', 'Scheduled') and end_date < now() returning id`),
    );
    return { activated: activated.map((r) => r.id), completed: completed.map((r) => r.id) };
  }

  /**
   * Progress for many participants in one grouped query:
   * retailers → approved eligible invoice value (by invoice date); plumbers → approved eligible scans (by scan date).
   */
  async progress(scheme: SchemeDao, userIds: string[] | null, manager?: EntityManager): Promise<Map<string, number>> {
    const params = [scheme.startDate, scheme.endDate, scheme.eligibleCategories, userIds];
    const rows: Array<{ user_id: string; progress: string }> =
      scheme.role === 'retailer'
        ? await this.manager(manager).query(
            `select i.retailer_id as user_id, sum(l.quantity * l.unit_price) as progress
               from invoices i
               join invoice_lines l on l.invoice_id = i.id
               join products p on p.id = l.product_id
              where i.status = 'Approved' and i.invoice_date between $1 and $2
                and p.category = any($3::product_category[])
                and ($4::text[] is null or i.retailer_id = any($4))
              group by i.retailer_id`,
            params,
          )
        : await this.manager(manager).query(
            `select sc.plumber_id as user_id, count(*) as progress
               from scans sc
               join products p on p.id = sc.product_id
              where sc.status = 'Approved' and sc.scanned_at between $1 and $2
                and p.category = any($3::product_category[])
                and ($4::text[] is null or sc.plumber_id = any($4))
              group by sc.plumber_id`,
            params,
          );
    return new Map(rows.map((r) => [r.user_id, Number(r.progress)]));
  }

  /** Verified, active participants eligible for a role's schemes. */
  eligibleParticipants(role: UserRole): Promise<ParticipantRow[]> {
    return this.dataSource.query(
      role === 'plumber'
        ? `select id, name, city || ', ' || state as location from plumbers where verification_status = 'Verified' and account_status = 'Active'`
        : `select id, shop_name as name, city || ', ' || state as location from retailers where verification_status = 'Approved' and account_status = 'Active'`,
    );
  }

  async awardedUserIds(schemeId: string): Promise<Set<string>> {
    const rows = await this.manager().getRepository(SchemeAwardDao).find({ where: { schemeId }, select: { userId: true } });
    return new Set(rows.map((r) => r.userId));
  }

  async awardsForUser(userId: string): Promise<Set<string>> {
    const rows = await this.manager().getRepository(SchemeAwardDao).find({ where: { userId }, select: { schemeId: true } });
    return new Set(rows.map((r) => r.schemeId));
  }

  async awardCounts(schemeIds: string[]): Promise<Map<string, number>> {
    if (schemeIds.length === 0) return new Map();
    const rows: Array<{ scheme_id: string; count: number }> = await this.dataSource.query(
      `select scheme_id, count(*)::int as count from scheme_awards where scheme_id = any($1) group by scheme_id`,
      [schemeIds],
    );
    return new Map(rows.map((r) => [r.scheme_id, r.count]));
  }

  /** Inserts the award once; returns false if this participant was already awarded (concurrency-safe). */
  async tryInsertAward(schemeId: string, userId: string, manager: EntityManager): Promise<boolean> {
    const rows: Array<{ scheme_id: string }> = await manager.query(
      `insert into scheme_awards (scheme_id, user_id) values ($1, $2) on conflict do nothing returning scheme_id`,
      [schemeId, userId],
    );
    return rows.length === 1;
  }

  async setAwardTransaction(schemeId: string, userId: string, txnId: string, manager: EntityManager): Promise<void> {
    await manager.getRepository(SchemeAwardDao).update({ schemeId, userId }, { ledgerTxnId: txnId });
  }

  async setStatus(id: string, status: SchemeStatus, manager: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, { status });
  }
}
