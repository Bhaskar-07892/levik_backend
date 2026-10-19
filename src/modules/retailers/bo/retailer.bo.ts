import type { RetailerAccountStatus, RetailerVerificationStatus } from '../../../common/domain/enums.js';
import type { PointsBalanceBo } from '../../points/bo/points.bo.js';

export interface RetailerBo {
  id: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  gstin: string | null;
  distributor: string;
  registeredAt: Date;
  verificationStatus: RetailerVerificationStatus;
  accountStatus: RetailerAccountStatus;
  monthlyTarget: number;
  rejectionReason: string | null;
  /** Upload keys (image IDs) of the owner's profile photo and the shop front photo. */
  photoKey: string | null;
  shopPhotoKey: string | null;
  lastLoginAt: Date | null;
}

export interface RetailerPerformanceBo {
  /** Approved invoice value (pre-GST) with invoice date in the last 30 days. */
  sales30d: number;
  /** sales30d / monthlyTarget, as a percentage. */
  achievementPct: number;
}

export interface RetailerListItemBo extends RetailerBo, RetailerPerformanceBo {
  availablePoints: number;
}

export interface RetailerDetailBo extends RetailerBo, RetailerPerformanceBo {
  points: PointsBalanceBo;
}

export interface RetailerQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  verificationStatus?: RetailerVerificationStatus;
  accountStatus?: RetailerAccountStatus;
  state?: string;
  sort?: 'id' | 'shopName' | 'sales30d' | 'achievementPct';
  order?: 'asc' | 'desc';
}

export interface RetailerProfileInputBo {
  shopName?: string;
  ownerName?: string;
  mobile?: string;
  email?: string | null;
  address?: string;
  city?: string;
  state?: string;
  gstin?: string | null;
  distributor?: string;
  monthlyTarget?: number;
  photoKey?: string | null;
  shopPhotoKey?: string | null;
}

export interface RegisterRetailerBo {
  shopName: string;
  ownerName: string;
  address: string;
  city: string;
  state: string;
  gstin: string | null;
  distributor: string;
}

export interface StoreBo {
  id: string;
  shopName: string;
  address: string;
  city: string;
  state: string;
  mobile: string;
  shopPhotoKey: string | null;
}
