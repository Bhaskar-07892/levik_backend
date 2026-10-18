/**
 * Seeds the database with the Levik demo dataset (the same records as the offline admin demo).
 *   npm run db:seed            # only when the database is empty
 *   npm run db:seed -- --reset # wipe all programme data first (never in production)
 * Demo admin: admin@levik.demo / LevikDemo@123
 */
import 'dotenv/config';
import type { DataSource, EntityManager } from 'typeorm';
import { AdminDao } from '../../modules/admins/dao/admin.dao.js';
import { AuditLogDao } from '../../modules/audit/dao/audit-log.dao.js';
import { StatusEventDao } from '../../modules/audit/dao/status-event.dao.js';
import { PasswordService } from '../../modules/auth/services/password.service.js';
import { InventoryItemDao } from '../../modules/inventory/dao/inventory-item.dao.js';
import { InvoiceLineDao } from '../../modules/invoices/dao/invoice-line.dao.js';
import { InvoiceDao } from '../../modules/invoices/dao/invoice.dao.js';
import { LabelBatchDao } from '../../modules/labels/dao/label-batch.dao.js';
import { ProductUnitDao } from '../../modules/labels/dao/product-unit.dao.js';
import { generateSerial } from '../../modules/labels/utils/serial-code.js';
import { PlumberDao } from '../../modules/plumbers/dao/plumber.dao.js';
import { PointsTransactionDao } from '../../modules/points/dao/points-transaction.dao.js';
import { ProductDao } from '../../modules/products/dao/product.dao.js';
import { RedemptionDao } from '../../modules/redemptions/dao/redemption.dao.js';
import { RetailerDao } from '../../modules/retailers/dao/retailer.dao.js';
import { RewardDao } from '../../modules/rewards/dao/reward.dao.js';
import { ScanDao } from '../../modules/scans/dao/scan.dao.js';
import { SchemeAwardDao } from '../../modules/schemes/dao/scheme-award.dao.js';
import { SchemeDao } from '../../modules/schemes/dao/scheme.dao.js';
import { SettingsDao } from '../../modules/settings/dao/settings.dao.js';
import { SupportTicketDao } from '../../modules/support/dao/support-ticket.dao.js';
import { TicketNoteDao } from '../../modules/support/dao/ticket-note.dao.js';
import dataSource from '../data-source.js';
import { createSeedDatabase, DEMO_ADMIN } from './demo/demo-data.js';

export const DEMO_PASSWORD = 'LevikDemo@123';

const APP_TABLES = [
  'audit_logs', 'status_events', 'ticket_notes', 'support_tickets', 'inventory', 'scheme_awards', 'schemes',
  'redemptions', 'rewards', 'invoice_lines', 'invoices', 'scans', 'uploads', 'points_ledger', 'product_units',
  'label_batches', 'products', 'plumbers', 'retailers', 'otp_challenges', 'refresh_tokens', 'admins',
];

const d = (iso?: string) => (iso ? new Date(iso) : null);

async function chunkedInsert<T extends object>(manager: EntityManager, entity: new () => T, rows: Partial<T>[], size = 500): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await manager.getRepository(entity).insert(rows.slice(i, i + size) as never);
  }
}

