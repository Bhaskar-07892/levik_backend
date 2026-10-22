import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PRODUCT_CATEGORIES, STOCK_REASONS, STOCK_STATUSES, type ProductCategory, type StockReason, type StockStatus } from '../../../common/domain/enums.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class InventoryQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() retailerId?: string;
  @IsOptional() @IsString() productId?: string;

  @ApiPropertyOptional({ enum: PRODUCT_CATEGORIES })
  @IsOptional() @IsIn(PRODUCT_CATEGORIES)
  category?: ProductCategory;

  @ApiPropertyOptional({ enum: STOCK_STATUSES })
  @IsOptional() @IsIn(STOCK_STATUSES)
  stockStatus?: StockStatus;
}

export class MyInventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STOCK_STATUSES })
  @IsOptional() @IsIn(STOCK_STATUSES)
  stockStatus?: StockStatus;
}

export class UpdateInventoryRequestDto {
  @IsInt() @Min(0) @Max(1_000_000)
  quantity: number;

  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(200)
  note?: string;
}

export class ReportStockRequestDto {
  @IsInt() @Min(0) @Max(1_000_000)
  quantity: number;
}

export class InventoryItemResponseDto {
  id: string;
  retailerId: string;
  retailerName: string;
  productId: string;
  productName: string;
  modelCode: string;
  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  category: ProductCategory;
  quantity: number;
  @ApiProperty({ enum: STOCK_STATUSES })
  stockStatus: StockStatus;
  updatedAt: string;
  updatedBy: string;
}

export class InventoryPageResponseDto {
  items: InventoryItemResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class InventorySummaryResponseDto {
  lines: number;
  retailersReporting: number;
  lowStock: number;
  outOfStock: number;
  /** Low-stock threshold from settings. */
  threshold: number;
}

export class StockMovementQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() retailerId?: string;
  @IsOptional() @IsString() productId?: string;
}

export class MyStockMovementQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() productId?: string;
}

/** One change to a retailer's stock, with what caused it. */
export class StockMovementResponseDto {
  id: string;
  retailerId: string;
  retailerName: string;
  productId: string;
  productName: string;
  modelCode: string;
  /** Units added (+) or removed (−). */
  delta: number;
  balanceAfter: number;
  @ApiProperty({ enum: STOCK_REASONS })
  reason: StockReason;
  /** order / scan / bill, with its id. */
  relatedType?: string;
  relatedId?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export class StockMovementPageResponseDto {
  items: StockMovementResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
