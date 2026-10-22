export interface BillLineBo {
  productId: string;
  productName: string;
  modelCode: string;
  quantity: number;
  unitPrice: number;
  value: number;
}

export interface BillBo {
  id: string;
  retailerId: string;
  retailerName: string;
  billNumber: string;
  customerName: string;
  customerMobile: string | null;
  /** The plumber sale this bill was raised for, if any. */
  scanId: string | null;
  totalValue: number;
  createdAt: Date;
  createdBy: string;
  lines: BillLineBo[];
}

export interface CreateBillBo {
  customerName: string;
  customerMobile?: string;
  /** unitPrice defaults to the catalogue price (MRP). */
  lines: Array<{ productId: string; quantity: number; unitPrice?: number }>;
}
