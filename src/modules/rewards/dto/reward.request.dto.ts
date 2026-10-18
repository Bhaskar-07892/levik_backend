import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, NotEquals } from 'class-validator';
import {
  REWARD_CATEGORIES,
  REWARD_TYPES,
  USER_ROLES,
  type RewardCategory,
  type RewardType,
  type UserRole,
} from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ReasonRequestDto } from '../../../common/dto/reason.request.dto.js';
import { toBool, trim } from '../../../common/utils/transform.util.js';


export class CreateRewardRequestDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120)
  name: string;

  @ApiProperty({ enum: REWARD_CATEGORIES })
  @IsIn(REWARD_CATEGORIES)
  category: RewardCategory;

  @ApiProperty({ enum: REWARD_TYPES })
  @IsIn(REWARD_TYPES)
  type: RewardType;

  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000)
  description: string;

  @IsInt() @Min(100) @Max(10_000_000)
  pointsRequired: number;

  @IsInt() @Min(0) @Max(1_000_000)
  stock: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ enum: USER_ROLES, isArray: true })
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(USER_ROLES, { each: true })
  eligibleRoles: UserRole[];
}

/** Stock changes only through the stock adjustment endpoint. */
export class UpdateRewardRequestDto extends PartialType(OmitType(CreateRewardRequestDto, ['stock'] as const)) {}

export class AdjustRewardStockRequestDto extends ReasonRequestDto {
  // Explicit schema: the Swagger plugin drops properties validated with @NotEquals.
  @ApiProperty({ type: 'integer', minimum: -1_000_000, maximum: 1_000_000, description: 'Units to add (positive) or remove (negative). Stock never goes below zero.' })
  @IsInt() @NotEquals(0) @Min(-1_000_000) @Max(1_000_000)
  delta: number;
}

export class RewardQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REWARD_CATEGORIES })
  @IsOptional() @IsIn(REWARD_CATEGORIES)
  category?: RewardCategory;

  @IsOptional() @Transform(toBool) @IsBoolean()
  isActive?: boolean;
}

export class AppRewardQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: REWARD_CATEGORIES })
  @IsOptional() @IsIn(REWARD_CATEGORIES)
  category?: RewardCategory;
}
