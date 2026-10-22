import { Injectable } from '@nestjs/common';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { ProductsService } from '../../products/services/products.service.js';
import { RetailersService } from '../../retailers/services/retailers.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import type { InventoryItemBo, InventoryQueryBo, InventorySummaryBo } from '../bo/inventory.bo.js';
import { InventoryMapper } from '../mappers/inventory.mapper.js';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { StockService } from './stock.service.js';

/** Retailer-reported stock. Not live warehouse inventory. */
@Injectable()
export class InventoryService {
  constructor(
    private readonly inventory: InventoryRepository,
    private readonly retailers: RetailersService,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
  ) {}

  async list(query: InventoryQueryBo): Promise<Page<InventoryItemBo>> {
    const { lowStockThreshold } = await this.settings.get();
    const page = await this.inventory.findPage(query, lowStockThreshold);
    return { ...page, items: page.items.map((i) => InventoryMapper.toBo(i, lowStockThreshold)) };
  }

  async summary(): Promise<InventorySummaryBo> {
    const { lowStockThreshold } = await this.settings.get();
    const s = await this.inventory.summary(lowStockThreshold);
    return { lines: s.lines, retailersReporting: s.retailers, lowStock: s.low, outOfStock: s.out, threshold: lowStockThreshold };
  }

  async get(id: string): Promise<InventoryItemBo> {
    const { lowStockThreshold } = await this.settings.get();
    const item = await this.inventory.findById(id);
    if (!item) throw AppException.notFound('Inventory record', id);
    return InventoryMapper.toBo(item, lowStockThreshold);
  }

  async update(actor: ActorBo, id: string, quantity: number, note?: string): Promise<InventoryItemBo> {
    const current = await this.get(id);
    await this.stock.setCount(actor, current.retailerId, current.productId, quantity, note ? `Admin count · ${note}` : 'Admin count');
    await this.audit.record(actor, {
      action: 'Inventory updated',
      entityType: 'Inventory',
      entityId: id,
      summary: `${current.modelCode} at ${current.retailerName}: ${current.quantity} → ${quantity} units${note ? ` · ${note}` : ''}`,
    });
    return this.get(id);
  }

  /** Retailer's own stock count for a product (optional; delivered orders and sales keep it current). */
  async report(retailerId: string, productId: string, quantity: number, note?: string): Promise<InventoryItemBo> {
    const retailer = await this.retailers.requireApprovedActive(retailerId);
    await this.products.getActive(productId);
    await this.stock.setCount({ id: retailerId, name: retailer.shopName }, retailerId, productId, quantity, note ?? 'Stock count from retailer app');
    const id = await this.inventory.idFor(retailerId, productId);
    return this.get(id!);
  }
}
