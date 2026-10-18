import type { RewardCategory, RewardType, UserRole } from '../../../common/domain/enums.js';

export interface RewardBo {
  id: string;
  name: string;
  category: RewardCategory;
  type: RewardType;
  description: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  eligibleRoles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardWithStatsBo extends RewardBo {
  /** Approved, not refunded. */
  redeemedCount: number;
}

export type RewardInputBo = Omit<RewardBo, 'id' | 'createdAt' | 'updatedAt'>;

export interface RewardQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  category?: RewardCategory;
  isActive?: boolean;
  eligibleRole?: UserRole;
}
