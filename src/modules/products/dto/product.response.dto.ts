import { ApiProperty } from '@nestjs/swagger';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../common/domain/enums.js';

export class ProductResponseDto {
  id: string;
  name: string;
  modelCode: string;
  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  category: ProductCategory;
  description: string;
  dimensions?: string;
  features: string[];
  imageUrl?: string;
  sku: string;
  barcode: string;
  mrp: number;
  plumberPoints: number;
  isActive: boolean;
  rewardEligible: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ProductPageResponseDto {
  items: ProductResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/** Catalogue view for the mobile app (no pricing internals). */
export class AppProductResponseDto {
  id: string;
  name: string;
  modelCode: string;
  @ApiProperty({ enum: PRODUCT_CATEGORIES })
  category: ProductCategory;
  description: string;
  dimensions?: string;
  features: string[];
  imageUrl?: string;
  /** Points earned per approved scan (0 if not reward-eligible). */
  scanPoints: number;
}

export class AppProductPageResponseDto {
  items: AppProductResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
