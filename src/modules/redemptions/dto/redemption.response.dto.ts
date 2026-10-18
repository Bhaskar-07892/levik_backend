import { ApiProperty } from '@nestjs/swagger';
import {
  REDEMPTION_STATUSES,
  REWARD_CATEGORIES,
  REWARD_TYPES,
  USER_ROLES,
  type RedemptionStatus,
  type RewardCategory,
  type RewardType,
  type UserRole,
} from '../../../common/domain/enums.js';
import { CheckResponseDto } from '../../../common/dto/check.response.dto.js';
import { StatusEventResponseDto } from '../../audit/dto/audit.response.dto.js';
import { PointsBalanceResponseDto, PointsTransactionResponseDto } from '../../points/dto/points.response.dto.js';

export class RedemptionRewardDto {
  id: string;
  name: string;
  @ApiProperty({ enum: REWARD_CATEGORIES })
  category: RewardCategory;
  @ApiProperty({ enum: REWARD_TYPES })
  type: RewardType;
  stock: number;
  isActive: boolean;
}

export class RedemptionResponseDto {
  id: string;
  userId: string;
  @ApiProperty({ enum: USER_ROLES })
  userRole: UserRole;
  userName: string;
  reward: RedemptionRewardDto;
  pointsCost: number;
  /** True once points are deducted and not refunded. */
  pointsDeducted: boolean;
  requestedAt: string;
  @ApiProperty({ enum: REDEMPTION_STATUSES })
  status: RedemptionStatus;
  deliveryAddress: string;
  debitTxnId?: string;
  reversalTxnId?: string;
  fulfilmentRef?: string;
  voucherCode?: string;
  courierName?: string;
  trackingNumber?: string;
  cancelReason?: string;
}

export class RedemptionPageResponseDto {
  items: RedemptionResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class RedemptionReviewResponseDto {
  redemption: RedemptionResponseDto;
  userPoints: PointsBalanceResponseDto;
  checks: CheckResponseDto[];
  @ApiProperty({ enum: REDEMPTION_STATUSES, isArray: true })
  nextStatuses: RedemptionStatus[];
  ledgerEntries: PointsTransactionResponseDto[];
  timeline: StatusEventResponseDto[];
}

export class AppRedemptionResponseDto {
  id: string;
  rewardId: string;
  rewardName: string;
  @ApiProperty({ enum: REWARD_TYPES })
  rewardType: RewardType;
  pointsCost: number;
  requestedAt: string;
  @ApiProperty({ enum: REDEMPTION_STATUSES })
  status: RedemptionStatus;
  deliveryAddress: string;
  voucherCode?: string;
  courierName?: string;
  trackingNumber?: string;
  cancelReason?: string;
}

export class AppRedemptionPageResponseDto {
  items: AppRedemptionResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
