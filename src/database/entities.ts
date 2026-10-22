import { AdminDao } from '../modules/admins/dao/admin.dao.js';
import { AuditLogDao } from '../modules/audit/dao/audit-log.dao.js';
import { StatusEventDao } from '../modules/audit/dao/status-event.dao.js';
import { OtpChallengeDao } from '../modules/auth/dao/otp-challenge.dao.js';
import { RefreshTokenDao } from '../modules/auth/dao/refresh-token.dao.js';
import { InventoryItemDao } from '../modules/inventory/dao/inventory-item.dao.js';
import { StockMovementDao } from '../modules/inventory/dao/stock-movement.dao.js';
import { OrderLineDao } from '../modules/orders/dao/order-line.dao.js';
import { OrderDao } from '../modules/orders/dao/order.dao.js';
import { BillLineDao } from '../modules/bills/dao/bill-line.dao.js';
import { CustomerBillDao } from '../modules/bills/dao/customer-bill.dao.js';
import { InvoiceLineDao } from '../modules/invoices/dao/invoice-line.dao.js';
import { InvoiceDao } from '../modules/invoices/dao/invoice.dao.js';
import { LabelBatchDao } from '../modules/labels/dao/label-batch.dao.js';
import { ProductUnitDao } from '../modules/labels/dao/product-unit.dao.js';
import { PlumberDao } from '../modules/plumbers/dao/plumber.dao.js';
import { PointsBalanceDao } from '../modules/points/dao/points-balance.dao.js';
import { PointsTransactionDao } from '../modules/points/dao/points-transaction.dao.js';
import { ProductDao } from '../modules/products/dao/product.dao.js';
import { RedemptionDao } from '../modules/redemptions/dao/redemption.dao.js';
import { RetailerDao } from '../modules/retailers/dao/retailer.dao.js';
import { RewardDao } from '../modules/rewards/dao/reward.dao.js';
import { ScanDao } from '../modules/scans/dao/scan.dao.js';
import { SchemeAwardDao } from '../modules/schemes/dao/scheme-award.dao.js';
import { SchemeDao } from '../modules/schemes/dao/scheme.dao.js';
import { SettingsDao } from '../modules/settings/dao/settings.dao.js';
import { SupportTicketDao } from '../modules/support/dao/support-ticket.dao.js';
import { TicketNoteDao } from '../modules/support/dao/ticket-note.dao.js';
import { UploadDao } from '../modules/uploads/dao/upload.dao.js';

/** Explicit entity registry (no filesystem globs, which are fragile under ESM). */
export const ENTITIES = [
  AdminDao,
  AuditLogDao,
  StatusEventDao,
  OtpChallengeDao,
  RefreshTokenDao,
  InventoryItemDao,
  StockMovementDao,
  OrderDao,
  OrderLineDao,
  CustomerBillDao,
  BillLineDao,
  InvoiceDao,
  InvoiceLineDao,
  LabelBatchDao,
  ProductUnitDao,
  PlumberDao,
  PointsBalanceDao,
  PointsTransactionDao,
  ProductDao,
  RedemptionDao,
  RetailerDao,
  RewardDao,
  ScanDao,
  SchemeAwardDao,
  SchemeDao,
  SettingsDao,
  SupportTicketDao,
  TicketNoteDao,
  UploadDao,
];
