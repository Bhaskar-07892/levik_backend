import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { SYSTEM_ACTOR, type ActorBo } from '../../../common/bo/actor.bo.js';
import { failedBlocking, type CheckBo } from '../../../common/bo/check.bo.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { InvoicesService } from '../../invoices/services/invoices.service.js';
import { LabelsService } from '../../labels/services/labels.service.js';
import { PlumbersService } from '../../plumbers/services/plumbers.service.js';
import { PointsService } from '../../points/services/points.service.js';
import { RetailersService } from '../../retailers/services/retailers.service.js';
import { SchemeAwardsService } from '../../schemes/services/scheme-awards.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { UploadsService } from '../../uploads/services/uploads.service.js';
import { BillsService } from '../../bills/services/bills.service.js';
import { StockService } from '../../inventory/services/stock.service.js';
import type { ConfirmSaleBo, ConfirmSaleResultBo, RetailerSaleBo, ScanApprovalBo, ScanBo, ScanQueryBo, ScanReviewBo, SubmitScanBo } from '../bo/scan.bo.js';
import { ScanMapper } from '../mappers/scan.mapper.js';
import { ScansRepository } from '../repositories/scans.repository.js';

@Injectable()
export class ScansService {
  constructor(
    private readonly scans: ScansRepository,
    private readonly labels: LabelsService,
    private readonly plumbers: PlumbersService,
    private readonly retailers: RetailersService,
    private readonly invoices: InvoicesService,
    private readonly points: PointsService,
    private readonly schemeAwards: SchemeAwardsService,
    private readonly settings: SettingsService,
    private readonly uploads: UploadsService,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
    private readonly stock: StockService,
    private readonly bills: BillsService,
  ) {}

  // ------------------------------------------------------------------ reads
  async list(query: ScanQueryBo): Promise<Page<ScanBo>> {
    const page = await this.scans.findPage(query);
    return { ...page, items: page.items.map(ScanMapper.toBo) };
  }

  statusCounts(plumberId?: string): Promise<Record<string, number>> {
    return this.scans.statusCounts(plumberId);
  }

  async get(id: string, ownerPlumberId?: string, manager?: EntityManager): Promise<ScanBo> {
    const scan = await this.scans.findWithRelations(id, manager);
    if (!scan || (ownerPlumberId && scan.plumberId !== ownerPlumberId)) throw AppException.notFound('Scan', id);
    return ScanMapper.toBo(scan);
  }

  /** Everything the verification screen needs, using the same checks approval enforces. */
  async review(id: string): Promise<ScanReviewBo> {
    const scan = await this.get(id);
    const [plumberPoints, linkedInvoice, checks, timeline] = await Promise.all([
      this.points.balance(scan.plumber.id),
      scan.retailer && scan.invoiceNumber ? this.invoices.findLinked(scan.retailer.id, scan.invoiceNumber) : Promise.resolve(null),
      this.checks(scan),
      this.audit.timeline('scan', id),
    ]);
    const open = scan.status === 'Pending' || scan.status === 'Flagged';
    const schemeImpacts = open
      ? await this.schemeAwards.impacts(scan.plumber.id, 'plumber', (scheme) =>
          scheme.eligibleCategories.includes(scan.product.category) && scan.scannedAt >= scheme.startDate && scan.scannedAt <= scheme.endDate ? 1 : 0,
        )
      : [];
    const pointsOnApproval = scan.product.rewardEligible ? scan.product.plumberPoints : 0;
    return {
      scan,
      plumberPoints,
      linkedInvoice,
      checks,
      pointsCalculation: {
        basePoints: scan.product.plumberPoints,
        rewardEligible: scan.product.rewardEligible,
        pointsOnApproval: scan.awardedPoints ?? pointsOnApproval,
        schemeBonusUnlocked: schemeImpacts.filter((i) => i.willAward).reduce((s, i) => s + i.incentivePoints, 0),
      },
      schemeImpacts,
      timeline,
    };
  }

  // ----------------------------------------------------------------- admin
  /** Credits points exactly once, claims the label unit, and pays any scheme bonus unlocked. */
  approve(actor: ActorBo, id: string, note?: string): Promise<ScanApprovalBo> {
    return this.tx.run((manager) => this.approveIn(manager, actor, id, note));
  }

