import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import {
  ACCOUNT_STATUSES,
  PLUMBER_VERIFICATION_STATUSES,
  type AccountStatus,
  type PlumberVerificationStatus,
} from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import { trim } from '../../../common/utils/transform.util.js';


export class PlumberQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PLUMBER_VERIFICATION_STATUSES })
  @IsOptional() @IsIn(PLUMBER_VERIFICATION_STATUSES)
  verificationStatus?: PlumberVerificationStatus;

  @ApiPropertyOptional({ enum: ACCOUNT_STATUSES })
  @IsOptional() @IsIn(ACCOUNT_STATUSES)
  accountStatus?: AccountStatus;

  @IsOptional() @IsString() @MaxLength(60)
  state?: string;

  @ApiPropertyOptional({ enum: ['id', 'name', 'registeredAt', 'availablePoints'] })
  @IsOptional() @IsIn(['id', 'name', 'registeredAt', 'availablePoints'])
  sort?: 'id' | 'name' | 'registeredAt' | 'availablePoints';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

class PlumberProfileFieldsDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) city?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) state?: string;
  @IsOptional() @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits.' }) pincode?: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) experienceYears?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) specialization?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() preferredRetailerId?: string | null;
}

/** Admin edit — KYC and status fields are changed through dedicated endpoints only. */
export class UpdatePlumberRequestDto extends PlumberProfileFieldsDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(80) name?: string;
  /** "+91 98290 11234" */
  @IsOptional() @Matches(/^\+91 [6-9]\d{4} \d{5}$/, { message: 'Use the format +91 98765 43210.' }) mobile?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail() email?: string | null;
}

/** Self-service edit from the app (name and mobile are fixed after KYC). */
export class UpdateMyPlumberProfileRequestDto extends PlumberProfileFieldsDto {
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail() email?: string | null;
  /** Upload key from POST /uploads (purpose profile-photo); null removes the photo. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(80) photoKey?: string | null;
}

export class SetPlumberVerificationRequestDto {
  @ApiProperty({ enum: PLUMBER_VERIFICATION_STATUSES })
  @IsIn(PLUMBER_VERIFICATION_STATUSES)
  status: PlumberVerificationStatus;

  /** Required when rejecting (min 5 characters). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  note?: string;
}

export class SetAccountStatusRequestDto extends ReasonRequestDto {
  @ApiProperty({ enum: ACCOUNT_STATUSES })
  @IsIn(ACCOUNT_STATUSES)
  status: AccountStatus;
}

export class RegisterPlumberRequestDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(80) name: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) city: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) state: string;
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits.' }) pincode: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) experienceYears?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) specialization?: string;
  @IsOptional() @IsString() preferredRetailerId?: string;
}

export class SubmitKycRequestDto {
  /** Last 4 digits returned by the KYC provider. The full Aadhaar number is never sent or stored. */
  @Matches(/^\d{4}$/, { message: 'Provide only the last 4 digits.' })
  aadhaarLast4: string;
}
