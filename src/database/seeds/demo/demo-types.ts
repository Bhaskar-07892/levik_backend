/** Demo domain types (copied from the Levik Admin offline demo) used only to build seed data. */

// ---- common
export type ID = string;
export type ISODate = string;
export type UserRole = "plumber" | "retailer";

export interface StatusEvent {
  at: ISODate;
  by: string;
  action: string;
  note?: string;
}

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  role: "Programme Administrator";
}

// ---- plumber

export const PLUMBER_VERIFICATION_STATUSES = ["Verified", "Pending", "Rejected"] as const;
export type PlumberVerificationStatus = (typeof PLUMBER_VERIFICATION_STATUSES)[number];

export const ACCOUNT_STATUSES = ["Active", "Suspended", "Inactive"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface Plumber {
  id: ID;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  state: string;
  pincode: string;
  registeredAt: ISODate;
  verificationStatus: PlumberVerificationStatus;
  accountStatus: AccountStatus;
  /** Masked mock Aadhaar reference. No real Aadhaar data is stored. */
  aadhaarMasked: string;
  experienceYears: number;
  specialization: string;
  preferredRetailerId?: ID;
  verificationNote?: string;
}

// ---- retailer

export const RETAILER_VERIFICATION_STATUSES = ["Approved", "Pending", "Rejected"] as const;
export type RetailerVerificationStatus = (typeof RETAILER_VERIFICATION_STATUSES)[number];

export const RETAILER_ACCOUNT_STATUSES = ["Active", "Suspended"] as const;
export type RetailerAccountStatus = (typeof RETAILER_ACCOUNT_STATUSES)[number];

export interface Retailer {
  id: ID;
  shopName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  gstin?: string;
  distributor: string;
  registeredAt: ISODate;
  verificationStatus: RetailerVerificationStatus;
  accountStatus: RetailerAccountStatus;
  /** Monthly sales target in INR. */
  monthlyTarget: number;
  rejectionReason?: string;
}

// ---- product

export const PRODUCT_CATEGORIES = [
  "One-Piece Western WC",
  "Wall-Hung WC",
  "Floor-Mounted EWC",
  "Indian Pan",
  "Half-Pedestal Basin",
  "Pedestal Basin",
  "Wall-Hung Basin",
  "Countertop Basin",
  "Urinal",
  "Cistern",
  "Kitchen Sink",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  id: ID;
  name: string;
  modelCode: string;
  category: ProductCategory;
  description: string;
  /** Only populated when published in the Levik catalogue. */
  dimensions?: string;
  features: string[];
  image?: string;
  sku: string;
  barcode: string;
  /** Demo MRP in INR, used for invoice values. Not an official price list. */
  mrp: number;
  /** Points a plumber earns for an approved scan (sample value). */
  plumberPoints: number;
  isActive: boolean;
  rewardEligible: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---- transaction

export const SCAN_STATUSES = ["Pending", "Approved", "Rejected", "Flagged"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export interface ProductScan {
  id: ID;
  plumberId: ID;
  productId: ID;
  /** Serial code printed on the product label, as submitted by the plumber. */
  submittedCode: string;
  scannedAt: ISODate;
  retailerId?: ID;
  invoiceNumber?: string;
  siteLocation: string;
  status: ScanStatus;
  awardedPoints?: number;
  ledgerTxnId?: ID;
  rejectionReason?: string;
  flagReason?: string;
  reviewedBy?: string;
  reviewedAt?: ISODate;
  history: StatusEvent[];
}

export const POINTS_SOURCES = [
  "Product Scan",
  "Invoice Incentive",
  "Scheme Bonus",
  "Redemption",
  "Redemption Reversal",
  "Manual Adjustment",
  "Opening Balance",
] as const;
export type PointsSource = (typeof POINTS_SOURCES)[number];

export type RelatedEntityType = "scan" | "invoice" | "redemption" | "scheme";

export interface PointsTransaction {
  id: ID;
  userId: ID;
  userRole: UserRole;
  source: PointsSource;
  related?: { type: RelatedEntityType; id: ID };
  credit: number;
  debit: number;
  createdAt: ISODate;
  status: "Posted";
  note: string;
  createdBy: string;
}

// ---- invoice

export const INVOICE_STATUSES = [
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "More Information Required",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceLineItem {
  id: ID;
  productId: ID;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: ID;
  invoiceNumber: string;
  retailerId: ID;
  buyerName: string;
  invoiceDate: ISODate;
  submittedAt: ISODate;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  reviewer?: string;
  reviewedAt?: ISODate;
  incentivePoints?: number;
  ledgerTxnId?: ID;
  rejectionReason?: string;
  infoRequest?: string;
  history: StatusEvent[];
}

// ---- reward

export const REWARD_CATEGORIES = [
  "Shopping Voucher",
  "Gift Card",
  "Air Conditioner",
  "Refrigerator",
  "Television",
  "Home Appliance",
  "Tools & Equipment",
  "Other",
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];
export type RewardType = "Digital" | "Physical";

export interface Reward {
  id: ID;
  name: string;
  category: RewardCategory;
  type: RewardType;
  description: string;
  pointsRequired: number;
  stock: number;
  isActive: boolean;
  eligibleRoles: UserRole[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const REDEMPTION_STATUSES = [
  "Requested",
  "Approved",
  "Processing",
  "Dispatched",
  "Delivered",
  "Cancelled",
  "Failed",
] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export interface Redemption {
  id: ID;
  userId: ID;
  userRole: UserRole;
  rewardId: ID;
  pointsCost: number;
  requestedAt: ISODate;
  status: RedemptionStatus;
  deliveryAddress: string;
  debitTxnId?: ID;
  reversalTxnId?: ID;
  fulfilmentRef?: string;
  voucherCode?: string;
  courierName?: string;
  trackingNumber?: string;
  cancelReason?: string;
  history: StatusEvent[];
}

// ---- scheme

export const SCHEME_STATUSES = ["Draft", "Scheduled", "Active", "Completed", "Paused"] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

/** Retailer schemes measure approved invoice value; plumber campaigns count approved scans. */
export type SchemeTargetType = "Sales Amount" | "Approved Scans";

export interface Scheme {
  id: ID;
  name: string;
  description: string;
  role: UserRole;
  startDate: ISODate;
  endDate: ISODate;
  eligibleCategories: ProductCategory[];
  targetType: SchemeTargetType;
  targetValue: number;
  incentivePoints: number;
  status: SchemeStatus;
  awardedUserIds: ID[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---- inventory

/** Retailer-reported stock. Not live warehouse inventory. */
export interface InventoryItem {
  id: ID;
  retailerId: ID;
  productId: ID;
  quantity: number;
  updatedAt: ISODate;
  updatedBy: string;
}

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

// ---- support

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved", "Closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = "Low" | "Medium" | "High";

export interface TicketNote {
  at: ISODate;
  by: string;
  text: string;
}

export interface SupportTicket {
  id: ID;
  userId: ID;
  userRole: UserRole;
  subject: string;
  category: "Points" | "Scan" | "Invoice" | "Redemption" | "Account" | "Product";
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: ISODate;
  updatedAt: ISODate;
  notes: TicketNote[];
}

// ---- audit

export type AuditEntityType =
  | "Product"
  | "Plumber"
  | "Retailer"
  | "Scan"
  | "Invoice"
  | "Points"
  | "Reward"
  | "Redemption"
  | "Scheme"
  | "Inventory"
  | "Support"
  | "Settings"
  | "Session";

export interface AuditLog {
  id: ID;
  at: ISODate;
  admin: string;
  action: string;
  entityType: AuditEntityType;
  entityId: ID;
  summary: string;
}

// ---- settings
export interface ProgrammeSettings {
  programmeName: string;
  adminName: string;
  adminEmail: string;
  /** Retailer incentive points earned per ₹100 of eligible approved invoice value (sample rule). */
  retailerPointsPer100: number;
  lowStockThreshold: number;
  notifications: {
    pendingScans: boolean;
    pendingInvoices: boolean;
    redemptions: boolean;
    lowStock: boolean;
  };
}

// ---- database
export interface Database {
  version: number;
  seededAt: string;
  settings: ProgrammeSettings;
  plumbers: Plumber[];
  retailers: Retailer[];
  products: Product[];
  scans: ProductScan[];
  invoices: Invoice[];
  rewards: Reward[];
  redemptions: Redemption[];
  schemes: Scheme[];
  inventory: InventoryItem[];
  ledger: PointsTransaction[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  /** Per-prefix sequence counters for new record identifiers. */
  counters: Record<string, number>;
}
