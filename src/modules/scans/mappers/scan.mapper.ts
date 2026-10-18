import { AuditMapper } from '../../audit/mappers/audit.mapper.js';
import { SchemeMapper } from '../../schemes/mappers/scheme.mapper.js';
import type { ScanBo, ScanReviewBo } from '../bo/scan.bo.js';
import type { ScanDao } from '../dao/scan.dao.js';
import type { AppScanResponseDto, ScanResponseDto, ScanReviewResponseDto } from '../dto/scan.response.dto.js';

export const ScanMapper = {
  toBo: (d: ScanDao): ScanBo => {
    const product = d.product!;
    const plumber = d.plumber!;
    return {
      id: d.id,
      plumber: {
        id: plumber.id,
        name: plumber.name,
        mobile: plumber.mobile,
        city: plumber.city,
        verificationStatus: plumber.verificationStatus,
        accountStatus: plumber.accountStatus,
      },
      product: {
        id: product.id,
        name: product.name,
        modelCode: product.modelCode,
        category: product.category,
        imageUrl: product.imageUrl,
        dimensions: product.dimensions,
        plumberPoints: product.plumberPoints,
        rewardEligible: product.rewardEligible,
        isActive: product.isActive,
      },
      retailer: d.retailer ? { id: d.retailer.id, shopName: d.retailer.shopName, verificationStatus: d.retailer.verificationStatus } : null,
      submittedCode: d.submittedCode,
      productUnitSerial: d.productUnitSerial,
      labelVerified: d.labelVerified,
      scannedAt: d.scannedAt,
      invoiceNumber: d.invoiceNumber,
      siteLocation: d.siteLocation,
      photoKey: d.photoKey,
      status: d.status,
      expectedPoints: d.awardedPoints ?? (product.rewardEligible ? product.plumberPoints : 0),
      awardedPoints: d.awardedPoints,
      ledgerTxnId: d.ledgerTxnId,
      rejectionReason: d.rejectionReason,
      flagReason: d.flagReason,
      reviewedBy: d.reviewedBy,
      reviewedAt: d.reviewedAt,
    };
  },
  toDto: (b: ScanBo): ScanResponseDto => ({
    ...b,
    product: { ...b.product, imageUrl: b.product.imageUrl ?? undefined, dimensions: b.product.dimensions ?? undefined },
    retailer: b.retailer ?? undefined,
    productUnitSerial: b.productUnitSerial ?? undefined,
    scannedAt: b.scannedAt.toISOString(),
    invoiceNumber: b.invoiceNumber ?? undefined,
    photoKey: b.photoKey ?? undefined,
    awardedPoints: b.awardedPoints ?? undefined,
    ledgerTxnId: b.ledgerTxnId ?? undefined,
    rejectionReason: b.rejectionReason ?? undefined,
    flagReason: b.flagReason ?? undefined,
    reviewedBy: b.reviewedBy ?? undefined,
    reviewedAt: b.reviewedAt?.toISOString(),
  }),
  /** Plumber's own view: no reviewer identity or internal flags. */
  toAppDto: (b: ScanBo): AppScanResponseDto => ({
    id: b.id,
    productId: b.product.id,
    productName: b.product.name,
    modelCode: b.product.modelCode,
    imageUrl: b.product.imageUrl ?? undefined,
    serial: b.submittedCode,
    scannedAt: b.scannedAt.toISOString(),
    retailerName: b.retailer?.shopName,
    siteLocation: b.siteLocation,
    status: b.status === 'Flagged' ? 'Pending' : b.status,
    points: b.expectedPoints,
    rejectionReason: b.rejectionReason ?? undefined,
  }),
  reviewToDto: (b: ScanReviewBo): ScanReviewResponseDto => ({
    scan: ScanMapper.toDto(b.scan),
    plumberPoints: b.plumberPoints,
    linkedInvoice: b.linkedInvoice ?? undefined,
    checks: b.checks,
    pointsCalculation: b.pointsCalculation,
    schemeImpacts: b.schemeImpacts.map(SchemeMapper.impactToDto),
    timeline: b.timeline.map(AuditMapper.eventToDto),
  }),
};
