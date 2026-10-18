import type { LabelBatchBo, ProductUnitBo } from '../bo/label.bo.js';
import type { ProductUnitDao } from '../dao/product-unit.dao.js';
import type { LabelBatchResponseDto, ProductUnitResponseDto } from '../dto/label.response.dto.js';
import type { BatchRow } from '../repositories/labels.repository.js';

export const LabelMapper = {
  batchToBo: (r: BatchRow): LabelBatchBo => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    modelCode: r.model_code,
    quantity: r.quantity,
    claimed: r.claimed,
    voided: r.voided,
    note: r.note,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
  }),
  unitToBo: (d: ProductUnitDao, qrPayload: string): ProductUnitBo => ({
    serial: d.serial,
    productId: d.productId,
    productName: d.product?.name ?? d.productId,
    modelCode: d.product?.modelCode ?? '',
    batchId: d.batchId,
    status: d.status,
    claimedScanId: d.claimedScanId,
    claimedAt: d.claimedAt,
    voidReason: d.voidReason,
    createdAt: d.createdAt,
    qrPayload,
  }),
  batchToDto: (b: LabelBatchBo): LabelBatchResponseDto => ({
    ...b,
    available: b.quantity - b.claimed - b.voided,
    note: b.note ?? undefined,
    createdAt: b.createdAt.toISOString(),
  }),
  unitToDto: (b: ProductUnitBo): ProductUnitResponseDto => ({
    ...b,
    claimedScanId: b.claimedScanId ?? undefined,
    claimedAt: b.claimedAt?.toISOString(),
    voidReason: b.voidReason ?? undefined,
    createdAt: b.createdAt.toISOString(),
  }),
};
