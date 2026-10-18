import type { CheckBo } from '../../../common/bo/check.bo.js';
import type { AccountStatus, PlumberVerificationStatus, ProductCategory, ScanStatus } from '../../../common/domain/enums.js';
import type { StatusEventBo } from '../../audit/bo/audit.bo.js';
import type { LinkedInvoiceBo } from '../../invoices/bo/invoice.bo.js';
import type { PointsBalanceBo } from '../../points/bo/points.bo.js';
import type { AwardedSchemeBo, SchemeImpactBo } from '../../schemes/bo/scheme.bo.js';

export interface ScanBo {
  id: string;
  plumber: {
    id: string;
    name: string;
    mobile: string;
    city: string;
    verificationStatus: PlumberVerificationStatus;
    accountStatus: AccountStatus;
  };
  product: {
    id: string;
    name: string;
    modelCode: string;
    category: ProductCategory;
    imageUrl: string | null;
    dimensions: string | null;
    plumberPoints: number;
    rewardEligible: boolean;
    isActive: boolean;
  };
  retailer: { id: string; shopName: string; verificationStatus: string } | null;
  submittedCode: string;
  productUnitSerial: string | null;
  labelVerified: boolean;
  scannedAt: Date;
  invoiceNumber: string | null;
  siteLocation: string;
  photoKey: string | null;
  status: ScanStatus;
  /** Points that approval would credit (or did credit). */
  expectedPoints: number;
  awardedPoints: number | null;
  ledgerTxnId: string | null;
  rejectionReason: string | null;
  flagReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

export interface ScanReviewBo {
  scan: ScanBo;
  plumberPoints: PointsBalanceBo;
  linkedInvoice: LinkedInvoiceBo | null;
  checks: CheckBo[];
  pointsCalculation: { basePoints: number; rewardEligible: boolean; pointsOnApproval: number; schemeBonusUnlocked: number };
  schemeImpacts: SchemeImpactBo[];
  timeline: StatusEventBo[];
}

export interface ScanQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  status?: ScanStatus;
  plumberId?: string;
  productId?: string;
  /** A retailer ID, or "none" for scans without proof of sale. */
  retailerId?: string;
  from?: Date;
  to?: Date;
}

export interface SubmitScanBo {
  code: string;
  retailerId: string | null;
  invoiceNumber: string | null;
  siteLocation: string;
  photoKey: string | null;
}

export interface ScanApprovalBo {
  points: number;
  ledgerTxnId: string | null;
  schemeAwards: AwardedSchemeBo[];
}
