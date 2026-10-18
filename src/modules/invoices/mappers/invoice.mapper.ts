import type { CheckBo } from '../../../common/bo/check.bo.js';
import { AuditMapper } from '../../audit/mappers/audit.mapper.js';
import { SchemeMapper } from '../../schemes/mappers/scheme.mapper.js';
import type { InvoiceBo, InvoiceLineBo, InvoiceReviewBo, InvoiceWithLinesBo } from '../bo/invoice.bo.js';
import type { InvoiceDao } from '../dao/invoice.dao.js';
import type { InvoiceDetailResponseDto, InvoiceListItemResponseDto, InvoiceReviewResponseDto } from '../dto/invoice.response.dto.js';

export const InvoiceMapper = {
  toBo: (d: InvoiceDao, amount: number): InvoiceBo => ({
    id: d.id,
    invoiceNumber: d.invoiceNumber,
    retailerId: d.retailerId,
    retailerName: d.retailer?.shopName ?? d.retailerId,
    retailerCity: d.retailer?.city ?? '',
    buyerName: d.buyerName,
    invoiceDate: d.invoiceDate,
    submittedAt: d.submittedAt,
    documentKey: d.documentKey,
    status: d.status,
    reviewer: d.reviewer,
    reviewedAt: d.reviewedAt,
    incentivePoints: d.incentivePoints,
    ledgerTxnId: d.ledgerTxnId,
    rejectionReason: d.rejectionReason,
    infoRequest: d.infoRequest,
    amount,
  }),
  withLinesToBo: (d: InvoiceDao): InvoiceWithLinesBo => {
    const lines: InvoiceLineBo[] = (d.lines ?? []).map((l) => ({
      id: l.id,
      productId: l.productId,
      productName: l.product?.name ?? l.productId,
      sku: l.product?.sku ?? '',
      category: l.product?.category ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      value: l.quantity * l.unitPrice,
    }));
    return { ...InvoiceMapper.toBo(d, lines.reduce((s, l) => s + l.value, 0)), lines };
  },
  toListDto: (b: InvoiceBo): InvoiceListItemResponseDto => ({
    ...b,
    invoiceDate: b.invoiceDate.toISOString(),
    submittedAt: b.submittedAt.toISOString(),
    reviewedAt: b.reviewedAt?.toISOString(),
    documentKey: b.documentKey ?? undefined,
    reviewer: b.reviewer ?? undefined,
    incentivePoints: b.incentivePoints ?? undefined,
    ledgerTxnId: b.ledgerTxnId ?? undefined,
    rejectionReason: b.rejectionReason ?? undefined,
    infoRequest: b.infoRequest ?? undefined,
  }),
  toDetailDto: (b: InvoiceWithLinesBo): InvoiceDetailResponseDto => ({ ...InvoiceMapper.toListDto(b), lines: b.lines.map((l) => ({ ...l, category: l.category ?? undefined })) }),
  checkToDto: (c: CheckBo) => ({ ...c }),
  reviewToDto: (b: InvoiceReviewBo): InvoiceReviewResponseDto => ({
    invoice: InvoiceMapper.toDetailDto(b.invoice),
    totals: b.totals,
    incentive: { ...b.incentive, lines: b.incentive.lines.map((l) => ({ ...l, reason: l.reason ?? undefined })) },
    checks: b.checks.map(InvoiceMapper.checkToDto),
    schemeImpacts: b.schemeImpacts.map(SchemeMapper.impactToDto),
    timeline: b.timeline.map(AuditMapper.eventToDto),
  }),
};
