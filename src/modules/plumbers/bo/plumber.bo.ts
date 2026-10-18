import type { AccountStatus, PlumberVerificationStatus } from '../../../common/domain/enums.js';
import type { PointsBalanceBo } from '../../points/bo/points.bo.js';

export interface PlumberBo {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  city: string;
  state: string;
  pincode: string;
  registeredAt: Date;
  verificationStatus: PlumberVerificationStatus;
  accountStatus: AccountStatus;
  aadhaarMasked: string | null;
  experienceYears: number;
  specialization: string;
  preferredRetailer: { id: string; shopName: string } | null;
  verificationNote: string | null;
  lastLoginAt: Date | null;
}

export interface PlumberListItemBo extends PlumberBo {
  lifetimePoints: number;
  availablePoints: number;
}

export interface PlumberDetailBo extends PlumberBo {
  points: PointsBalanceBo;
  scanCounts: { total: number; approved: number; pending: number };
}

export interface PlumberQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  verificationStatus?: PlumberVerificationStatus;
  accountStatus?: AccountStatus;
  state?: string;
  sort?: 'id' | 'name' | 'registeredAt' | 'availablePoints';
  order?: 'asc' | 'desc';
}

export interface PlumberProfileInputBo {
  name?: string;
  mobile?: string;
  email?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  experienceYears?: number;
  specialization?: string;
  preferredRetailerId?: string | null;
}

export interface RegisterPlumberBo {
  name: string;
  city: string;
  state: string;
  pincode: string;
  experienceYears: number;
  specialization: string;
  preferredRetailerId: string | null;
}
