import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { failedBlocking, type CheckBo } from '../../../common/bo/check.bo.js';
import type { InvoiceStatus } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { PointsService } from '../../points/services/points.service.js';
import { ProductsRepository } from '../../products/repositories/products.repository.js';
import { RetailersService } from '../../retailers/services/retailers.service.js';
import { SchemeAwardsService } from '../../schemes/services/scheme-awards.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { UploadsService } from '../../uploads/services/uploads.service.js';
import type {
  InvoiceApprovalBo,
  InvoiceBo,
  InvoiceIncentiveBo,
  InvoiceQueryBo,
  InvoiceReviewBo,
  InvoiceTotalsBo,
  InvoiceWithLinesBo,
  LinkedInvoiceBo,
  SubmitInvoiceBo,
} from '../bo/invoice.bo.js';
import { InvoiceMapper } from '../mappers/invoice.mapper.js';
import { InvoicesRepository } from '../repositories/invoices.repository.js';

const GST_RATE = 0.18;
const MAX_INVOICE_AGE_DAYS = 90;
const OPEN_STATUSES: InvoiceStatus[] = ['Submitted', 'Under Review', 'More Information Required'];

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoices: InvoicesRepository,
    private readonly products: ProductsRepository,
    private readonly retailers: RetailersService,
    private readonly points: PointsService,
    private readonly schemeAwards: SchemeAwardsService,
    private readonly settings: SettingsService,
    private readonly uploads: UploadsService,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------ reads
  async list(query: InvoiceQueryBo): Promise<Page<InvoiceBo>> {
    const page = await this.invoices.findPage(query);
    return { ...page, items: page.items.map(({ invoice, amount }) => InvoiceMapper.toBo(invoice, amount)) };
  }

  statusCounts(retailerId?: string): Promise<Record<string, number>> {
    return this.invoices.statusCounts(retailerId);
  }

  async get(id: string, ownerRetailerId?: string, manager?: EntityManager): Promise<InvoiceWithLinesBo> {
    const invoice = await this.invoices.findWithLines(id, manager);
    if (!invoice || (ownerRetailerId && invoice.retailerId !== ownerRetailerId)) throw AppException.notFound('Invoice', id);
    return InvoiceMapper.withLinesToBo(invoice);
  }

  /** Everything the admin review screen needs. */
  async review(id: string): Promise<InvoiceReviewBo> {
    const invoice = await this.get(id);
    const [incentive, checks, timeline] = await Promise.all([this.incentive(invoice), this.checks(invoice), this.audit.timeline('invoice', id)]);
    const schemeImpacts = OPEN_STATUSES.includes(invoice.status) ? await this.schemeImpacts(invoice) : [];
    return { invoice, totals: this.totals(invoice), incentive, checks, schemeImpacts, timeline };
  }

  async incentiveFor(id: string, ownerRetailerId?: string): Promise<InvoiceIncentiveBo> {
    return this.incentive(await this.get(id, ownerRetailerId));
  }

  /** Used by scan verification: is there an invoice with this number at this shop, and which models does it list? */
  async findLinked(retailerId: string, invoiceNumber: string, manager?: EntityManager): Promise<LinkedInvoiceBo | null> {
    return this.invoices.findLinked(retailerId, invoiceNumber, manager);
  }

  // --------------------------------------------------------------- admin
  async startReview(actor: ActorBo, id: string): Promise<InvoiceBo> {
    await this.tx.run(async (manager) => {
      const invoice = await this.lockOrFail(id, manager);
      if (invoice.status !== 'Submitted' && invoice.status !== 'More Information Required') {
        throw AppException.invalidState('Only submitted invoices can be moved to review.');
      }
      await this.invoices.update(id, { status: 'Under Review', reviewer: actor.name }, manager);
      await this.audit.recordEvent(actor, { entityType: 'invoice', entityId: id, action: 'Moved to review' }, manager);
      await this.audit.record(actor, { action: 'Invoice review started', entityType: 'Invoice', entityId: id, summary: `${invoice.invoiceNumber} assigned to ${actor.name}` }, manager);
    });
    return this.get(id);
  }

  /** Credits the incentive exactly once and pays any scheme bonus the approval unlocks. */
  approve(actor: ActorBo, id: string): Promise<InvoiceApprovalBo> {
    return this.tx.run(async (manager) => {
      const locked = await this.lockOrFail(id, manager);
      if (locked.status === 'Approved' || locked.ledgerTxnId) throw AppException.alreadyProcessed('This invoice is already approved and credited.');
      if (locked.status === 'Rejected') throw AppException.invalidState('Rejected invoices cannot be approved.');

      const invoice = await this.get(id, undefined, manager);
      const failed = failedBlocking(await this.checks(invoice, manager));
      if (failed.length) throw AppException.rule(ErrorCode.CHECKS_FAILED, `Cannot approve: ${failed.map((c) => c.label).join(', ')}.`, failed);

      await this.points.lockParticipant(manager, invoice.retailerId);
      const incentive = await this.incentive(invoice, manager);
      const ledgerTxnId =
        incentive.points > 0
          ? await this.points.post(manager, actor, {
              userId: invoice.retailerId,
              role: 'retailer',
              source: 'Invoice Incentive',
              amount: incentive.points,
              note: `Incentive for invoice ${invoice.invoiceNumber}`,
              related: { type: 'invoice', id },
            })
          : null;
      await this.invoices.update(
        id,
        { status: 'Approved', reviewer: actor.name, reviewedAt: new Date(), incentivePoints: incentive.points, ledgerTxnId, infoRequest: null },
        manager,
      );
      await this.audit.recordEvent(actor, { entityType: 'invoice', entityId: id, action: 'Approved', note: `${incentive.points} incentive points credited` }, manager);
      await this.audit.record(actor, { action: 'Invoice approved', entityType: 'Invoice', entityId: id, summary: `${incentive.points} points credited to ${invoice.retailerId}` }, manager);
      const schemeAwards = await this.schemeAwards.evaluate(manager, actor, invoice.retailerId, 'retailer');
      return { points: incentive.points, ledgerTxnId, schemeAwards };
    });
  }

  async reject(actor: ActorBo, id: string, reason: string): Promise<InvoiceBo> {
    await this.tx.run(async (manager) => {
      const invoice = await this.lockOrFail(id, manager);
      if (invoice.status === 'Approved') throw AppException.invalidState('Approved invoices cannot be rejected.');
      if (invoice.status === 'Rejected') throw AppException.alreadyProcessed('This invoice is already rejected.');
      await this.invoices.update(id, { status: 'Rejected', rejectionReason: reason, reviewer: actor.name, reviewedAt: new Date() }, manager);
      await this.audit.recordEvent(actor, { entityType: 'invoice', entityId: id, action: 'Rejected', note: reason }, manager);
      await this.audit.record(actor, { action: 'Invoice rejected', entityType: 'Invoice', entityId: id, summary: reason }, manager);
    });
    return this.get(id);
  }

  async requestInfo(actor: ActorBo, id: string, message: string): Promise<InvoiceBo> {
    await this.tx.run(async (manager) => {
      const invoice = await this.lockOrFail(id, manager);
      if (invoice.status === 'Approved' || invoice.status === 'Rejected') throw AppException.invalidState('This invoice is already closed.');
      await this.invoices.update(id, { status: 'More Information Required', infoRequest: message, reviewer: actor.name, reviewedAt: new Date() }, manager);
      await this.audit.recordEvent(actor, { entityType: 'invoice', entityId: id, action: 'More information requested', note: message }, manager);
      await this.audit.record(actor, { action: 'Invoice info requested', entityType: 'Invoice', entityId: id, summary: message }, manager);
    });
    return this.get(id);
  }

  // ------------------------------------------------------------ retailer app
  async submit(retailerId: string, input: SubmitInvoiceBo): Promise<InvoiceWithLinesBo> {
    const ageDays = (Date.now() - input.invoiceDate.getTime()) / 86_400_000;
    if (ageDays < -1 || ageDays > MAX_INVOICE_AGE_DAYS) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, `Invoice date must be within the last ${MAX_INVOICE_AGE_DAYS} days.`);
    }
    const id = await this.tx.run(async (manager) => {
      const retailer = await this.retailers.requireApprovedActive(retailerId, manager);
      if (input.documentKey) await this.uploads.assertOwned(input.documentKey, retailerId, 'invoice-document', manager);
      const products = await this.products.findByIds(input.lines.map((l) => l.productId), manager);
      const lines = input.lines.map((line) => {
        const product = products.get(line.productId);
        if (!product) throw AppException.rule(ErrorCode.VALIDATION_FAILED, `Unknown product ${line.productId}.`);
        return { productId: line.productId, quantity: line.quantity, unitPrice: line.unitPrice ?? product.mrp };
      });
      const invoiceId = await this.invoices.insertWithLines(
        { invoiceNumber: input.invoiceNumber, retailerId: retailer.id, buyerName: input.buyerName, invoiceDate: input.invoiceDate, documentKey: input.documentKey },
        lines,
        manager,
      );
      await this.audit.recordEvent({ id: retailerId, name: retailer.shopName }, { entityType: 'invoice', entityId: invoiceId, action: 'Invoice submitted from retailer app' }, manager);
      return invoiceId;
    });
    return this.get(id);
  }

  async resubmit(retailerId: string, id: string, documentKey?: string): Promise<InvoiceWithLinesBo> {
    await this.tx.run(async (manager) => {
      const invoice = await this.lockOrFail(id, manager);
      if (invoice.retailerId !== retailerId) throw AppException.notFound('Invoice', id);
      if (invoice.status !== 'More Information Required') throw AppException.invalidState('Only invoices waiting for more information can be resubmitted.');
      if (documentKey) await this.uploads.assertOwned(documentKey, retailerId, 'invoice-document', manager);
      await this.invoices.update(id, { status: 'Submitted', ...(documentKey ? { documentKey } : {}) }, manager);
      await this.audit.recordEvent({ id: retailerId, name: retailerId }, { entityType: 'invoice', entityId: id, action: 'Resubmitted from retailer app' }, manager);
    });
    return this.get(id, retailerId);
  }

  // --------------------------------------------------------------- rules
  /** Sample rule: N points per ₹100 of pre-GST value on active, reward-eligible products. */
  private async incentive(invoice: InvoiceWithLinesBo, manager?: EntityManager): Promise<InvoiceIncentiveBo> {
    const { retailerPointsPer100: rate } = await this.settings.get(manager);
    const products = await this.products.findByIds(invoice.lines.map((l) => l.productId), manager);
    const lines = invoice.lines.map((line) => {
      const product = products.get(line.productId);
      const reason = !product ? ('Unknown product' as const) : !product.rewardEligible ? ('Not reward-eligible' as const) : !product.isActive ? ('Product inactive' as const) : null;
      const eligible = reason === null;
      return {
        lineId: line.id,
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        value: line.value,
        eligible,
        reason,
        points: eligible ? Math.floor((line.value / 100) * rate) : 0,
      };
    });
    const eligibleValue = lines.filter((l) => l.eligible).reduce((sum, l) => sum + l.value, 0);
    return { rate, lines, eligibleValue, points: Math.floor((eligibleValue / 100) * rate) };
  }

  private async checks(invoice: InvoiceWithLinesBo, manager?: EntityManager): Promise<CheckBo[]> {
    const [retailer, duplicate, incentive] = await Promise.all([
      this.retailers.get(invoice.retailerId, manager),
      this.invoices.findDuplicate(invoice.retailerId, invoice.invoiceNumber, invoice.id, manager),
      this.incentive(invoice, manager),
    ]);
    const eligibleLines = incentive.lines.filter((l) => l.eligible).length;
    return [
      { label: 'Retailer approved', passed: retailer.verificationStatus === 'Approved', blocking: true, detail: `Application status: ${retailer.verificationStatus}` },
      { label: 'Retailer account active', passed: retailer.accountStatus === 'Active', blocking: true, detail: `Account status: ${retailer.accountStatus}` },
      {
        label: 'Invoice number is unique',
        passed: !duplicate,
        blocking: true,
        detail: duplicate ? `Same number already used on ${duplicate.id} (${duplicate.status})` : 'No other active invoice uses this number',
      },
      { label: 'Contains eligible products', passed: eligibleLines > 0, blocking: false, detail: `${eligibleLines} of ${incentive.lines.length} lines earn incentive` },
    ];
  }

  private async schemeImpacts(invoice: InvoiceWithLinesBo) {
    return this.schemeAwards.impacts(invoice.retailerId, 'retailer', (scheme) => {
      if (invoice.invoiceDate < scheme.startDate || invoice.invoiceDate > scheme.endDate) return 0;
      return invoice.lines.filter((l) => l.category && scheme.eligibleCategories.includes(l.category)).reduce((sum, l) => sum + l.value, 0);
    });
  }

  private totals(invoice: InvoiceWithLinesBo): InvoiceTotalsBo {
    const gst = Math.round(invoice.amount * GST_RATE);
    return { subtotal: invoice.amount, gst, total: invoice.amount + gst };
  }

  private async lockOrFail(id: string, manager: EntityManager) {
    const invoice = await this.invoices.findByIdForUpdate(id, manager);
    if (!invoice) throw AppException.notFound('Invoice', id);
    return invoice;
  }
}
