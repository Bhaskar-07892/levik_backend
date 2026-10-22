import type { StockStatus } from '../../../common/domain/enums.js';
import type { InventoryItemBo } from '../bo/inventory.bo.js';
import type { InventoryItemDao } from '../dao/inventory-item.dao.js';
import type { InventoryItemResponseDto, StockMovementResponseDto } from '../dto/inventory.dto.js';
import type { MovementRow } from '../repositories/stock.repository.js';

export const InventoryMapper = {
  stockStatus: (quantity: number, threshold: number): StockStatus => (quantity <= 0 ? 'Out of Stock' : quantity <= threshold ? 'Low Stock' : 'In Stock'),
  toBo: (d: InventoryItemDao, threshold: number): InventoryItemBo => ({
    id: d.id,
    retailerId: d.retailerId,
    retailerName: d.retailer?.shopName ?? d.retailerId,
    productId: d.productId,
    productName: d.product?.name ?? d.productId,
    modelCode: d.product?.modelCode ?? '',
    category: d.product!.category,
    quantity: d.quantity,
    stockStatus: InventoryMapper.stockStatus(d.quantity, threshold),
    updatedAt: d.updatedAt,
    updatedBy: d.updatedBy,
  }),
  toDto: (b: InventoryItemBo): InventoryItemResponseDto => ({ ...b, updatedAt: b.updatedAt.toISOString() }),
  movementToDto: (m: MovementRow): StockMovementResponseDto => ({
    ...m,
    relatedType: m.relatedType ?? undefined,
    relatedId: m.relatedId ?? undefined,
    note: m.note ?? undefined,
    createdAt: new Date(m.createdAt).toISOString(),
  }),
};
