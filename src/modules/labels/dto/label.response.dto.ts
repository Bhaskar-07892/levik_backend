import { ApiProperty } from '@nestjs/swagger';
import { PRODUCT_UNIT_STATUSES, type ProductUnitStatus } from '../../../common/domain/enums.js';

export class LabelBatchResponseDto {
  id: string;
  productId: string;
  productName: string;
  modelCode: string;
  quantity: number;
  claimed: number;
  voided: number;
  available: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export class LabelBatchPageResponseDto {
  items: LabelBatchResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class ProductUnitResponseDto {
  serial: string;
  productId: string;
  productName: string;
  modelCode: string;
  batchId: string;
  @ApiProperty({ enum: PRODUCT_UNIT_STATUSES })
  status: ProductUnitStatus;
  claimedScanId?: string;
  claimedAt?: string;
  voidReason?: string;
  createdAt: string;
  /** Exact text encoded in the QR code. */
  qrPayload: string;
}

/** What the plumber app shows after scanning, before submitting. */
export class ResolvedLabelResponseDto {
  serial: string;
  /** False when the QR signature does not match (counterfeit). Null for typed serials. */
  signatureValid: boolean | null;
  @ApiProperty({ enum: [...PRODUCT_UNIT_STATUSES, 'Unknown'] })
  status: ProductUnitStatus | 'Unknown';
  productId?: string;
  productName?: string;
  modelCode?: string;
  imageUrl?: string;
  scanPoints?: number;
}

/** Public authenticity check (customer scans the label with a phone camera). */
export class LabelVerificationResponseDto {
  genuine: boolean;
  @ApiProperty({ enum: [...PRODUCT_UNIT_STATUSES, 'Unknown'] })
  status: ProductUnitStatus | 'Unknown';
  productName?: string;
  modelCode?: string;
}
