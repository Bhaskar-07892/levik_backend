import type { PointsBalanceBo, PointsTransactionBo } from '../bo/points.bo.js';
import type { PointsBalanceDao } from '../dao/points-balance.dao.js';
import type { PointsTransactionDao } from '../dao/points-transaction.dao.js';
import type { PointsBalanceResponseDto, PointsTransactionResponseDto } from '../dto/points.response.dto.js';

export const PointsMapper = {
  balanceToBo: (d: PointsBalanceDao): PointsBalanceBo => ({
    userId: d.userId,
    userRole: d.userRole,
    lifetime: Number(d.lifetime),
    redeemed: Number(d.redeemed),
    available: Number(d.available),
  }),
  txnToBo: (d: PointsTransactionDao, userName?: string): PointsTransactionBo => ({
    id: d.id,
    userId: d.userId,
    userRole: d.userRole,
    userName: userName ?? d.userId,
    source: d.source,
    related: d.relatedType && d.relatedId ? { type: d.relatedType, id: d.relatedId } : null,
    credit: d.credit,
    debit: d.debit,
    createdAt: d.createdAt,
    status: d.status,
    note: d.note,
    createdBy: d.createdBy,
  }),
  txnToDto: (b: PointsTransactionBo): PointsTransactionResponseDto => ({
    ...b,
    related: b.related ?? undefined,
    createdAt: b.createdAt.toISOString(),
  }),
  balanceToDto: (b: PointsBalanceBo): PointsBalanceResponseDto => ({ ...b }),
};
