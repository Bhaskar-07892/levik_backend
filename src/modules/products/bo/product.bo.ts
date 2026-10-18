import type { ProductCategory } from '../../../common/domain/enums.js';

export interface ProductBo {
  id: string;
  name: string;
  modelCode: string;
  category: ProductCategory;
  description: string;
  dimensions: string | null;
  features: string[];
  imageUrl: string | null;
  sku: string;
  barcode: string;
  mrp: number;
  plumberPoints: number;
  isActive: boolean;
  rewardEligible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductInputBo = Omit<ProductBo, 'id' | 'createdAt' | 'updatedAt'>;

export interface ProductQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  category?: ProductCategory;
  isActive?: boolean;
}