export async function seedDemoData(ds: DataSource, options: { reset: boolean }): Promise<void> {
  if (options.reset) {
    await ds.query(`truncate ${APP_TABLES.join(', ')} restart identity cascade`);
  } else {
    const [{ count }] = await ds.query('select count(*)::int as count from plumbers');
    if (count > 0) throw new Error('Database already has data. Re-run with --reset to replace it.');
  }

  const db = createSeedDatabase(new Date());
  const passwordHash = await new PasswordService().hash(DEMO_PASSWORD);

  await ds.transaction(async (m) => {
    await m.getRepository(SettingsDao).update({ id: true }, {
      programmeName: db.settings.programmeName,
      retailerPointsPer100: db.settings.retailerPointsPer100,
      lowStockThreshold: db.settings.lowStockThreshold,
      notifications: db.settings.notifications,
    });
    await m.getRepository(AdminDao).insert({ name: DEMO_ADMIN.name, email: DEMO_ADMIN.email, passwordHash });

    await chunkedInsert(m, RetailerDao, db.retailers.map((r) => ({
      id: r.id, shopName: r.shopName, ownerName: r.ownerName, mobile: r.mobile, email: r.email ?? null, address: r.address,
      city: r.city, state: r.state, gstin: r.gstin ?? null, distributor: r.distributor, registeredAt: d(r.registeredAt)!,
      verificationStatus: r.verificationStatus, accountStatus: r.accountStatus, monthlyTarget: r.monthlyTarget,
      rejectionReason: r.rejectionReason ?? null,
    })));
    await chunkedInsert(m, PlumberDao, db.plumbers.map((p) => ({
      id: p.id, name: p.name, mobile: p.mobile, email: p.email ?? null, city: p.city, state: p.state, pincode: p.pincode,
      registeredAt: d(p.registeredAt)!, verificationStatus: p.verificationStatus, accountStatus: p.accountStatus,
      aadhaarMasked: p.aadhaarMasked, experienceYears: p.experienceYears, specialization: p.specialization,
      preferredRetailerId: p.preferredRetailerId ?? null, verificationNote: p.verificationNote ?? null,
    })));
    await chunkedInsert(m, ProductDao, db.products.map((p) => ({
      id: p.id, name: p.name, modelCode: p.modelCode, category: p.category, description: p.description,
      dimensions: p.dimensions ?? null, features: p.features, imageUrl: p.image ?? null, sku: p.sku, barcode: p.barcode,
      mrp: p.mrp, plumberPoints: p.plumberPoints, isActive: p.isActive, rewardEligible: p.rewardEligible,
      createdAt: d(p.createdAt)!, updatedAt: d(p.updatedAt)!,
    })));

    // ------------------------------------------------ labels for seeded serials
    // Every seeded scan serial becomes an issued unit so the "genuine label" check reflects real data.
    const unitsBySerial = new Map<string, { productId: string; claimedScanId: string | null; claimedAt: Date | null }>();
    for (const scan of [...db.scans].sort((a, b) => a.scannedAt.localeCompare(b.scannedAt))) {
      const existing = unitsBySerial.get(scan.submittedCode);
      if (!existing) unitsBySerial.set(scan.submittedCode, { productId: scan.productId, claimedScanId: null, claimedAt: null });
      if (scan.status === 'Approved') unitsBySerial.set(scan.submittedCode, { productId: scan.productId, claimedScanId: scan.id, claimedAt: d(scan.reviewedAt) });
    }
    const productsWithUnits = [...new Set([...unitsBySerial.values()].map((u) => u.productId))].sort();
    const batchIds = new Map<string, string>();
    let batchSeq = 1000;
    for (const productId of productsWithUnits) {
      batchSeq += 1;
      const id = `LB-${batchSeq}`;
      batchIds.set(productId, id);
      const quantity = [...unitsBySerial.values()].filter((u) => u.productId === productId).length;
      await m.getRepository(LabelBatchDao).insert({ id, productId, quantity, note: 'Pilot serials issued before QR labels (demo)', createdBy: DEMO_ADMIN.name });
    }
    await chunkedInsert(m, ProductUnitDao, [...unitsBySerial.entries()].map(([serial, u]) => ({
      serial, productId: u.productId, batchId: batchIds.get(u.productId)!,
      status: u.claimedScanId ? 'Claimed' as const : 'Available' as const, claimedScanId: u.claimedScanId, claimedAt: u.claimedAt,
    })));
    // A fresh signed-label batch for model 1012 (PRD-103), ready to print and scan.
    batchSeq += 1;
    const demoBatch = `LB-${batchSeq}`;
    await m.getRepository(LabelBatchDao).insert({ id: demoBatch, productId: 'PRD-103', quantity: 24, note: 'Demo print run', createdBy: DEMO_ADMIN.name });
    await chunkedInsert(m, ProductUnitDao, Array.from({ length: 24 }, () => ({ serial: generateSerial(), productId: 'PRD-103', batchId: demoBatch })));

    // ------------------------------------------------------------ transactions
    await chunkedInsert(m, PointsTransactionDao, [...db.ledger].sort((a, b) => a.id.localeCompare(b.id)).map((t) => ({
      id: t.id, userId: t.userId, userRole: t.userRole, source: t.source, relatedType: t.related?.type ?? null,
      relatedId: t.related?.id ?? null, credit: t.credit, debit: t.debit, createdAt: d(t.createdAt)!, note: t.note, createdBy: t.createdBy,
    })));
    await chunkedInsert(m, ScanDao, db.scans.map((s) => ({
      id: s.id, plumberId: s.plumberId, productId: s.productId, submittedCode: s.submittedCode, productUnitSerial: s.submittedCode,
      labelVerified: false, scannedAt: d(s.scannedAt)!, retailerId: s.retailerId ?? null, invoiceNumber: s.invoiceNumber ?? null,
      siteLocation: s.siteLocation, status: s.status, awardedPoints: s.awardedPoints ?? null, ledgerTxnId: s.ledgerTxnId ?? null,
      rejectionReason: s.rejectionReason ?? null, flagReason: s.flagReason ?? null, reviewedBy: s.reviewedBy ?? null, reviewedAt: d(s.reviewedAt),
    })));
    await chunkedInsert(m, InvoiceDao, db.invoices.map((i) => ({
      id: i.id, invoiceNumber: i.invoiceNumber, retailerId: i.retailerId, buyerName: i.buyerName, invoiceDate: d(i.invoiceDate)!,
      submittedAt: d(i.submittedAt)!, status: i.status, reviewer: i.reviewer ?? null, reviewedAt: d(i.reviewedAt),
      incentivePoints: i.incentivePoints ?? null, ledgerTxnId: i.ledgerTxnId ?? null, rejectionReason: i.rejectionReason ?? null,
      infoRequest: i.infoRequest ?? null,
    })));
    await chunkedInsert(m, InvoiceLineDao, db.invoices.flatMap((i) => i.lineItems.map((l) => ({
      id: l.id, invoiceId: i.id, productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice,
    }))));
    await chunkedInsert(m, RewardDao, db.rewards.map((r) => ({
      id: r.id, name: r.name, category: r.category, type: r.type, description: r.description, pointsRequired: r.pointsRequired,
      stock: r.stock, isActive: r.isActive, eligibleRoles: r.eligibleRoles, createdAt: d(r.createdAt)!, updatedAt: d(r.updatedAt)!,
    })));
    await chunkedInsert(m, RedemptionDao, db.redemptions.map((r) => ({
      id: r.id, userId: r.userId, userRole: r.userRole, rewardId: r.rewardId, pointsCost: r.pointsCost, requestedAt: d(r.requestedAt)!,
      status: r.status, deliveryAddress: r.deliveryAddress, debitTxnId: r.debitTxnId ?? null, reversalTxnId: r.reversalTxnId ?? null,
      fulfilmentRef: r.fulfilmentRef ?? null, voucherCode: r.voucherCode ?? null, courierName: r.courierName ?? null,
      trackingNumber: r.trackingNumber ?? null, cancelReason: r.cancelReason ?? null,
    })));
    await chunkedInsert(m, SchemeDao, db.schemes.map((s) => ({
      id: s.id, name: s.name, description: s.description, role: s.role, startDate: d(s.startDate)!, endDate: d(s.endDate)!,
      eligibleCategories: s.eligibleCategories, targetType: s.targetType, targetValue: s.targetValue, incentivePoints: s.incentivePoints,
      status: s.status, createdAt: d(s.createdAt)!, updatedAt: d(s.updatedAt)!,
    })));
    await chunkedInsert(m, SchemeAwardDao, db.schemes.flatMap((s) => s.awardedUserIds.map((userId) => {
      const txn = db.ledger.find((t) => t.source === 'Scheme Bonus' && t.related?.id === s.id && t.userId === userId);
      return { schemeId: s.id, userId, awardedAt: d(txn?.createdAt ?? s.updatedAt)!, ledgerTxnId: txn?.id ?? null };
    })));
    await chunkedInsert(m, InventoryItemDao, db.inventory.map((i) => ({
      id: i.id, retailerId: i.retailerId, productId: i.productId, quantity: i.quantity, updatedAt: d(i.updatedAt)!, updatedBy: i.updatedBy,
    })));
    await chunkedInsert(m, SupportTicketDao, db.tickets.map((t) => ({
      id: t.id, userId: t.userId, userRole: t.userRole, subject: t.subject, category: t.category, description: t.description,
      priority: t.priority, status: t.status, createdAt: d(t.createdAt)!, updatedAt: d(t.updatedAt)!,
    })));
    await chunkedInsert(m, TicketNoteDao, db.tickets.flatMap((t) => t.notes.map((n) => ({ ticketId: t.id, at: d(n.at)!, byName: n.by, body: n.text }))));

    const events = [
      ...db.scans.flatMap((s) => s.history.map((e) => ({ entityType: 'scan' as const, entityId: s.id, e }))),
      ...db.invoices.flatMap((i) => i.history.map((e) => ({ entityType: 'invoice' as const, entityId: i.id, e }))),
      ...db.redemptions.flatMap((r) => r.history.map((e) => ({ entityType: 'redemption' as const, entityId: r.id, e }))),
    ];
    await chunkedInsert(m, StatusEventDao, events.map(({ entityType, entityId, e }) => ({
      entityType, entityId, at: d(e.at)!, byName: e.by, action: e.action, note: e.note ?? null,
    })));
    await chunkedInsert(m, AuditLogDao, [...db.auditLogs].sort((a, b) => a.id.localeCompare(b.id)).map((a) => ({
      id: a.id, at: d(a.at)!, adminName: a.admin, action: a.action, entityType: a.entityType, entityId: a.entityId, summary: a.summary,
    })));

    // Readable IDs continue after the seeded records.
    const sequences: Record<string, number> = {
      plumber_seq: db.counters.PLM, retailer_seq: db.counters.RTL, product_seq: db.counters.PRD, scan_seq: db.counters.SCN,
      invoice_seq: db.counters.INV, reward_seq: db.counters.RWD, redemption_seq: db.counters.RDM, scheme_seq: db.counters.SCH,
      inventory_seq: db.counters.STK, ticket_seq: db.counters.TKT, txn_seq: db.counters.TXN, audit_seq: db.counters.AUD,
      label_batch_seq: batchSeq,
    };
    for (const [seq, value] of Object.entries(sequences)) await m.query(`select setval($1, $2)`, [seq, value]);
  });
}

// Run directly: tsx src/database/seeds/seed.ts [--reset]
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  const reset = process.argv.includes('--reset');
  if (reset && process.env.NODE_ENV === 'production') throw new Error('Refusing to reset a production database.');
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    await seedDemoData(dataSource, { reset });
    console.log(`Seeded demo data. Admin login: ${DEMO_ADMIN.email} / ${DEMO_PASSWORD}`);
  } finally {
    await dataSource.destroy();
  }
}
