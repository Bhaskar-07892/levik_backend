import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import { BillLineDao } from '../dao/bill-line.dao.js';
import { CustomerBillDao } from '../dao/customer-bill.dao.js';

@Injectable()
export class BillsRepository extends BaseRepository<CustomerBillDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, CustomerBillDao);
  }

  /** Next per-store bill number, B-0001, B-0002… Call under the store's bill lock. */
  async nextNumber(retailerId: string, manager: EntityManager): Promise<string> {
    const [{ n }] = (await manager.query(`select count(*)::int + 1 as n from customer_bills where retailer_id = $1`, [retailerId])) as Array<{ n: number }>;
    return `B-${String(n).padStart(4, '0')}`;
  }

  async insert(
    bill: Pick<CustomerBillDao, 'retailerId' | 'billNumber' | 'customerName' | 'customerMobile' | 'scanId' | 'totalValue' | 'createdBy'>,
    lines: Array<Pick<BillLineDao, 'productId' | 'quantity' | 'unitPrice'>>,
    manager: EntityManager,
  ): Promise<string> {
    const result = await manager.getRepository(CustomerBillDao).createQueryBuilder().insert().values(bill).returning(['id']).execute();
    const id = (result.raw as Array<{ id: string }>)[0].id;
    await manager.getRepository(BillLineDao).insert(lines.map((l) => ({ ...l, billId: id })));
    return id;
  }

  async findPage(query: { retailerId?: string; search?: string; page: number; pageSize: number }): Promise<Page<CustomerBillDao>> {
    const qb = this.repo().createQueryBuilder('b').innerJoinAndSelect('b.retailer', 'r').leftJoinAndSelect('b.lines', 'l').leftJoinAndSelect('l.product', 'p');
    if (query.retailerId) qb.andWhere('b.retailerId = :retailerId', { retailerId: query.retailerId });
    if (query.search) qb.andWhere('(b.customerName ILIKE :q OR b.billNumber ILIKE :q OR b.id ILIKE :q)', { q: likePattern(query.search) });
    const [items, total] = await qb
      .orderBy('b.createdAt', 'DESC')
      .addOrderBy('b.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  findWithLines(id: string, manager?: EntityManager): Promise<CustomerBillDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { retailer: true, lines: { product: true } }, order: { lines: { id: 'ASC' } } });
  }
}
