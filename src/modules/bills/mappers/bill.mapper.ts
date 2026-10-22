import { documentUrl } from '../../uploads/file-url.js';
import type { BillBo } from '../bo/bill.bo.js';
import type { CustomerBillDao } from '../dao/customer-bill.dao.js';
import type { BillResponseDto } from '../dto/bill.dto.js';

export const BillMapper = {
  toBo: (d: CustomerBillDao): BillBo => ({
    id: d.id,
    retailerId: d.retailerId,
    retailerName: d.retailer?.shopName ?? d.retailerId,
    billNumber: d.billNumber,
    customerName: d.customerName,
    customerMobile: d.customerMobile,
    scanId: d.scanId,
    totalValue: d.totalValue,
    createdAt: d.createdAt,
    createdBy: d.createdBy,
    lines: (d.lines ?? []).map((l) => ({
      productId: l.productId,
      productName: l.product?.name ?? l.productId,
      modelCode: l.product?.modelCode ?? '',
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      value: l.quantity * l.unitPrice,
    })),
  }),
  toDto: (b: BillBo): BillResponseDto => ({
    ...b,
    customerMobile: b.customerMobile ?? undefined,
    scanId: b.scanId ?? undefined,
    createdAt: b.createdAt.toISOString(),
    pdfUrl: documentUrl('bills', b.id),
  }),
};