  /** Approval inside the caller's transaction (also used when a retailer's confirmation auto-approves). */
  private async approveIn(manager: EntityManager, actor: ActorBo, id: string, note?: string): Promise<ScanApprovalBo> {
    const locked = await this.lockOrFail(id, manager);
    if (locked.status === 'Approved' || locked.ledgerTxnId) throw AppException.alreadyProcessed('This scan is already approved and credited.');
    if (locked.status === 'Rejected') throw AppException.invalidState('Rejected scans cannot be approved.');

    const scan = await this.get(id, undefined, manager);
    const failed = failedBlocking(await this.checks(scan, manager));
    if (failed.length) throw AppException.rule(ErrorCode.CHECKS_FAILED, `Cannot approve: ${failed.map((c) => c.label).join(', ')}.`, failed);

    if (scan.productUnitSerial) await this.labels.claim(scan.productUnitSerial, scan.id, manager);
    await this.points.lockParticipant(manager, scan.plumber.id);
    const points = scan.product.rewardEligible ? scan.product.plumberPoints : 0;
    const ledgerTxnId =
      points > 0
        ? await this.points.post(manager, actor, {
            userId: scan.plumber.id,
            role: 'plumber',
            source: 'Product Scan',
            amount: points,
            note: `Approved scan of model ${scan.product.modelCode}`,
            related: { type: 'scan', id },
          })
        : null;
    await this.scans.update(
      id,
      { status: 'Approved', awardedPoints: points, ledgerTxnId, flagReason: null, reviewedBy: actor.name, reviewedAt: new Date() },
      manager,
    );
    const eventNote = [`${points} points credited`, note?.trim()].filter(Boolean).join(' · ');
    await this.audit.recordEvent(actor, { entityType: 'scan', entityId: id, action: 'Approved', note: eventNote }, manager);
    await this.audit.record(actor, { action: 'Scan approved', entityType: 'Scan', entityId: id, summary: `${points} points credited to ${scan.plumber.id}` }, manager);
    const schemeAwards = await this.schemeAwards.evaluate(manager, actor, scan.plumber.id, 'plumber');
    return { points, ledgerTxnId, schemeAwards };
  }

  async reject(actor: ActorBo, id: string, reason: string): Promise<ScanBo> {
    await this.tx.run(async (manager) => {
      const scan = await this.lockOrFail(id, manager);
      if (scan.status === 'Approved') throw AppException.invalidState('Approved scans cannot be rejected; use a points adjustment instead.');
      if (scan.status === 'Rejected') throw AppException.alreadyProcessed('This scan is already rejected.');
      await this.scans.update(id, { status: 'Rejected', rejectionReason: reason, reviewedBy: actor.name, reviewedAt: new Date() }, manager);
      await this.audit.recordEvent(actor, { entityType: 'scan', entityId: id, action: 'Rejected', note: reason }, manager);
      await this.audit.record(actor, { action: 'Scan rejected', entityType: 'Scan', entityId: id, summary: reason }, manager);
    });
    return this.get(id);
  }

  async flag(actor: ActorBo, id: string, reason: string): Promise<ScanBo> {
    await this.tx.run(async (manager) => {
      const scan = await this.lockOrFail(id, manager);
      if (scan.status !== 'Pending') throw AppException.invalidState('Only pending scans can be flagged.');
      await this.scans.update(id, { status: 'Flagged', flagReason: reason, reviewedBy: actor.name, reviewedAt: new Date() }, manager);
      await this.audit.recordEvent(actor, { entityType: 'scan', entityId: id, action: 'Flagged for investigation', note: reason }, manager);
      await this.audit.record(actor, { action: 'Scan flagged', entityType: 'Scan', entityId: id, summary: reason }, manager);
    });
    return this.get(id);
  }

