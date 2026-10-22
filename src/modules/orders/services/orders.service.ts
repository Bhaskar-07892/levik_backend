import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { OrderStatus } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { renderDocument } from '../../documents/pdf-documents.js';
import { StockService } from '../../inventory/services/stock.service.js';
import { ProductsService } from '../../products/services/products.service.js';
import { RetailersService } from '../../retailers/services/retailers.service.js';
import { NEXT_STATUSES, type OrderBo, type OrderQueryBo, type PlaceOrderBo } from '../bo/order.bo.js';
import { OrderMapper } from '../mappers/order.mapper.js';
import { OrdersRepository } from '../repositories/orders.repository.js';

const TIMESTAMP: Partial<Record<OrderStatus, 'confirmedAt' | 'dispatchedAt' | 'deliveredAt' | 'cancelledAt'>> = {
  Confirmed: 'confirmedAt',
  Dispatched: 'dispatchedAt',
  Delivered: 'deliveredAt',
  Cancelled: 'cancelledAt',
};

/**
 * Retailer stock orders to Levik: Placed → Confirmed → Dispatched → Delivered (or Cancelled before dispatch).
 * Delivery is the moment stock arrives: it adds every line to the retailer's stock and issues the purchase
 * invoice, in one transaction. Payment is out of scope for now.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly retailers: RetailersService,
    private readonly products: ProductsService,
    private readonly stock: StockService,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: OrderQueryBo): Promise<Page<OrderBo>> {
    const page = await this.orders.findPage(query);
    return { ...page, items: page.items.map(OrderMapper.toBo) };
  }

  statusCounts(retailerId?: string): Promise<Record<string, number>> {
    return this.orders.statusCounts(retailerId);
  }

  async get(id: string, ownerRetailerId?: string): Promise<OrderBo> {
    const order = await this.orders.findWithLines(id);
    if (!order || (ownerRetailerId && order.retailerId !== ownerRetailerId)) throw AppException.notFound('Order', id);
    return OrderMapper.toBo(order);
  }

  /** Prices are the catalogue list price (MRP) at the time of ordering. */
  async place(retailerId: string, input: PlaceOrderBo): Promise<OrderBo> {
    const retailer = await this.retailers.requireApprovedActive(retailerId);
    const quantities = new Map<string, number>();
    for (const line of input.lines) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
    const lines = await Promise.all(
      [...quantities].map(async ([productId, quantity]) => {
        const product = await this.products.getActive(productId);
        return { productId, quantity, unitPrice: product.mrp };
      }),
    );
    const actor = { id: retailerId, name: retailer.shopName };
    const id = await this.tx.run(async (manager) => {
      const totalValue = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      const orderId = await this.orders.insert({ retailerId, note: input.note?.trim() || null, totalValue }, lines, manager);
      await this.audit.recordEvent(actor, { entityType: 'order', entityId: orderId, action: 'Order placed from retailer app', note: `${lines.length} products` }, manager);
      await this.audit.record(actor, { action: 'Order placed', entityType: 'Order', entityId: orderId, summary: `${retailer.shopName} · ${lines.length} products` }, manager);
      return orderId;
    });
    return this.get(id);
  }

  /** Retailers can withdraw an order until Levik confirms it. */
  async cancelByRetailer(retailerId: string, id: string, reason: string): Promise<OrderBo> {
    const retailer = await this.retailers.get(retailerId);
    const order = await this.get(id, retailerId);
    if (order.status !== 'Placed') throw AppException.invalidState('Only orders that Levik has not confirmed yet can be cancelled from the app.');
    return this.transition({ id: retailerId, name: retailer.shopName }, id, 'Cancelled', reason);
  }

  async transition(actor: ActorBo, id: string, to: Exclude<OrderStatus, 'Placed'>, reason?: string): Promise<OrderBo> {
    await this.tx.run(async (manager) => {
      const order = await this.orders.findForUpdate(id, manager);
      if (!order) throw AppException.notFound('Order', id);
      if (!NEXT_STATUSES[order.status].includes(to)) {
        throw AppException.invalidState(`A ${order.status.toLowerCase()} order cannot be marked ${to.toLowerCase()}.`);
      }
      if (to === 'Cancelled' && !reason?.trim()) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'A reason is required to cancel an order.');

      const patch: Parameters<OrdersRepository['update']>[1] = { status: to, [TIMESTAMP[to]!]: new Date() };
      let note = reason?.trim();
      if (to === 'Cancelled') patch.cancelReason = note ?? null;
      if (to === 'Delivered') {
        const full = (await this.orders.findWithLines(id, manager))!;
        for (const line of full.lines ?? []) {
          await this.stock.move(manager, actor, {
            retailerId: order.retailerId,
            productId: line.productId,
            delta: line.quantity,
            reason: 'Order delivered',
            related: { type: 'order', id },
            productName: line.product?.name,
          });
        }
        patch.purchaseInvoiceNumber = await this.orders.nextInvoiceNumber(manager);
        note = `Stock added · purchase invoice ${patch.purchaseInvoiceNumber}`;
      }
      await this.orders.update(id, patch, manager);
      await this.audit.recordEvent(actor, { entityType: 'order', entityId: id, action: to, note }, manager);
      await this.audit.record(actor, { action: `Order ${to.toLowerCase()}`, entityType: 'Order', entityId: id, summary: note ?? `${order.retailerId} order ${to.toLowerCase()}` }, manager);
    });
    return this.get(id);
  }

  timeline(id: string) {
    return this.audit.timeline('order', id);
  }

  /** Levik → retailer purchase invoice for a delivered order. */
  async purchaseInvoicePdf(id: string): Promise<{ filename: string; stream: Readable }> {
    const order = await this.get(id);
    if (!order.purchaseInvoiceNumber || !order.deliveredAt) throw AppException.notFound('Purchase invoice', id);
    const retailer = await this.retailers.get(order.retailerId);
    const stream = renderDocument({
      heading: 'PURCHASE INVOICE',
      number: order.purchaseInvoiceNumber,
      date: order.deliveredAt,
      issuer: { title: 'From', name: 'Levik', lines: ['Levik Rewards Programme', 'Trade supply'] },
      recipient: {
        title: 'Bill to',
        name: retailer.shopName,
        lines: [
          retailer.ownerName,
          retailer.address,
          [retailer.city, retailer.state, retailer.pincode].filter(Boolean).join(', '),
          retailer.gstin ? `GSTIN ${retailer.gstin}` : 'GSTIN not registered',
          retailer.mobile,
        ],
      },
      meta: [
        ['Order', order.id],
        ['Placed', order.placedAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })],
      ],
      lines: order.lines.map((l) => ({ name: l.productName, detail: `Model ${l.modelCode}`, quantity: l.quantity, unitPrice: l.unitPrice })),
      footnote: 'Goods delivered against the order above and added to your Levik stock. Computer-generated document; no signature required.',
      poweredByLevik: false,
    });
    return { filename: `${order.purchaseInvoiceNumber.replace(/\//g, '-')}.pdf`, stream };
  }
}
