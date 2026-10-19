/** Domain enumerations. Values match the Postgres enum labels exactly. */
export const USER_ROLES = ['plumber', 'retailer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PLUMBER_VERIFICATION_STATUSES = ['Verified', 'Pending', 'Rejected'] as const;
export type PlumberVerificationStatus = (typeof PLUMBER_VERIFICATION_STATUSES)[number];

export const ACCOUNT_STATUSES = ['Active', 'Suspended', 'Inactive'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const RETAILER_VERIFICATION_STATUSES = ['Approved', 'Pending', 'Rejected'] as const;
export type RetailerVerificationStatus = (typeof RETAILER_VERIFICATION_STATUSES)[number];

export const RETAILER_ACCOUNT_STATUSES = ['Active', 'Suspended'] as const;
export type RetailerAccountStatus = (typeof RETAILER_ACCOUNT_STATUSES)[number];

export const PRODUCT_CATEGORIES = [
  'One-Piece Western WC',
  'Wall-Hung WC',
  'Floor-Mounted EWC',
  'Indian Pan',
  'Half-Pedestal Basin',
  'Pedestal Basin',
  'Wall-Hung Basin',
  'Countertop Basin',
  'Urinal',
  'Cistern',
  'Kitchen Sink',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const SCAN_STATUSES = ['Pending', 'Approved', 'Rejected', 'Flagged'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const POINTS_SOURCES = [
  'Product Scan',
  'Invoice Incentive',
  'Scheme Bonus',
  'Redemption',
  'Redemption Reversal',
  'Manual Adjustment',
  'Opening Balance',
] as const;
export type PointsSource = (typeof POINTS_SOURCES)[number];

export const RELATED_ENTITIES = ['scan', 'invoice', 'redemption', 'scheme'] as const;
export type RelatedEntity = (typeof RELATED_ENTITIES)[number];

export const INVOICE_STATUSES = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'More Information Required'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const REWARD_CATEGORIES = [
  'Shopping Voucher',
  'Gift Card',
  'Air Conditioner',
  'Refrigerator',
  'Television',
  'Home Appliance',
  'Tools & Equipment',
  'Other',
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];

export const REWARD_TYPES = ['Digital', 'Physical'] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REDEMPTION_STATUSES = ['Requested', 'Approved', 'Processing', 'Dispatched', 'Delivered', 'Cancelled', 'Failed'] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export const SCHEME_STATUSES = ['Draft', 'Scheduled', 'Active', 'Completed', 'Paused'] as const;
export type SchemeStatus = (typeof SCHEME_STATUSES)[number];

export const SCHEME_TARGET_TYPES = ['Sales Amount', 'Approved Scans'] as const;
export type SchemeTargetType = (typeof SCHEME_TARGET_TYPES)[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ['Points', 'Scan', 'Invoice', 'Redemption', 'Account', 'Product'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const AUDIT_ENTITIES = [
  'Product',
  'Plumber',
  'Retailer',
  'Scan',
  'Invoice',
  'Points',
  'Reward',
  'Redemption',
  'Scheme',
  'Inventory',
  'Support',
  'Settings',
  'Session',
  'Label',
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export const PRODUCT_UNIT_STATUSES = ['Available', 'Claimed', 'Void'] as const;
export type ProductUnitStatus = (typeof PRODUCT_UNIT_STATUSES)[number];

export const UPLOAD_PURPOSES = ['scan-photo', 'invoice-document', 'product-image', 'profile-photo', 'shop-photo'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export const STOCK_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];
