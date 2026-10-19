import { ApiProperty } from '@nestjs/swagger';
import { INVOICE_STATUSES, PRODUCT_CATEGORIES, type InvoiceStatus, type ProductCategory } from '../../../common/domain/enums.js';
import { CheckResponseDto } from '../../../common/dto/check.response.dto.js';
import { StatusEventResponseDto } from '../../audit/dto/audit.response.dto.js';
import { SchemeImpactResponseDto } from '../../schemes/dto/scheme.response.dto.js';

export class InvoiceListItemResponseDto {
  id: string;
  invoiceNumber: string;
  retailerId: string;
  retailerName: string;
  retailerCity: string;
  buyerName: string;
  invoiceDate: string;
  submittedAt: string;
  documentKey?: string;
  /** Signed link to the invoice document, relative to the API origin. */
  documentUrl?: string;
  @ApiProperty({ enum: INVOICE_STATUSES })
  status: InvoiceStatus;
  reviewer?: string;
  reviewedAt?: string;
  incentivePoints?: number;
  ledgerTxnId?: string;
  rejectionReason?: string;
  infoRequest?: string;
  /** Pre-GST subtotal (₹). */
  amount: number;
}

export class InvoicePageResponseDto {
  items: InvoiceListItemResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class InvoiceLineResponseDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  @ApiProperty({ enum: PRODUCT_CATEGORIES, required: false })
  category?: ProductCategory;
  quantity: number;
  unitPrice: number;
  value: number;
}

export class InvoiceDetailResponseDto extends InvoiceListItemResponseDto {
  lines: InvoiceLineResponseDto[];
}

export class InvoiceTotalsDto {
  subtotal: number;
  /** GST at 18%, for display only. */
  gst: number;
  total: number;
}

export class IncentiveLineResponseDto {
  lineId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  value: number;
  eligible: boolean;
  reason?: string;
  points: number;
}

export class InvoiceIncentiveResponseDto {
  /** Points per ₹100 of eligible pre-GST value. */
  rate: number;
  lines: IncentiveLineResponseDto[];
  eligibleValue: number;
  points: number;
}

/** Everything the review screen needs in one call. */
export class InvoiceReviewResponseDto {
  invoice: InvoiceDetailResponseDto;
  totals: InvoiceTotalsDto;
  incentive: InvoiceIncentiveResponseDto;
  checks: CheckResponseDto[];
  schemeImpacts: SchemeImpactResponseDto[];
  timeline: StatusEventResponseDto[];
}
