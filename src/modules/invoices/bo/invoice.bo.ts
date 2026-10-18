import type { CheckBo } from '../../../common/bo/check.bo.js';
import type { InvoiceStatus, ProductCategory } from '../../../common/domain/enums.js';
import type { StatusEventBo } from '../../audit/bo/audit.bo.js';
import type { AwardedSchemeBo, SchemeImpactBo } from '../../schemes/bo/scheme.bo.js';

export interface InvoiceLineBo {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: ProductCategory | null;
  quantity: number;
  unitPrice: number;
  value: number;
}

export interface InvoiceBo {
  id: string;
  invoiceNumber: string;
  retailerId: string;
  retailerName: string;
  retailerCity: string;
  buyerName: string;
  invoiceDate: Date;
  submittedAt: Date;
  documentKey: string | null;
  status: InvoiceStatus;
  reviewer: string | null;
  reviewedAt: Date | null;
  incentivePoints: number | null;
  ledgerTxnId: string | null;
  rejectionReason: string | null;
  infoRequest: string | null;
  /** Pre-GST subtotal. */
  amount: number;
}

export interface InvoiceWithLinesBo extends InvoiceBo {
  lines: InvoiceLineBo[];
}

export interface IncentiveLineBo {
  lineId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  value: number;
  eligible: boolean;
  reason: 'Unknown product' | 'Not reward-eligible' | 'Product inactive' | null;
  points: number;
}

export interface InvoiceIncentiveBo {
  rate: number;
  lines: IncentiveLineBo[];
  eligibleValue: number;
  points: number;
}

export interface InvoiceTotalsBo {
  subtotal: number;
  gst: number;
  total: number;
}

export interface InvoiceReviewBo {
  invoice: InvoiceWithLinesBo;
  totals: InvoiceTotalsBo;
  incentive: InvoiceIncentiveBo;
  checks: CheckBo[];
  schemeImpacts: SchemeImpactBo[];
  timeline: StatusEventBo[];
}

export interface InvoiceQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  status?: InvoiceStatus;
  retailerId?: string;
  from?: Date;
  to?: Date;
}

export interface SubmitInvoiceBo {
  invoiceNumber: string;
  invoiceDate: Date;
  buyerName: string;
  documentKey: string | null;
  lines: Array<{ productId: string; quantity: number; unitPrice?: number }>;
}

export interface InvoiceApprovalBo {
  points: number;
  ledgerTxnId: string | null;
  schemeAwards: AwardedSchemeBo[];
}

/** Minimal view used by scan verification. */
export interface LinkedInvoiceBo {
  id: string;
  status: InvoiceStatus;
  productIds: string[];
}
