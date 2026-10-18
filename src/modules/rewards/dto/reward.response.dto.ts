import { ApiProperty } from '@nestjs/swagger';
import {
  REWARD_CATEGORIES,
  REWARD_TYPES,
  USER_ROLES,
  type RewardCategory,
  type RewardType,
  type UserRole,
} from '../../../common/domain/enums.js';

export class RewardResponseDto {
  id: string;
  name: string;
  @ApiProperty({ enum: REWARD_CATEGORIES })
  category: RewardCategory;
  @ApiProperty({ enum: REWARD_TYPES })
  type: RewardType;
  description: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  @ApiProperty({ enum: USER_ROLES, isArray: true })
  eligibleRoles: UserRole[];
  redeemedCount: number;
  createdAt: string;
  updatedAt: string;
}

export class RewardPageResponseDto {
  items: RewardResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AppRewardResponseDto {
  id: string;
  name: string;
  @ApiProperty({ enum: REWARD_CATEGORIES })
  category: RewardCategory;
  @ApiProperty({ enum: REWARD_TYPES })
  type: RewardType;
  description: string;
  pointsRequired: number;
  inStock: boolean;
  /** Points still needed (0 = can redeem now). */
  pointsShort: number;
}

export class AppRewardPageResponseDto {
  items: AppRewardResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
