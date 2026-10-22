import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import {
  RETAILER_ACCOUNT_STATUSES,
  RETAILER_VERIFICATION_STATUSES,
  type RetailerAccountStatus,
  type RetailerVerificationStatus,
} from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import { trim, upperTrim } from '../../../common/utils/transform.util.js';

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const PINCODE = /^[1-9]\d{5}$/;
const UPLOAD_KEY = /^[a-z-]+_[0-9a-f-]{36}\.[a-z]+$/;

export class RetailerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RETAILER_VERIFICATION_STATUSES })
  @IsOptional() @IsIn(RETAILER_VERIFICATION_STATUSES)
  verificationStatus?: RetailerVerificationStatus;

  @ApiPropertyOptional({ enum: RETAILER_ACCOUNT_STATUSES })
  @IsOptional() @IsIn(RETAILER_ACCOUNT_STATUSES)
  accountStatus?: RetailerAccountStatus;

  @IsOptional() @IsString() @MaxLength(60)
  state?: string;

  @ApiPropertyOptional({ enum: ['id', 'shopName', 'sales30d', 'achievementPct'] })
  @IsOptional() @IsIn(['id', 'shopName', 'sales30d', 'achievementPct'])
  sort?: 'id' | 'shopName' | 'sales30d' | 'achievementPct';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class UpdateRetailerRequestDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) shopName?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(80) ownerName?: string;
  @IsOptional() @Matches(/^\+91 [6-9]\d{4} \d{5}$/, { message: 'Use the format +91 98765 43210.' }) mobile?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail() email?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MinLength(5) @MaxLength(250) address?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) city?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) state?: string;
  @IsOptional() @Transform(upperTrim) @ValidateIf((_, v) => v !== null && v !== '') @Matches(GSTIN, { message: 'Enter a valid 15-character GSTIN.' })
  gstin?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) distributor?: string;
  @IsOptional() @IsInt() @Min(10_000) @Max(1_000_000_000) monthlyTarget?: number;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Matches(PINCODE, { message: 'Enter a valid 6-digit pincode.' }) pincode?: string | null;
  @IsOptional() @Transform(upperTrim) @ValidateIf((_, v) => v !== null && v !== '') @Matches(PAN, { message: 'Enter a valid 10-character PAN.' }) pan?: string | null;
}

export class ReviewRetailerRequestDto {
  @ApiProperty({ enum: ['Approved', 'Rejected'] })
  @IsIn(['Approved', 'Rejected'])
  decision: 'Approved' | 'Rejected';

  /** Required when rejecting. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  reason?: string;
}

export class SetRetailerAccountStatusRequestDto extends ReasonRequestDto {
  @ApiProperty({ enum: RETAILER_ACCOUNT_STATUSES })
  @IsIn(RETAILER_ACCOUNT_STATUSES)
  status: RetailerAccountStatus;
}

export class RegisterRetailerRequestDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120) shopName: string;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(80) ownerName: string;
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(250) address: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) city: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) state: string;
  @IsOptional() @Transform(upperTrim) @ValidateIf((_, v) => v !== '') @Matches(GSTIN, { message: 'Enter a valid 15-character GSTIN.' })
  gstin?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) distributor?: string;
  @Matches(PINCODE, { message: 'Enter a valid 6-digit pincode.' }) pincode: string;
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail() email?: string;
  @IsOptional() @Transform(upperTrim) @ValidateIf((_, v) => v !== '') @Matches(PAN, { message: 'Enter a valid 10-character PAN.' }) pan?: string;
  /** Upload keys from POST /uploads made while signed in as a guest (purposes shop-photo, gst-certificate). */
  @IsOptional() @Matches(UPLOAD_KEY) shopPhotoKey?: string;
  @IsOptional() @Matches(UPLOAD_KEY) gstCertificateKey?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
}

export class UpdateMyRetailerProfileRequestDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(80) ownerName?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail() email?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MinLength(5) @MaxLength(250) address?: string;
  /** Upload key from POST /uploads (purpose profile-photo); null removes the photo. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(80) photoKey?: string | null;
  /** Upload key from POST /uploads (purpose shop-photo); null removes the photo. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(80) shopPhotoKey?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @Matches(PINCODE, { message: 'Enter a valid 6-digit pincode.' }) pincode?: string | null;
  @IsOptional() @Transform(upperTrim) @ValidateIf((_, v) => v !== null && v !== '') @Matches(PAN, { message: 'Enter a valid 10-character PAN.' }) pan?: string | null;
  /** Upload key (purpose gst-certificate); null removes it. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @Matches(UPLOAD_KEY) gstCertificateKey?: string | null;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
}

export class StoreQueryDto extends PaginationQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  city?: string;
}
