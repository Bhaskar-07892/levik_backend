import type { ProductCategory, StockStatus } from '../../../common/domain/enums.js';

export interface InventoryItemBo {
  id: string;
  retailerId: string;
  retailerName: string;
  productId: string;
  productName: string;
  modelCode: string;
  category: ProductCategory;
  quantity: number;
  stockStatus: StockStatus;
  updatedAt: Date;
  updatedBy: string;
}

export interface InventoryQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  retailerId?: string;
  productId?: string;
  category?: ProductCategory;
  stockStatus?: StockStatus;
}

export interface InventorySummaryBo {
  lines: number;
  retailersReporting: number;
  lowStock: number;
  outOfStock: number;
  threshold: number;
}
