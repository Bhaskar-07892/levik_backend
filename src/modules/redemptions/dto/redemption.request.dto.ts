import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { REDEMPTION_STATUSES, USER_ROLES, type RedemptionStatus, type UserRole } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';


export class RedemptionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REDEMPTION_STATUSES })
  @IsOptional() @IsIn(REDEMPTION_STATUSES)
  status?: RedemptionStatus;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional() @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  rewardId?: string;
}

export class MyRedemptionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REDEMPTION_STATUSES })
  @IsOptional() @IsIn(REDEMPTION_STATUSES)
  status?: RedemptionStatus;
}

const NEXT = ['Processing', 'Dispatched', 'Delivered', 'Cancelled', 'Failed'] as const;

export class UpdateRedemptionStatusRequestDto {
  @ApiProperty({ enum: NEXT })
  @IsIn(NEXT)
  status: (typeof NEXT)[number];

  /** Required for Cancelled / Failed (min 5 characters). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  reason?: string;

  /** Dispatched: courier name (a demo value is used if omitted). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  courierName?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  trackingNumber?: string;

  /** Delivered (digital rewards): the voucher code sent to the user. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  voucherCode?: string;
}

export class RequestRedemptionRequestDto {
  @IsString()
  rewardId: string;

  /** Postal address for physical rewards, or the phone/email for digital ones. */
  @Transform(trim) @IsString() @MinLength(5) @MaxLength(300)
  deliveryAddress: string;
}
