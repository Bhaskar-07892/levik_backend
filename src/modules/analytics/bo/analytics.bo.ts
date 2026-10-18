import type { Bucket } from '../../../common/utils/period.util.js';

export interface DashboardKpisBo {
  totalPlumbers: number;
  verifiedPlumbers: number;
  activeRetailers: number;
  productScans: number;
  pendingScans: number;
  pendingInvoices: number;
  activeSchemes: number;
  pointsIssued: number;
  pointsRedeemed: number;
  pendingRedemptions: number;
  verifiedSales: number;
}

export interface SalesPointBo {
  /** Bucket start date in IST, YYYY-MM-DD. */
  bucket: string;
  sales: number;
  invoices: number;
}

export interface ScanPointBo {
  /** Bucket start date in IST, YYYY-MM-DD. */
  bucket: string;
  approved: number;
  pending: number;
  rejected: number;
  flagged: number;
}

export interface PointsPointBo {
  /** Bucket start date in IST, YYYY-MM-DD. */
  bucket: string;
  earned: number;
  redeemed: number;
}

export interface DashboardBo {
  from: Date;
  bucket: Bucket;
  kpis: DashboardKpisBo;
  salesTrend: SalesPointBo[];
  scanTrend: ScanPointBo[];
  pointsTrend: PointsPointBo[];
}

export interface RangeBo {
  from: Date;
  to: Date;
}

export interface SearchResultBo {
  type: 'Plumber' | 'Retailer' | 'Product' | 'Scan' | 'Invoice' | 'Redemption' | 'Scheme';
  id: string;
  title: string;
  subtitle: string;
}

export interface AdminNotificationBo {
  id: string;
  title: string;
  detail: string;
  count: number;
  /** Admin portal route to open. */
  href: string;
}
