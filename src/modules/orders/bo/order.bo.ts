import type { OrderStatus } from '../../../common/domain/enums.js';

export interface OrderLineBo {
  productId: string;
  productName: string;
  modelCode: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  value: number;
}

export interface OrderBo {
  id: string;
  retailerId: string;
  retailerName: string;
  retailerCity: string;
  status: OrderStatus;
  note: string | null;
  totalValue: number;
  itemCount: number;
  placedAt: Date;
  confirmedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  purchaseInvoiceNumber: string | null;
  lines: OrderLineBo[];
}

export interface PlaceOrderBo {
  lines: Array<{ productId: string; quantity: number }>;
  note?: string;
}

export interface OrderQueryBo {
  page: number;
  pageSize: number;
  retailerId?: string;
  status?: OrderStatus;
  search?: string;
}

/** Statuses an admin may move an order to next. */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  Placed: ['Confirmed', 'Cancelled'],
  Confirmed: ['Dispatched', 'Cancelled'],
  Dispatched: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};
