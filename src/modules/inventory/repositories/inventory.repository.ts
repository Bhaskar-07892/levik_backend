import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { likePattern, type Page } from '../../../common/dto/pagination.dto.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { InventoryQueryBo } from '../bo/inventory.bo.js';
import { InventoryItemDao } from '../dao/inventory-item.dao.js';

@Injectable()
export class InventoryRepository extends BaseRepository<InventoryItemDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, InventoryItemDao);
  }

  async findPage(query: InventoryQueryBo, threshold: number): Promise<Page<InventoryItemDao>> {
    const qb = this.repo().createQueryBuilder('i').innerJoinAndSelect('i.product', 'p').innerJoinAndSelect('i.retailer', 'r');
    if (query.retailerId) qb.andWhere('i.retailerId = :retailerId', { retailerId: query.retailerId });
    if (query.productId) qb.andWhere('i.productId = :productId', { productId: query.productId });
    if (query.category) qb.andWhere('p.category = :category', { category: query.category });
    if (query.stockStatus === 'Out of Stock') qb.andWhere('i.quantity = 0');
    if (query.stockStatus === 'Low Stock') qb.andWhere('i.quantity > 0 AND i.quantity <= :threshold', { threshold });
    if (query.stockStatus === 'In Stock') qb.andWhere('i.quantity > :threshold', { threshold });
    if (query.search) qb.andWhere('(p.name ILIKE :q OR p.modelCode ILIKE :q OR r.shopName ILIKE :q)', { q: likePattern(query.search) });
    const [items, total] = await qb
      .orderBy('i.quantity', 'ASC')
      .addOrderBy('i.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async summary(threshold: number): Promise<{ lines: number; retailers: number; low: number; out: number }> {
    const [row] = await this.dataSource.query(
      `select count(*)::int as lines, count(distinct retailer_id)::int as retailers,
              count(*) filter (where quantity > 0 and quantity <= $1)::int as low,
              count(*) filter (where quantity = 0)::int as out
         from inventory`,
      [threshold],
    );
    return row as { lines: number; retailers: number; low: number; out: number };
  }

  findById(id: string, manager?: EntityManager): Promise<InventoryItemDao | null> {
    return this.repo(manager).findOne({ where: { id }, relations: { product: true, retailer: true } });
  }

  async update(id: string, quantity: number, updatedBy: string, manager?: EntityManager): Promise<void> {
    await this.repo(manager).update({ id }, { quantity, updatedBy, updatedAt: () => 'now()' });
  }

  /** Retailer stock report: insert or overwrite the line for this product. */
  async upsert(retailerId: string, productId: string, quantity: number): Promise<string> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      `insert into inventory (retailer_id, product_id, quantity, updated_by)
       values ($1, $2, $3, 'Retailer app')
       on conflict (retailer_id, product_id) do update
         set quantity = excluded.quantity, updated_at = now(), updated_by = 'Retailer app'
       returning id`,
      [retailerId, productId, quantity],
    );
    return rows[0].id;
  }
}
