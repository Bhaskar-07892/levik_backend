import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { InvoiceQueryBo } from '../bo/invoice.bo.js';
import { InvoiceLineDao } from '../dao/invoice-line.dao.js';
import { InvoiceDao } from '../dao/invoice.dao.js';

export interface InvoiceWithAmount {
  invoice: InvoiceDao;
  amount: number;
}

const AMOUNT_SUBQUERY = `(select l.invoice_id, sum(l.quantity * l.unit_price) as amount from invoice_lines l group by l.invoice_id)`;

@Injectable()
export class InvoicesRepository extends BaseRepository<InvoiceDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, InvoiceDao);
  }

  async findPage(query: InvoiceQueryBo): Promise<Page<InvoiceWithAmount>> {
    const qb = this.repo()
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.retailer', 'r')
      .leftJoin(AMOUNT_SUBQUERY, 'a', 'a.invoice_id = i.id')
      .addSelect('coalesce(a.amount, 0)', 'amount');
    if (query.status) qb.andWhere('i.status = :status', { status: query.status });
    if (query.retailerId) qb.andWhere('i.retailerId = :retailerId', { retailerId: query.retailerId });
    if (query.from) qb.andWhere('i.submittedAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('i.submittedAt <= :to', { to: query.to });
    if (query.search) {
      qb.andWhere('(i.id ILIKE :q OR i.invoiceNumber ILIKE :q OR i.buyerName ILIKE :q OR r.shopName ILIKE :q OR i.reviewer ILIKE :q)', {
        q: likePattern(query.search),
      });
    }
    const total = await qb.getCount();
    qb.orderBy('i.submittedAt', 'DESC').addOrderBy('i.id', 'DESC').offset((query.page - 1) * query.pageSize).limit(query.pageSize);
    const { entities, raw } = await qb.getRawAndEntities<{ amount: string }>();
    return { items: entities.map((invoice, i) => ({ invoice, amount: Number(raw[i].amount) })), total, page: query.page, pageSize: query.pageSize };
  }

  async statusCounts(retailerId?: string): Promise<Record<string, number>> {
    const qb = this.repo().createQueryBuilder('i').select('i.status', 'status').addSelect('count(*)::int', 'count').groupBy('i.status');
    if (retailerId) qb.where('i.retailerId = :retailerId', { retailerId });
    const rows = await qb.getRawMany<{ status: string; count: number }>();
    return Object.fromEntries(rows.map((r) => [r.status, r.count]));
  }

  findWithLines(id: string, manager?: EntityManager): Promise<InvoiceDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { retailer: true, lines: { product: true } }, order: { lines: { id: 'ASC' } } });
  }

  findByIdForUpdate(id: string, manager: EntityManager): Promise<InvoiceDao | null> {
    return this.repo(manager).createQueryBuilder('i').setLock('pessimistic_write').where('i.id = :id', { id }).getOne();
  }

  /** Another active (non-rejected) invoice from the same retailer with the same number. */
  findDuplicate(retailerId: string, invoiceNumber: string, excludeId: string, manager?: EntityManager): Promise<InvoiceDao | null> {
    return this.repo(manager)
      .createQueryBuilder('i')
      .where('i.retailerId = :retailerId AND lower(i.invoiceNumber) = lower(:invoiceNumber) AND i.id <> :excludeId', { retailerId, invoiceNumber, excludeId })
      .andWhere(`i.status <> 'Rejected'`)
      .orderBy('i.submittedAt', 'ASC')
      .getOne();
  }

  async findLinked(retailerId: string, invoiceNumber: string, manager?: EntityManager): Promise<{ id: string; status: InvoiceDao['status']; productIds: string[] } | null> {
    const rows: Array<{ id: string; status: InvoiceDao['status']; product_ids: string[] }> = await this.manager(manager).query(
      `select i.id, i.status, array_agg(l.product_id) as product_ids
         from invoices i join invoice_lines l on l.invoice_id = i.id
        where i.retailer_id = $1 and lower(i.invoice_number) = lower($2)
        group by i.id
        order by max(i.submitted_at) desc
        limit 1`,
      [retailerId, invoiceNumber],
    );
    return rows[0] ? { id: rows[0].id, status: rows[0].status, productIds: rows[0].product_ids } : null;
  }

  async insertWithLines(
    invoice: Pick<InvoiceDao, 'invoiceNumber' | 'retailerId' | 'buyerName' | 'invoiceDate' | 'documentKey'>,
    lines: Array<Pick<InvoiceLineDao, 'productId' | 'quantity' | 'unitPrice'>>,
    manager: EntityManager,
  ): Promise<string> {
    const result = await this.repo(manager).createQueryBuilder().insert().values(invoice).returning(['id']).execute();
    const id = (result.raw as Array<{ id: string }>)[0].id;
    await manager.getRepository(InvoiceLineDao).insert(lines.map((l) => ({ ...l, invoiceId: id })));
    return id;
  }

  async update(id: string, patch: Partial<InvoiceDao>, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, patch);
  }
}