  // ------------------------------------------------------------ plumber app
  /** A scan is a claim, not proof: it waits for admin verification before any points move. */
  async submit(plumberId: string, input: SubmitScanBo): Promise<ScanBo> {
    const plumber = await this.plumbers.requireActive(plumberId);
    const resolved = await this.labels.resolve(input.code);
    const unit = resolved.unit;
    if (!unit) throw AppException.rule(ErrorCode.INVALID_LABEL, 'This serial is not registered to any Levik product.');
    if (unit.status === 'Void') throw AppException.rule(ErrorCode.INVALID_LABEL, 'This label has been cancelled by Levik.');
    if (unit.status === 'Claimed') throw AppException.rule(ErrorCode.ALREADY_PROCESSED, 'Points for this product have already been claimed.');

    const id = await this.tx.run(async (manager) => {
      // Serialise submissions per plumber so the daily limit and duplicate checks are race-free.
      await this.tx.lock(manager, `scan-submit:${plumberId}`);
      if (await this.scans.findActiveBySerial(unit.serial, manager)) {
        throw AppException.rule(ErrorCode.DUPLICATE, 'This product has already been scanned and is awaiting verification.');
      }
      const { maxDailyScansPerPlumber } = await this.settings.get();
      if ((await this.scans.countSince(plumberId, new Date(Date.now() - 86_400_000), manager)) >= maxDailyScansPerPlumber) {
        throw AppException.rule(ErrorCode.LIMIT_REACHED, `Daily scan limit reached (${maxDailyScansPerPlumber} per day). Try again tomorrow.`);
      }
      if (input.retailerId) {
        const retailer = await this.retailers.get(input.retailerId, manager);
        if (retailer.verificationStatus !== 'Approved' || retailer.accountStatus !== 'Active') {
          throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Choose a store from the Levik store list.');
        }
      }
      if (input.photoKey) await this.uploads.assertOwned(input.photoKey, plumberId, 'scan-photo', manager);

      const scanId = await this.scans.insert(
        {
          plumberId,
          productId: unit.productId,
          submittedCode: unit.serial,
          productUnitSerial: unit.serial,
          labelVerified: resolved.signatureValid === true,
          retailerId: input.retailerId,
          invoiceNumber: input.invoiceNumber,
          siteLocation: input.siteLocation,
          photoKey: input.photoKey,
        },
        manager,
      );
      await this.audit.recordEvent({ id: plumberId, name: plumber.name }, { entityType: 'scan', entityId: scanId, action: 'Scan submitted from plumber app' }, manager);
      return scanId;
    });
    return this.get(id);
  }

  // ----------------------------------------------------------- retailer app
  /** Plumber scans that name this retailer as the seller ("Pending" = waiting for the retailer). */
  async retailerSales(retailerId: string, query: { decision?: 'Pending' | 'Confirmed' | 'Declined'; page: number; pageSize: number }): Promise<Page<RetailerSaleBo>> {
    const page = await this.scans.findRetailerSales(retailerId, query.decision, query.page, query.pageSize);
    const { retailerPointsPer100: rate } = await this.settings.get();
    const bills = await this.scans.billsForScans(page.items.map((s) => s.id));
    return {
      ...page,
      items: page.items.map((dao) => {
        const scan = ScanMapper.toBo(dao);
        return { scan, incentivePoints: scan.retailerPoints ?? this.retailerIncentive(scan, rate), bill: bills.get(scan.id) ?? null };
      }),
    };
  }

