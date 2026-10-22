import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { normalizeIndianMobile } from '../../../common/utils/mobile.util.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { renderDocument } from '../../documents/pdf-documents.js';
import { StockService } from '../../inventory/services/stock.service.js';
import { ProductsService } from '../../products/services/products.service.js';
import { RetailersService } from '../../retailers/services/retailers.service.js';
import type { BillBo, CreateBillBo } from '../bo/bill.bo.js';
import { BillMapper } from '../mappers/bill.mapper.js';
import { BillsRepository } from '../repositories/bills.repository.js';

/**
 * Bills a retailer's store issues to its buyer (a plumber or a walk-in customer), as a PDF with the store's
 * details and a small Levik mark. A walk-in bill takes its items out of stock; a bill raised while confirming
 * a plumber sale does not, because confirming the sale already did.
 */
@Injectable()
export class BillsService {
  constructor(
    private readonly bills: BillsRepository,
    private readonly retailers: RetailersService,
    private readonly products: ProductsService,
    private readonly stock: StockService,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: { retailerId?: string; search?: string; page: number; pageSize: number }): Promise<Page<BillBo>> {
    const page = await this.bills.findPage(query);
    return { ...page, items: page.items.map(BillMapper.toBo) };
  }

  async get(id: string, ownerRetailerId?: string, manager?: EntityManager): Promise<BillBo> {
    const bill = await this.bills.findWithLines(id, manager);
    if (!bill || (ownerRetailerId && bill.retailerId !== ownerRetailerId)) throw AppException.notFound('Bill', id);
    return BillMapper.toBo(bill);
  }

  /** Walk-in sale: bill + stock out, in one transaction. */
  async createWalkIn(retailerId: string, input: CreateBillBo): Promise<BillBo> {
    const retailer = await this.retailers.requireApprovedActive(retailerId);
    const id = await this.tx.run((manager) => this.createIn(manager, { id: retailerId, name: retailer.shopName }, retailerId, input, { deductStock: true }));
    return this.get(id);
  }

  /** Inside the caller's transaction (sale confirmation passes `scanId` and leaves stock alone). */
  async createIn(manager: EntityManager, actor: ActorBo, retailerId: string, input: CreateBillBo, options: { deductStock: boolean; scanId?: string }): Promise<string> {
    let customerMobile: string | null = null;
    if (input.customerMobile) {
      const mobile = normalizeIndianMobile(input.customerMobile);
      if (!mobile) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Enter a valid Indian mobile number for the customer.');
      customerMobile = mobile.display;
    }
    const merged = new Map<string, { quantity: number; unitPrice?: number }>();
    for (const line of input.lines) {
      const seen = merged.get(line.productId);
      merged.set(line.productId, { quantity: (seen?.quantity ?? 0) + line.quantity, unitPrice: line.unitPrice ?? seen?.unitPrice });
    }
    const lines = await Promise.all(
      [...merged].map(async ([productId, line]) => {
        const product = await this.products.get(productId);
        return { productId, productName: product.name, quantity: line.quantity, unitPrice: line.unitPrice ?? product.mrp };
      }),
    );

    await this.tx.lock(manager, `bill-number:${retailerId}`);
    const billNumber = await this.bills.nextNumber(retailerId, manager);
    const totalValue = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const id = await this.bills.insert(
      { retailerId, billNumber, customerName: input.customerName.trim(), customerMobile, scanId: options.scanId ?? null, totalValue, createdBy: actor.name },
      lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
      manager,
    );
    if (options.deductStock) {
      for (const line of lines) {
        await this.stock.move(manager, actor, {
          retailerId,
          productId: line.productId,
          delta: -line.quantity,
          reason: 'Customer bill',
          related: { type: 'bill', id },
          note: `${billNumber} · ${input.customerName.trim()}`,
          productName: line.productName,
        });
      }
    }
    await this.audit.recordEvent(actor, { entityType: 'bill', entityId: id, action: 'Bill issued', note: `${billNumber} to ${input.customerName.trim()}` }, manager);
    return id;
  }

  async pdf(id: string): Promise<{ filename: string; stream: Readable }> {
    const bill = await this.get(id);
    const store = await this.retailers.get(bill.retailerId);
    const stream = renderDocument({
      heading: 'BILL',
      number: bill.billNumber,
      date: bill.createdAt,
      issuer: {
        title: 'Sold by',
        name: store.shopName,
        lines: [
          store.address,
          [store.city, store.state, store.pincode].filter(Boolean).join(', '),
          store.gstin ? `GSTIN ${store.gstin}` : '',
          `Phone ${store.mobile}`,
        ].filter(Boolean),
      },
      recipient: { title: 'Billed to', name: bill.customerName, lines: bill.customerMobile ? [bill.customerMobile] : [] },
      meta: bill.scanId ? [['Levik scan', bill.scanId]] : [],
      lines: bill.lines.map((l) => ({ name: l.productName, detail: `Levik model ${l.modelCode}`, quantity: l.quantity, unitPrice: l.unitPrice })),
      footnote: `Thank you for buying genuine Levik products from ${store.shopName}. Computer-generated bill.`,
      poweredByLevik: true,
    });
    return { filename: `${store.shopName.replace(/[^\w]+/g, '-')}-${bill.billNumber}.pdf`, stream };
  }
}
