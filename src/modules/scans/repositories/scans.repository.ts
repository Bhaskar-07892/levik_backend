import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager, In } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { ScanQueryBo } from '../bo/scan.bo.js';
import { ScanDao } from '../dao/scan.dao.js';

@Injectable()
export class ScansRepository extends BaseRepository<ScanDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, ScanDao);
  }

  /** Joins plumber, product and retailer in the same query (no N+1). */
  async findPage(query: ScanQueryBo): Promise<Page<ScanDao>> {
    const qb = this.repo()
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.plumber', 'pl')
      .innerJoinAndSelect('s.product', 'p')
      .leftJoinAndSelect('s.retailer', 'r');
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.plumberId) qb.andWhere('s.plumberId = :plumberId', { plumberId: query.plumberId });
    if (query.productId) qb.andWhere('s.productId = :productId', { productId: query.productId });
    if (query.retailerId === 'none') qb.andWhere('s.retailerId IS NULL');
    else if (query.retailerId) qb.andWhere('s.retailerId = :retailerId', { retailerId: query.retailerId });
    if (query.from) qb.andWhere('s.scannedAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('s.scannedAt <= :to', { to: query.to });
    if (query.search) {
      qb.andWhere(
        '(s.id ILIKE :q OR s.submittedCode ILIKE :q OR s.invoiceNumber ILIKE :q OR pl.name ILIKE :q OR p.modelCode ILIKE :q OR p.name ILIKE :q OR r.shopName ILIKE :q)',
        { q: likePattern(query.search) },
      );
    }
    const [items, total] = await qb
      .orderBy('s.scannedAt', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async statusCounts(plumberId?: string): Promise<Record<string, number>> {
    const qb = this.repo().createQueryBuilder('s').select('s.status', 'status').addSelect('count(*)::int', 'count').groupBy('s.status');
    if (plumberId) qb.where('s.plumberId = :plumberId', { plumberId });
    const rows = await qb.getRawMany<{ status: string; count: number }>();
    return Object.fromEntries(rows.map((r) => [r.status, r.count]));
  }

  findWithRelations(id: string, manager?: EntityManager): Promise<ScanDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { plumber: true, product: true, retailer: true } });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<ScanDao | null> {
    return this.repo(manager).createQueryBuilder('s').setLock('pessimistic_write').where('s.id = :id', { id }).getOne();
  }

  findApprovedBySerial(serial: string, excludeId: string, manager?: EntityManager): Promise<ScanDao | null> {
    return this.repo(manager)
      .createQueryBuilder('s')
      .where(`s.submittedCode = :serial AND s.status = 'Approved' AND s.id <> :excludeId`, { serial, excludeId })
      .getOne();
  }

  /** Pending/flagged/approved scans of a serial block a new submission. */
  findActiveBySerial(serial: string, manager?: EntityManager): Promise<ScanDao | null> {
    return this.repo(manager).findOne({ where: { submittedCode: serial, status: In(['Pending', 'Flagged', 'Approved']) } });
  }

  countSince(plumberId: string, since: Date, manager?: EntityManager): Promise<number> {
    return this.repo(manager).createQueryBuilder('s').where('s.plumberId = :plumberId AND s.scannedAt >= :since', { plumberId, since }).getCount();
  }

  async insert(row: Partial<ScanDao>, manager: EntityManager): Promise<string> {
    const result = await this.repo(manager).createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  async update(id: string, patch: Partial<ScanDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }

  /** Scans where a plumber said they bought from this retailer, newest first. */
  async findRetailerSales(retailerId: string, decision: 'Pending' | 'Confirmed' | 'Declined' | undefined, page: number, pageSize: number): Promise<Page<ScanDao>> {
    const qb = this.repo()
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.plumber', 'pl')
      .innerJoinAndSelect('s.product', 'p')
      .leftJoinAndSelect('s.retailer', 'r')
      .where('s.retailerId = :retailerId', { retailerId });
    if (decision === 'Pending') qb.andWhere("s.retailerDecision IS NULL AND s.status IN ('Pending', 'Flagged')");
    else if (decision) qb.andWhere('s.retailerDecision = :decision', { decision });
    const [items, total] = await qb
      .orderBy('s.scannedAt', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items, total, page, pageSize };
  }

  async billsForScans(scanIds: string[]): Promise<Map<string, { id: string; billNumber: string }>> {
    if (scanIds.length === 0) return new Map();
    const rows = (await this.dataSource.query(`select scan_id, id, bill_number from customer_bills where scan_id = any($1)`, [scanIds])) as Array<{
      scan_id: string;
      id: string;
      bill_number: string;
    }>;
    return new Map(rows.map((r) => [r.scan_id, { id: r.id, billNumber: r.bill_number }]));
  }
}