  /**
   * The retailer confirms they sold this unit to the plumber. In one transaction: one unit leaves their
   * stock (refused if they have none), their retail incentive is credited, an optional bill is issued to
   * the buyer, and the plumber's scan is approved and credited when every blocking check passes.
   */
  async confirmSale(retailerId: string, scanId: string, input: ConfirmSaleBo): Promise<ConfirmSaleResultBo> {
    const retailer = await this.retailers.requireApprovedActive(retailerId);
    const actor = { id: retailerId, name: retailer.shopName };
    return this.tx.run(async (manager) => {
      const locked = await this.lockOrFail(scanId, manager);
      if (locked.retailerId !== retailerId) throw AppException.notFound('Sale', scanId);
      if (locked.retailerDecision) throw AppException.alreadyProcessed(`You already ${locked.retailerDecision.toLowerCase()} this sale.`);
      if (locked.status === 'Rejected') throw AppException.invalidState('Levik rejected this scan, so the sale cannot be confirmed.');
      const scan = await this.get(scanId, undefined, manager);

      await this.stock.move(manager, actor, {
        retailerId,
        productId: scan.product.id,
        delta: -1,
        reason: 'Plumber sale',
        related: { type: 'scan', id: scanId },
        note: `${scan.plumber.name} · ${scan.submittedCode}`,
        productName: scan.product.name,
      });

      const { retailerPointsPer100: rate } = await this.settings.get(manager);
      const retailerPoints = this.retailerIncentive(scan, rate);
      let retailerLedgerTxnId: string | null = null;
      if (retailerPoints > 0) {
        await this.points.lockParticipant(manager, retailerId);
        retailerLedgerTxnId = await this.points.post(manager, actor, {
          userId: retailerId,
          role: 'retailer',
          source: 'Retail Sale',
          amount: retailerPoints,
          note: `Sold ${scan.product.modelCode} to ${scan.plumber.name}`,
          related: { type: 'scan', id: scanId },
        });
      }
      await this.scans.update(scanId, { retailerDecision: 'Confirmed', retailerDecidedAt: new Date(), retailerPoints, retailerLedgerTxnId }, manager);
      await this.audit.recordEvent(actor, { entityType: 'scan', entityId: scanId, action: 'Sale confirmed by retailer', note: `${retailerPoints} incentive points to ${retailer.shopName}` }, manager);

      const billId = input.bill
        ? await this.bills.createIn(
            manager,
            actor,
            retailerId,
            { customerName: input.bill.customerName, customerMobile: input.bill.customerMobile, lines: [{ productId: scan.product.id, quantity: 1, unitPrice: input.bill.unitPrice }] },
            { deductStock: false, scanId },
          )
        : null;

      // The retailer's confirmation is the proof of sale: approve now unless a blocking check still fails.
      const failed = failedBlocking(await this.checks(await this.get(scanId, undefined, manager), manager));
      const autoApproved = locked.status === 'Pending' && failed.length === 0;
      if (autoApproved) await this.approveIn(manager, { id: SYSTEM_ACTOR.id, name: `${retailer.shopName} (sale confirmed)` }, scanId, 'Approved automatically: retailer confirmed the sale');
      return { retailerPoints, billId, autoApproved, pendingReasons: autoApproved ? [] : failed.map((c) => c.label) };
    });
  }

  /** The retailer says this sale did not happen: no stock or points move, and Levik reviews the scan. */
  async declineSale(retailerId: string, scanId: string, reason: string): Promise<void> {
    const retailer = await this.retailers.get(retailerId);
    const actor = { id: retailerId, name: retailer.shopName };
    await this.tx.run(async (manager) => {
      const locked = await this.lockOrFail(scanId, manager);
      if (locked.retailerId !== retailerId) throw AppException.notFound('Sale', scanId);
      if (locked.retailerDecision) throw AppException.alreadyProcessed(`You already ${locked.retailerDecision.toLowerCase()} this sale.`);
      const flag = locked.status === 'Pending' ? { status: 'Flagged' as const, flagReason: `Retailer declined the sale: ${reason}` } : {};
      await this.scans.update(scanId, { retailerDecision: 'Declined', retailerDecidedAt: new Date(), retailerNote: reason, ...flag }, manager);
      await this.audit.recordEvent(actor, { entityType: 'scan', entityId: scanId, action: 'Sale declined by retailer', note: reason }, manager);
    });
  }

  /** Same rate as invoice incentives: list price ÷ 100 × retailer points per ₹100. */
  private retailerIncentive(scan: ScanBo, rate: number): number {
    return scan.product.rewardEligible && scan.product.isActive ? Math.floor((scan.product.mrp / 100) * rate) : 0;
  }

