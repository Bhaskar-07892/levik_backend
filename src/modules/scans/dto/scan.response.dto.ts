import { ApiProperty } from '@nestjs/swagger';
import { PRODUCT_CATEGORIES, SCAN_STATUSES, type ProductCategory, type ScanStatus } from '../../../common/domain/enums.js';
import { CheckResponseDto } from '../../../common/dto/check.response.dto.js';
import { StatusEventResponseDto } from '../../audit/dto/audit.response.dto.js';
import { PointsBalanceResponseDto } from '../../points/dto/points.response.dto.js';
import { SchemeImpactResponseDto } from '../../schemes/dto/scheme.response.dto.js';

export class ScanPlumberDto {
  id: string;
  name: string;
  mobile: string;
  city: string;
  verificationStatus: string;
  accountStatus: string;
}

export class ScanProductDto {
  id: string;
  name: string;
  modelCode: string;
  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  category: ProductCategory;
  imageUrl?: string;
  dimensions?: string;
  plumberPoints: number;
  rewardEligible: boolean;
  isActive: boolean;
}

export class ScanRetailerDto {
  id: string;
  shopName: string;
  verificationStatus: string;
}

export class ScanResponseDto {
  id: string;
  plumber: ScanPlumberDto;
  product: ScanProductDto;
  retailer?: ScanRetailerDto;
  submittedCode: string;
  productUnitSerial?: string;
  /** True when the QR signature was verified (camera scan). */
  labelVerified: boolean;
  scannedAt: string;
  invoiceNumber?: string;
  siteLocation: string;
  photoKey?: string;
  /** Signed link to the installation photo, relative to the API origin. */
  photoUrl?: string;
  @ApiProperty({ enum: SCAN_STATUSES })
  status: ScanStatus;
  expectedPoints: number;
  awardedPoints?: number;
  ledgerTxnId?: string;
  rejectionReason?: string;
  flagReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export class ScanPageResponseDto {
  items: ScanResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class LinkedInvoiceDto {
  id: string;
  status: string;
  productIds: string[];
}

export class PointsCalculationDto {
  basePoints: number;
  rewardEligible: boolean;
  pointsOnApproval: number;
  schemeBonusUnlocked: number;
}

/** Everything the scan verification screen needs in one call. */
export class ScanReviewResponseDto {
  scan: ScanResponseDto;
  plumberPoints: PointsBalanceResponseDto;
  linkedInvoice?: LinkedInvoiceDto;
  checks: CheckResponseDto[];
  pointsCalculation: PointsCalculationDto;
  schemeImpacts: SchemeImpactResponseDto[];
  timeline: StatusEventResponseDto[];
}

export class AppScanResponseDto {
  id: string;
  productId: string;
  productName: string;
  modelCode: string;
  imageUrl?: string;
  serial: string;
  scannedAt: string;
  retailerName?: string;
  siteLocation: string;
  /** Flagged scans are shown to plumbers as Pending. */
  @ApiProperty({ enum: ['Pending', 'Approved', 'Rejected'] })
  status: ScanStatus;
  points: number;
  rejectionReason?: string;
}

export class AppScanPageResponseDto {
  items: AppScanResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
