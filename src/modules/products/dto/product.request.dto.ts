import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { toBool, trim } from '../../../common/utils/transform.util.js';


export class CreateProductRequestDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(120)
  name: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(30)
  modelCode: string;

  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  @IsIn(PRODUCT_CATEGORIES)
  category: ProductCategory;

  @Transform(trim) @IsString() @MinLength(10) @MaxLength(1000)
  description: string;

  /** Only as published in the Levik catalogue. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  dimensions?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(80, { each: true })
  features?: string[];

  @IsOptional() @IsString() @MaxLength(500)
  @IsUrl({ require_tld: false, require_protocol: false, allow_underscores: true }, { message: 'imageUrl must be a URL, a path or an uploaded product-image key' })
  imageUrl?: string;

  @Transform(trim) @IsString() @MinLength(3) @MaxLength(40)
  sku: string;

  @Matches(/^\d{8,14}$/, { message: 'Barcode must be 8–14 digits.' })
  barcode: string;

  /** Demo/list MRP in ₹. */
  @IsInt() @Min(1) @Max(10_000_000)
  mrp: number;

  /** Points a plumber earns per approved scan. */
  @IsInt() @Min(0) @Max(100_000)
  plumberPoints: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsBoolean()
  rewardEligible?: boolean;
}

export class UpdateProductRequestDto extends PartialType(CreateProductRequestDto) {}

export class SetProductStatusRequestDto {
  @IsBoolean()
  isActive: boolean;
}

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}

export class AppProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;

  @IsOptional() @Type(() => String)
  barcode?: string;
}
