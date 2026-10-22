import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { StockReason } from '../../../common/domain/enums.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { StockMovementDao } from '../dao/stock-movement.dao.js';

export interface MovementInsert {
  retailerId: string;
  productId: string;
  delta: number;
  balanceAfter: number;
  reason: StockReason;
  relatedType: string | null;
  relatedId: string | null;
  note: string | null;
  createdBy: string;
}

export interface MovementRow {
  id: string;
  retailerId: string;
  retailerName: string;
  productId: string;
  productName: string;
  modelCode: string;
  delta: number;
  balanceAfter: number;
  reason: StockReason;
  relatedType: string | null;
  relatedId: string | null;
  note: string | null;
  createdAt: Date;
  createdBy: string;
}

/** Stock balances (inventory) and their append-only ledger (stock_movements). */
@Injectable()
export class StockRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Locks (creating at 0 if needed) the stock line for update and returns its current quantity. */
  async lockLine(retailerId: string, productId: string, manager: EntityManager): Promise<number> {
    await manager.query(
      `insert into inventory (retailer_id, product_id, quantity, updated_by) values ($1, $2, 0, 'System')
       on conflict (retailer_id, product_id) do nothing`,
      [retailerId, productId],
    );
    const [row] = await manager.query(`select quantity from inventory where retailer_id = $1 and product_id = $2 for update`, [retailerId, productId]);
    return (row as { quantity: number }).quantity;
  }

  async setQuantity(retailerId: string, productId: string, quantity: number, updatedBy: string, manager: EntityManager): Promise<void> {
    await manager.query(`update inventory set quantity = $3, updated_at = now(), updated_by = $4 where retailer_id = $1 and product_id = $2`, [
      retailerId,
      productId,
      quantity,
      updatedBy,
    ]);
  }

  async insertMovement(row: MovementInsert, manager: EntityManager): Promise<void> {
    await manager.getRepository(StockMovementDao).insert(row);
  }

  async movements(filter: { retailerId?: string; productId?: string; page: number; pageSize: number }): Promise<Page<MovementRow>> {
    const where = `where ($1::text is null or m.retailer_id = $1) and ($2::text is null or m.product_id = $2)`;
    const params = [filter.retailerId ?? null, filter.productId ?? null];
    const [items, [{ total }]] = await Promise.all([
      this.dataSource.query(
        `select m.id::text as id, m.retailer_id as "retailerId", r.shop_name as "retailerName", m.product_id as "productId",
                p.name as "productName", p.model_code as "modelCode", m.delta, m.balance_after as "balanceAfter", m.reason,
                m.related_type as "relatedType", m.related_id as "relatedId", m.note, m.created_at as "createdAt", m.created_by as "createdBy"
           from stock_movements m join products p on p.id = m.product_id join retailers r on r.id = m.retailer_id
           ${where}
          order by m.created_at desc, m.id desc
          limit $3 offset $4`,
        [...params, filter.pageSize, (filter.page - 1) * filter.pageSize],
      ) as Promise<MovementRow[]>,
      this.dataSource.query(`select count(*)::int as total from stock_movements m ${where}`, params) as Promise<Array<{ total: number }>>,
    ]);
    return { items, total, page: filter.page, pageSize: filter.pageSize };
  }
}
