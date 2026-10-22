import { ApiProperty } from '@nestjs/swagger';
import {
  RETAILER_ACCOUNT_STATUSES,
  RETAILER_VERIFICATION_STATUSES,
  type RetailerAccountStatus,
  type RetailerVerificationStatus,
} from '../../../common/domain/enums.js';
import { PointsBalanceResponseDto } from '../../points/dto/points.response.dto.js';

export class RetailerResponseDto {
  id: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  gstin?: string;
  distributor: string;
  registeredAt: string;
  @ApiProperty({ enum: RETAILER_VERIFICATION_STATUSES })
  verificationStatus: RetailerVerificationStatus;
  @ApiProperty({ enum: RETAILER_ACCOUNT_STATUSES })
  accountStatus: RetailerAccountStatus;
  monthlyTarget: number;
  rejectionReason?: string;
  /** Signed links to the owner's profile photo and the shop front photo, relative to the API origin. */
  photoUrl?: string;
  shopPhotoUrl?: string;
  /** Signed link to the GST registration certificate uploaded at onboarding. */
  gstCertificateUrl?: string;
  pincode?: string;
  pan?: string;
  latitude?: number;
  longitude?: number;
  lastLoginAt?: string;
}

export class RetailerListItemResponseDto extends RetailerResponseDto {
  sales30d: number;
  achievementPct: number;
  availablePoints: number;
}

export class RetailerPageResponseDto {
  items: RetailerListItemResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class RetailerDetailResponseDto extends RetailerResponseDto {
  sales30d: number;
  achievementPct: number;
  points: PointsBalanceResponseDto;
}

export class StoreResponseDto {
  id: string;
  shopName: string;
  address: string;
  city: string;
  state: string;
  mobile: string;
  /** Signed link to the shop front photo, relative to the API origin. */
  shopPhotoUrl?: string;
}

export class StorePageResponseDto {
  items: StoreResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
