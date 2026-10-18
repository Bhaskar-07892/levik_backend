import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { RetailerAccountStatus } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { normalizeIndianMobile } from '../../../common/utils/mobile.util.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { PointsService } from '../../points/services/points.service.js';
import type {
  RegisterRetailerBo,
  RetailerBo,
  RetailerDetailBo,
  RetailerListItemBo,
  RetailerProfileInputBo,
  RetailerQueryBo,
  StoreBo,
} from '../bo/retailer.bo.js';
import type { RetailerDao } from '../dao/retailer.dao.js';
import { RetailerMapper } from '../mappers/retailer.mapper.js';
import { RetailersRepository } from '../repositories/retailers.repository.js';

@Injectable()
export class RetailersService {
  constructor(
    private readonly retailers: RetailersRepository,
    private readonly points: PointsService,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: RetailerQueryBo): Promise<Page<RetailerListItemBo>> {
    const page = await this.retailers.findPage(query);
    return {
      ...page,
      items: page.items.map(({ retailer, sales30d, available }) => ({
        ...RetailerMapper.toBo(retailer),
        sales30d,
        achievementPct: RetailerMapper.achievement(sales30d, retailer.monthlyTarget),
        availablePoints: available,
      })),
    };
  }

  states(): Promise<string[]> {
    return this.retailers.distinctStates();
  }

  async get(id: string, manager?: EntityManager): Promise<RetailerBo> {
    return RetailerMapper.toBo(await this.load(id, manager));
  }

  async detail(id: string): Promise<RetailerDetailBo> {
    const [retailer, points, sales30d] = await Promise.all([this.load(id), this.points.balance(id), this.retailers.sales30d(id)]);
    return { ...RetailerMapper.toBo(retailer), points, sales30d, achievementPct: RetailerMapper.achievement(sales30d, retailer.monthlyTarget) };
  }

  /** For workflows that need an approved, active shop (invoices, stock reports). */
  async requireApprovedActive(id: string, manager?: EntityManager): Promise<RetailerBo> {
    const retailer = await this.get(id, manager);
    if (retailer.accountStatus !== 'Active') {
      throw AppException.rule(ErrorCode.ACCOUNT_INACTIVE, `Your account is ${retailer.accountStatus.toLowerCase()}. Contact Levik support.`);
    }
    if (retailer.verificationStatus !== 'Approved') {
      throw AppException.rule(ErrorCode.ACCOUNT_INACTIVE, 'Your shop must be approved before you can do this.');
    }
    return retailer;
  }

  async updateProfile(actor: ActorBo, id: string, input: RetailerProfileInputBo): Promise<RetailerBo> {
    const current = await this.load(id);
    const patch: Partial<RetailerDao> = { ...input };
    if (input.mobile !== undefined) {
      const mobile = normalizeIndianMobile(input.mobile);
      if (!mobile) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Enter a valid Indian mobile number.');
      patch.mobile = mobile.display;
    }
    if (input.email !== undefined) patch.email = input.email || null;
    if (input.gstin !== undefined) patch.gstin = input.gstin || null;
    const changed = (Object.keys(patch) as Array<keyof RetailerDao>).filter((k) => patch[k] !== undefined && patch[k] !== current[k]);
    if (changed.length === 0) return RetailerMapper.toBo(current);
    await this.retailers.update(id, Object.fromEntries(changed.map((k) => [k, patch[k]])));
    await this.audit.record(actor, { action: 'Retailer details edited', entityType: 'Retailer', entityId: id, summary: `${current.shopName} · changed: ${changed.join(', ')}` });
    return this.get(id);
  }

  async review(actor: ActorBo, id: string, decision: 'Approved' | 'Rejected', reason?: string): Promise<RetailerBo> {
    const trimmed = reason?.trim() || null;
    if (decision === 'Rejected' && (!trimmed || trimmed.length < 5)) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'A reason of at least 5 characters is required to reject an application.');
    }
    await this.tx.run(async (manager) => {
      const retailer = await this.retailers.findByIdForUpdate(id, manager);
      if (!retailer) throw AppException.notFound('Retailer', id);
      if (retailer.verificationStatus !== 'Pending') throw AppException.invalidState('Only pending applications can be reviewed.');
      await this.retailers.update(id, { verificationStatus: decision, rejectionReason: decision === 'Rejected' ? trimmed : null }, manager);
      await this.audit.record(
        actor,
        { action: `Retailer ${decision.toLowerCase()}`, entityType: 'Retailer', entityId: id, summary: trimmed ?? `${retailer.shopName} approved` },
        manager,
      );
    });
    return this.get(id);
  }

  async setAccountStatus(actor: ActorBo, id: string, status: RetailerAccountStatus, reason: string): Promise<RetailerBo> {
    const retailer = await this.load(id);
    if (retailer.accountStatus === status) throw AppException.invalidState(`Account is already ${status.toLowerCase()}.`);
    await this.retailers.update(id, { accountStatus: status });
    await this.audit.record(actor, { action: `Retailer account ${status.toLowerCase()}`, entityType: 'Retailer', entityId: id, summary: reason });
    return this.get(id);
  }

  async register(phoneDigits: string, input: RegisterRetailerBo): Promise<RetailerBo> {
    const mobile = normalizeIndianMobile(phoneDigits);
    if (!mobile) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Sign in with an Indian mobile number to register.');
    if (await this.retailers.findByMobile(mobile.display)) throw AppException.rule(ErrorCode.DUPLICATE, 'This number is already registered.');
    const id = await this.retailers.insert({ ...input, mobile: mobile.display });
    return this.get(id);
  }

  async stores(filter: { city?: string; search?: string; page: number; pageSize: number }): Promise<Page<StoreBo>> {
    const page = await this.retailers.findStores(filter);
    return { ...page, items: page.items.map(RetailerMapper.toStoreBo) };
  }

  private async load(id: string, manager?: EntityManager): Promise<RetailerDao> {
    const retailer = await this.retailers.findById(id, manager);
    if (!retailer) throw AppException.notFound('Retailer', id);
    return retailer;
  }
}
