import type { ProductUnitStatus } from '../../../common/domain/enums.js';

export interface LabelBatchBo {
  id: string;
  productId: string;
  productName: string;
  modelCode: string;
  quantity: number;
  claimed: number;
  voided: number;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface ProductUnitBo {
  serial: string;
  productId: string;
  productName: string;
  modelCode: string;
  batchId: string;
  status: ProductUnitStatus;
  claimedScanId: string | null;
  claimedAt: Date | null;
  voidReason: string | null;
  createdAt: Date;
  qrPayload: string;
}

/** Result of resolving a scanned/typed code. */
export interface ResolvedLabelBo {
  serial: string;
  /** null when the code was typed (no signature to check). */
  signatureValid: boolean | null;
  unit: ProductUnitBo | null;
}

export interface BatchQueryBo {
  page: number;
  pageSize: number;
  productId?: string;
}
