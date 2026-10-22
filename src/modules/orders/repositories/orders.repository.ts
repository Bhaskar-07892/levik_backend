import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { OrderQueryBo } from '../bo/order.bo.js';
import { OrderLineDao } from '../dao/order-line.dao.js';
import { OrderDao } from '../dao/order.dao.js';

@Injectable()
export class OrdersRepository extends BaseRepository<OrderDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, OrderDao);
  }

  async insert(order: Pick<OrderDao, 'retailerId' | 'note' | 'totalValue'>, lines: Array<Pick<OrderLineDao, 'productId' | 'quantity' | 'unitPrice'>>, manager: EntityManager): Promise<string> {
    const result = await manager.getRepository(OrderDao).createQueryBuilder().insert().values(order).returning(['id']).execute();
    const id = (result.raw as Array<{ id: string }>)[0].id;
    await manager.getRepository(OrderLineDao).insert(lines.map((l) => ({ ...l, orderId: id })));
    return id;
  }

  async findPage(query: OrderQueryBo): Promise<Page<OrderDao>> {
    const qb = this.repo().createQueryBuilder('o').innerJoinAndSelect('o.retailer', 'r').leftJoinAndSelect('o.lines', 'l').leftJoinAndSelect('l.product', 'p');
    if (query.retailerId) qb.andWhere('o.retailerId = :retailerId', { retailerId: query.retailerId });
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.search) qb.andWhere('(o.id ILIKE :q OR r.shopName ILIKE :q OR o.purchaseInvoiceNumber ILIKE :q)', { q: likePattern(query.search) });
    const [items, total] = await qb
      .orderBy('o.placedAt', 'DESC')
      .addOrderBy('o.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  findWithLines(id: string, manager?: EntityManager): Promise<OrderDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { retailer: true, lines: { product: true } }, order: { lines: { id: 'ASC' } } });
  }

  findForUpdate(id: string, manager: EntityManager): Promise<OrderDao | null> {
    return this.repo(manager).createQueryBuilder('o').setLock('pessimistic_write').where('o.id = :id', { id }).getOne();
  }

  async update(id: string, patch: Partial<OrderDao>, manager: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, { ...patch, updatedAt: () => 'now()' });
  }

  /** LVK/PI/2026/00042: purchase invoice numbers never repeat (sequence). */
  async nextInvoiceNumber(manager: EntityManager): Promise<string> {
    const [{ n }] = (await manager.query(`select nextval('purchase_invoice_seq')::int as n`)) as Array<{ n: number }>;
    return `LVK/PI/${new Date().getFullYear()}/${String(n).padStart(5, '0')}`;
  }

  async statusCounts(retailerId?: string): Promise<Record<string, number>> {
    const qb = this.repo().createQueryBuilder('o').select('o.status', 'status').addSelect('count(*)::int', 'count').groupBy('o.status');
    if (retailerId) qb.where('o.retailerId = :retailerId', { retailerId });
    const rows = await qb.getRawMany<{ status: string; count: number }>();
    return Object.fromEntries(rows.map((r) => [r.status, r.count]));
  }
}
