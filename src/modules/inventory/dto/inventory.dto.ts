import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PRODUCT_CATEGORIES, STOCK_STATUSES, type ProductCategory, type StockStatus } from '../../../common/domain/enums.js';
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
