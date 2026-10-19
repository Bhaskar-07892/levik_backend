import { ApiProperty } from '@nestjs/swagger';
import {
  ACCOUNT_STATUSES,
  PLUMBER_VERIFICATION_STATUSES,
  type AccountStatus,
  type PlumberVerificationStatus,
} from '../../../common/domain/enums.js';
import { PointsBalanceResponseDto } from '../../points/dto/points.response.dto.js';

export class RetailerRefDto {
  id: string;
  shopName: string;
}

export class PlumberResponseDto {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  state: string;
  pincode: string;
  registeredAt: string;
  @ApiProperty({ enum: PLUMBER_VERIFICATION_STATUSES })
  verificationStatus: PlumberVerificationStatus;
  @ApiProperty({ enum: ACCOUNT_STATUSES })
  accountStatus: AccountStatus;
  aadhaarMasked?: string;
  /** Signed link to the profile photo, relative to the API origin. */
  photoUrl?: string;
  experienceYears: number;
  specialization: string;
  preferredRetailer?: RetailerRefDto;
  verificationNote?: string;
  lastLoginAt?: string;
}

export class PlumberListItemResponseDto extends PlumberResponseDto {
  lifetimePoints: number;
  availablePoints: number;
}

export class PlumberPageResponseDto {
  items: PlumberListItemResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class ScanCountsDto {
  total: number;
  approved: number;
  pending: number;
}

export class PlumberDetailResponseDto extends PlumberResponseDto {
  points: PointsBalanceResponseDto;
  scanCounts: ScanCountsDto;
}
