import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { toCsv } from '../../../common/utils/csv.util.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { ProductsRepository } from '../../products/repositories/products.repository.js';
import type { BatchQueryBo, LabelBatchBo, ProductUnitBo, ResolvedLabelBo } from '../bo/label.bo.js';
import { LabelMapper } from '../mappers/label.mapper.js';
import { LabelsRepository } from '../repositories/labels.repository.js';
import { generateSerial } from '../utils/serial-code.js';
import { LabelSheetService } from './label-sheet.service.js';
import { QrSignerService } from './qr-signer.service.js';

const MAX_GENERATION_ROUNDS = 5;

/** Issues unique, signed QR labels per physical unit and resolves scanned codes back to units. */
@Injectable()
export class LabelsService {
  constructor(
    private readonly labels: LabelsRepository,
    private readonly products: ProductsRepository,
    private readonly signer: QrSignerService,
    private readonly sheets: LabelSheetService,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async createBatch(actor: ActorBo, productId: string, quantity: number, note?: string): Promise<LabelBatchBo> {
    const batchId = await this.tx.run(async (manager) => {
      const product = await this.products.findById(productId, manager);
      if (!product) throw AppException.notFound('Product', productId);
      if (!product.isActive) throw AppException.invalidState('Labels can only be generated for active products.');

      const id = await this.labels.createBatch({ productId, quantity, note: note?.trim() || null, createdBy: actor.name }, manager);
      let remaining = quantity;
      for (let round = 0; remaining > 0 && round < MAX_GENERATION_ROUNDS; round++) {
        const serials = Array.from({ length: remaining }, generateSerial);
        remaining -= await this.labels.insertUnits(id, productId, serials, manager);
      }
      if (remaining > 0) throw new Error('Could not generate unique serials'); // practically unreachable (50-bit space)

      await this.audit.record(
        actor,
        { action: 'Label batch generated', entityType: 'Label', entityId: id, summary: `${quantity} labels for ${product.name} (${product.modelCode})` },
        manager,
      );
      return id;
    });
    return this.getBatch(batchId);
  }

  async listBatches(query: BatchQueryBo): Promise<Page<LabelBatchBo>> {
    const page = await this.labels.findBatchPage(query);
    return { ...page, items: page.items.map(LabelMapper.batchToBo) };
  }

  async getBatch(id: string): Promise<LabelBatchBo> {
    const row = await this.labels.findBatch(id);
    if (!row) throw AppException.notFound('Label batch', id);
    return LabelMapper.batchToBo(row);
  }

  async batchSheet(id: string, offset: number, limit: number): Promise<{ filename: string; stream: Readable }> {
    const batch = await this.getBatch(id);
    const units = await this.labels.batchUnits(id, offset, limit);
    if (units.length === 0) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'No labels in this range.');
    const stream = await this.sheets.render(
      { productName: batch.productName, modelCode: batch.modelCode, batchId: batch.id },
      units.map((u) => ({ serial: u.serial, payload: this.signer.payload(u.serial) })),
    );
    return { filename: `levik-labels-${batch.id}-${offset + 1}-${offset + units.length}.pdf`, stream };
  }

  async batchCsv(id: string): Promise<{ filename: string; csv: string }> {
    const batch = await this.getBatch(id);
    const units = await this.labels.batchUnits(id, 0, batch.quantity);
    const csv = toCsv(
      units.map((u) => ({ serial: u.serial, model_code: batch.modelCode, product: batch.productName, status: u.status, qr_payload: this.signer.payload(u.serial) })),
    );
    return { filename: `levik-labels-${batch.id}.csv`, csv };
  }

  async getUnit(serial: string): Promise<ProductUnitBo> {
    const unit = await this.labels.findUnit(serial);
    if (!unit) throw AppException.notFound('Label', serial);
    return LabelMapper.unitToBo(unit, this.signer.payload(unit.serial));
  }

  async voidUnit(actor: ActorBo, serial: string, reason: string): Promise<ProductUnitBo> {
    await this.tx.run(async (manager) => {
      const unit = await this.labels.findUnitForUpdate(serial, manager);
      if (!unit) throw AppException.notFound('Label', serial);
      if (unit.status !== 'Available') throw AppException.invalidState(`A ${unit.status.toLowerCase()} label cannot be voided.`);
      await this.labels.setStatus(serial, { status: 'Void', voidReason: reason }, manager);
      await this.audit.record(actor, { action: 'Label voided', entityType: 'Label', entityId: serial, summary: reason }, manager);
    });
    return this.getUnit(serial);
  }

  /** Parses a scanned QR or typed serial and looks up the unit. Throws for malformed or counterfeit codes. */
  async resolve(code: string, manager?: EntityManager): Promise<ResolvedLabelBo> {
    const parsed = this.signer.parse(code);
    if (!parsed) throw AppException.rule(ErrorCode.INVALID_LABEL, 'This is not a valid Levik label code.');
    const signatureValid = parsed.signature === undefined ? null : this.signer.verify(parsed.serial, parsed.signature);
    if (signatureValid === false) {
      throw AppException.rule(ErrorCode.INVALID_LABEL, 'This label could not be verified as a genuine Levik label.');
    }
    const unit = await this.labels.findUnit(parsed.serial, manager);
    return { serial: parsed.serial, signatureValid, unit: unit ? LabelMapper.unitToBo(unit, this.signer.payload(unit.serial)) : null };
  }

  /** Marks a unit as claimed when its scan is approved. */
  async claim(serial: string, scanId: string, manager: EntityManager): Promise<void> {
    const unit = await this.labels.findUnitForUpdate(serial, manager);
    if (!unit) throw AppException.notFound('Label', serial);
    if (unit.status !== 'Available') {
      throw AppException.rule(ErrorCode.ALREADY_PROCESSED, `Label ${serial} is ${unit.status.toLowerCase()} and cannot be credited.`);
    }
    await this.labels.setStatus(serial, { status: 'Claimed', claimedScanId: scanId, claimed: true }, manager);
  }

  /** Public authenticity check; never reveals who claimed a unit. */
  async verifyPublic(code: string): Promise<{ genuine: boolean; status: ProductUnitBo['status'] | 'Unknown'; productName?: string; modelCode?: string }> {
    try {
      const resolved = await this.resolve(code);
      if (!resolved.unit) return { genuine: false, status: 'Unknown' };
      return {
        genuine: resolved.unit.status !== 'Void',
        status: resolved.unit.status,
        productName: resolved.unit.productName,
        modelCode: resolved.unit.modelCode,
      };
    } catch {
      return { genuine: false, status: 'Unknown' };
    }
  }
}
