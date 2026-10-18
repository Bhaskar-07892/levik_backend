import { AuditMapper } from '../../audit/mappers/audit.mapper.js';
import { PointsMapper } from '../../points/mappers/points.mapper.js';
import type { RedemptionBo, RedemptionReviewBo } from '../bo/redemption.bo.js';
import type { RedemptionDao } from '../dao/redemption.dao.js';
import type { AppRedemptionResponseDto, RedemptionResponseDto, RedemptionReviewResponseDto } from '../dto/redemption.response.dto.js';

export const RedemptionMapper = {
  toBo: (d: RedemptionDao, userName?: string): RedemptionBo => ({
    id: d.id,
    userId: d.userId,
    userRole: d.userRole,
    userName: userName ?? d.userId,
    reward: {
      id: d.reward!.id,
      name: d.reward!.name,
      category: d.reward!.category,
      type: d.reward!.type,
      stock: d.reward!.stock,
      isActive: d.reward!.isActive,
    },
    pointsCost: d.pointsCost,
    requestedAt: d.requestedAt,
    status: d.status,
    deliveryAddress: d.deliveryAddress,
    debitTxnId: d.debitTxnId,
    reversalTxnId: d.reversalTxnId,
    fulfilmentRef: d.fulfilmentRef,
    voucherCode: d.voucherCode,
    courierName: d.courierName,
    trackingNumber: d.trackingNumber,
    cancelReason: d.cancelReason,
  }),
  toDto: (b: RedemptionBo): RedemptionResponseDto => ({
    ...b,
    requestedAt: b.requestedAt.toISOString(),
    pointsDeducted: !!b.debitTxnId && !b.reversalTxnId,
    debitTxnId: b.debitTxnId ?? undefined,
    reversalTxnId: b.reversalTxnId ?? undefined,
    fulfilmentRef: b.fulfilmentRef ?? undefined,
    voucherCode: b.voucherCode ?? undefined,
    courierName: b.courierName ?? undefined,
    trackingNumber: b.trackingNumber ?? undefined,
    cancelReason: b.cancelReason ?? undefined,
  }),
  toAppDto: (b: RedemptionBo): AppRedemptionResponseDto => ({
    id: b.id,
    rewardId: b.reward.id,
    rewardName: b.reward.name,
    rewardType: b.reward.type,
    pointsCost: b.pointsCost,
    requestedAt: b.requestedAt.toISOString(),
    status: b.status,
    deliveryAddress: b.deliveryAddress,
    voucherCode: b.status === 'Delivered' ? (b.voucherCode ?? undefined) : undefined,
    courierName: b.courierName ?? undefined,
    trackingNumber: b.trackingNumber ?? undefined,
    cancelReason: b.cancelReason ?? undefined,
  }),
  reviewToDto: (b: RedemptionReviewBo): RedemptionReviewResponseDto => ({
    redemption: RedemptionMapper.toDto(b.redemption),
    userPoints: b.userPoints,
    checks: b.checks,
    nextStatuses: b.nextStatuses,
    ledgerEntries: b.ledgerEntries.map(PointsMapper.txnToDto),
    timeline: b.timeline.map(AuditMapper.eventToDto),
  }),
};
