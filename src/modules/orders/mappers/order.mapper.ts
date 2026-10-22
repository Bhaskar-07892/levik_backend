import { documentUrl, imageLink } from '../../uploads/file-url.js';
import { NEXT_STATUSES, type OrderBo } from '../bo/order.bo.js';
import type { OrderDao } from '../dao/order.dao.js';
import type { OrderResponseDto } from '../dto/order.response.dto.js';

export const OrderMapper = {
  toBo: (d: OrderDao): OrderBo => {
    const lines = (d.lines ?? []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name ?? l.productId,
      modelCode: l.product?.modelCode ?? '',
      imageUrl: l.product?.imageUrl ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      value: l.quantity * l.unitPrice,
    }));
    return {
      id: d.id,
      retailerId: d.retailerId,
      retailerName: d.retailer?.shopName ?? d.retailerId,
      retailerCity: d.retailer?.city ?? '',
      status: d.status,
      note: d.note,
      totalValue: d.totalValue,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      placedAt: d.placedAt,
      confirmedAt: d.confirmedAt,
      dispatchedAt: d.dispatchedAt,
      deliveredAt: d.deliveredAt,
      cancelledAt: d.cancelledAt,
      cancelReason: d.cancelReason,
      purchaseInvoiceNumber: d.purchaseInvoiceNumber,
      lines,
    };
  },
  toDto: (b: OrderBo): OrderResponseDto => ({
    ...b,
    note: b.note ?? undefined,
    cancelReason: b.cancelReason ?? undefined,
    purchaseInvoiceNumber: b.purchaseInvoiceNumber ?? undefined,
    purchaseInvoiceUrl: b.purchaseInvoiceNumber ? documentUrl('purchase-invoices', b.id) : undefined,
    placedAt: b.placedAt.toISOString(),
    confirmedAt: b.confirmedAt?.toISOString(),
    dispatchedAt: b.dispatchedAt?.toISOString(),
    deliveredAt: b.deliveredAt?.toISOString(),
    cancelledAt: b.cancelledAt?.toISOString(),
    nextStatuses: NEXT_STATUSES[b.status],
    lines: b.lines.map((l) => ({ ...l, imageUrl: imageLink(l.imageUrl) })),
  }),
};