  // ----------------------------------------------------------------- rules
  /** Deterministic verification rules. Blocking checks must all pass before approval. */
  private async checks(scan: ScanBo, manager?: EntityManager): Promise<CheckBo[]> {
    const [unitResolution, duplicate, linkedInvoice] = await Promise.all([
      this.labels.resolve(scan.submittedCode, manager).catch(() => null),
      this.scans.findApprovedBySerial(scan.submittedCode, scan.id, manager),
      scan.retailer && scan.invoiceNumber ? this.invoices.findLinked(scan.retailer.id, scan.invoiceNumber, manager) : Promise.resolve(null),
    ]);
    const unit = unitResolution?.unit ?? null;
    const unitOk = !!unit && unit.productId === scan.product.id && (unit.status === 'Available' || unit.claimedScanId === scan.id);
    const invoiceHasProduct = linkedInvoice?.productIds.includes(scan.product.id) ?? false;

    return [
      {
        label: 'Genuine Levik label',
        passed: unitOk,
        blocking: true,
        detail: !unit
          ? 'Serial was never issued by Levik'
          : unit.productId !== scan.product.id
            ? `Label belongs to ${unit.modelCode}, not ${scan.product.modelCode}`
            : unit.status === 'Void'
              ? `Label was voided${unit.voidReason ? `: ${unit.voidReason}` : ''}`
              : unit.status === 'Claimed' && unit.claimedScanId !== scan.id
                ? `Label already claimed on ${unit.claimedScanId}`
                : `Issued in batch ${unit.batchId}`,
      },
      {
        label: 'Product code recognised',
        passed: scan.product.isActive,
        blocking: true,
        detail: `${scan.product.name} (${scan.product.isActive ? 'active' : 'inactive'})`,
      },
      {
        label: 'Product is reward-eligible',
        passed: scan.product.rewardEligible,
        blocking: true,
        detail: scan.product.rewardEligible ? `${scan.product.plumberPoints} points per approved scan` : 'Product does not earn scan points',
      },
      { label: 'Plumber KYC verified', passed: scan.plumber.verificationStatus === 'Verified', blocking: true, detail: `KYC status: ${scan.plumber.verificationStatus}` },
      { label: 'Plumber account active', passed: scan.plumber.accountStatus === 'Active', blocking: true, detail: `Account status: ${scan.plumber.accountStatus}` },
      {
        label: 'Proof of sale from an approved retailer',
        passed: scan.retailer?.verificationStatus === 'Approved',
        blocking: true,
        detail: scan.retailer
          ? `${scan.retailer.shopName}${scan.invoiceNumber ? ` · invoice ${scan.invoiceNumber}` : ''}`
          : 'No retailer or invoice reference supplied',
      },
      {
        label: 'Retailer confirmed the sale',
        passed: scan.retailerDecision === 'Confirmed',
        blocking: false,
        detail: !scan.retailer
          ? 'No retailer selected'
          : scan.retailerDecision === 'Confirmed'
            ? `${scan.retailer.shopName} confirmed${scan.retailerDecidedAt ? ` on ${scan.retailerDecidedAt.toISOString().slice(0, 10)}` : ''}`
            : scan.retailerDecision === 'Declined'
              ? `${scan.retailer.shopName} declined: ${scan.retailerNote ?? 'no reason given'}`
              : `Waiting for ${scan.retailer.shopName} to confirm`,
      },
      {
        label: 'Serial code not previously credited',
        passed: !duplicate,
        blocking: true,
        detail: duplicate ? `Already credited on ${duplicate.id}` : 'No approved scan uses this serial',
      },
      {
        label: 'Linked invoice lists this product',
        passed: !scan.invoiceNumber || invoiceHasProduct,
        blocking: false,
        detail: !scan.invoiceNumber
          ? 'No invoice number supplied (retailer reference only)'
          : !linkedInvoice
            ? 'Invoice number not found in submitted invoices'
            : invoiceHasProduct
              ? `${linkedInvoice.id} includes this model`
              : `${linkedInvoice.id} does not include this model`,
      },
      {
        label: 'QR signature verified',
        passed: scan.labelVerified,
        blocking: false,
        detail: scan.labelVerified ? 'Scanned with the camera; signature matches' : 'Serial was typed manually or scanned before signing',
      },
    ];
  }

  private async lockOrFail(id: string, manager: EntityManager) {
    const scan = await this.scans.findByIdForUpdate(id, manager);
    if (!scan) throw AppException.notFound('Scan', id);
    return scan;
  }
}
