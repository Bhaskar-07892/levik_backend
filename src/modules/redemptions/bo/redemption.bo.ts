import type { CheckBo } from '../../../common/bo/check.bo.js';
import type { RedemptionStatus, RewardCategory, RewardType, UserRole } from '../../../common/domain/enums.js';
import type { StatusEventBo } from '../../audit/bo/audit.bo.js';
import type { PointsBalanceBo, PointsTransactionBo } from '../../points/bo/points.bo.js';

export interface RedemptionBo {
  id: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  reward: { id: string; name: string; category: RewardCategory; type: RewardType; stock: number; isActive: boolean };
  pointsCost: number;
  requestedAt: Date;
  status: RedemptionStatus;
  deliveryAddress: string;
  debitTxnId: string | null;
  reversalTxnId: string | null;
  fulfilmentRef: string | null;
  voucherCode: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
}

export interface RedemptionReviewBo {
  redemption: RedemptionBo;
  userPoints: PointsBalanceBo;
  checks: CheckBo[];
  nextStatuses: RedemptionStatus[];
  ledgerEntries: PointsTransactionBo[];
  timeline: StatusEventBo[];
}

export interface RedemptionQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  status?: RedemptionStatus;
  role?: UserRole;
  userId?: string;
  rewardId?: string;
}

export interface FulfilmentDetailsBo {
  reason?: string;
  courierName?: string;
  trackingNumber?: string;
  voucherCode?: string;
}
