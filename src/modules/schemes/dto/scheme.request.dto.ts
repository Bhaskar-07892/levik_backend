import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsDate, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import {
  PRODUCT_CATEGORIES,
  SCHEME_STATUSES,
  USER_ROLES,
  type ProductCategory,
  type SchemeStatus,
  type UserRole,
} from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { trim } from '../../../common/utils/transform.util.js';


export class CreateSchemeRequestDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120)
  name: string;

  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000)
  description: string;

  @ApiProperty({ enum: USER_ROLES, description: 'retailer = sales scheme (₹ target); plumber = installation campaign (scan count)' })
  @IsIn(USER_ROLES)
  role: UserRole;

  @Type(() => Date) @IsDate()
  startDate: Date;

  @Type(() => Date) @IsDate()
  endDate: Date;

  @ApiProperty({ enum: PRODUCT_CATEGORIES, isArray: true })
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsIn(PRODUCT_CATEGORIES, { each: true })
  eligibleCategories: ProductCategory[];

  /** ₹ of approved eligible invoice value (retailers) or number of approved scans (plumbers). */
  @IsInt() @Min(1) @Max(1_000_000_000)
  targetValue: number;

  @IsInt() @Min(1) @Max(10_000_000)
  incentivePoints: number;
}

export class UpdateSchemeRequestDto extends PartialType(CreateSchemeRequestDto) {}

export class SchemeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SCHEME_STATUSES })
  @IsOptional() @IsIn(SCHEME_STATUSES)
  status?: SchemeStatus;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional() @IsIn(USER_ROLES)
  role?: UserRole;
}
