import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { StockReason } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { StockRepository, type MovementRow } from '../repositories/stock.repository.js';

export interface StockChangeBo {
  retailerId: string;
  productId: string;
  /** Units added (+) or removed (−). */
  delta: number;
  reason: StockReason;
  related?: { type: 'order' | 'scan' | 'bill'; id: string };
  note?: string;
  /** Shown in the "not enough stock" message. */
  productName?: string;
}

/**
 * The only way retailer stock changes. Each change locks the stock line, refuses to go below zero, updates
 * the balance and appends a stock_movements row, so every figure can be traced back to an order, sale,
 * bill or manual adjustment.
 */
@Injectable()
export class StockService {
  constructor(
    private readonly stock: StockRepository,
    private readonly tx: TransactionService,
  ) {}

  /** Applies one change inside the caller's transaction and returns the new balance. */
  async move(manager: EntityManager, actor: ActorBo, change: StockChangeBo): Promise<number> {
    if (!Number.isInteger(change.delta) || change.delta === 0) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Stock change must be a whole, non-zero number.');
    const current = await this.stock.lockLine(change.retailerId, change.productId, manager);
    const balance = current + change.delta;
    if (balance < 0) {
      throw AppException.rule(
        ErrorCode.OUT_OF_STOCK,
        `Not enough stock of ${change.productName ?? change.productId}: ${current} in stock, ${-change.delta} needed. Update your stock or wait for your order to be delivered.`,
        { productId: change.productId, inStock: current, needed: -change.delta },
      );
    }
    await this.stock.setQuantity(change.retailerId, change.productId, balance, actor.name, manager);
    await this.stock.insertMovement(
      {
        retailerId: change.retailerId,
        productId: change.productId,
        delta: change.delta,
        balanceAfter: balance,
        reason: change.reason,
        relatedType: change.related?.type ?? null,
        relatedId: change.related?.id ?? null,
        note: change.note?.trim() || null,
        createdBy: actor.name,
      },
      manager,
    );
    return balance;
  }

  /** Manual count: sets the balance to `quantity`, recording the difference as an adjustment. */
  setCount(actor: ActorBo, retailerId: string, productId: string, quantity: number, note?: string): Promise<{ before: number; after: number }> {
    return this.tx.run(async (manager) => {
      const before = await this.stock.lockLine(retailerId, productId, manager);
      if (quantity !== before) {
        await this.move(manager, actor, { retailerId, productId, delta: quantity - before, reason: 'Manual adjustment', note: note ?? 'Stock count updated' });
      }
      return { before, after: quantity };
    });
  }

  movements(filter: { retailerId?: string; productId?: string; page: number; pageSize: number }): Promise<Page<MovementRow>> {
    return this.stock.movements(filter);
  }
}
