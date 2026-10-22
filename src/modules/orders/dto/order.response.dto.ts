import { ApiProperty } from '@nestjs/swagger';
import { ORDER_STATUSES, type OrderStatus } from '../../../common/domain/enums.js';

export class OrderLineResponseDto {
  productId: string;
  productName: string;
  modelCode: string;
  imageUrl?: string;
  quantity: number;
  /** Price per unit when ordered. */
  unitPrice: number;
  value: number;
}

export class OrderResponseDto {
  id: string;
  retailerId: string;
  retailerName: string;
  retailerCity: string;
  @ApiProperty({ enum: ORDER_STATUSES })
  status: OrderStatus;
  note?: string;
  totalValue: number;
  /** Total units across lines. */
  itemCount: number;
  placedAt: string;
  confirmedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  /** Set when delivered, e.g. LVK/PI/2026/00042. */
  purchaseInvoiceNumber?: string;
  /** Signed link to the purchase invoice PDF (delivered orders), relative to the API origin. */
  purchaseInvoiceUrl?: string;
  /** Statuses an admin may move this order to. */
  @ApiProperty({ enum: ORDER_STATUSES, isArray: true })
  nextStatuses: OrderStatus[];
  lines: OrderLineResponseDto[];
}

export class OrderPageResponseDto {
  items: OrderResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
