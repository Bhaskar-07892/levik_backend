import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { AccountStatus, PlumberVerificationStatus } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { normalizeIndianMobile } from '../../../common/utils/mobile.util.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { PointsService } from '../../points/services/points.service.js';
import type {
  PlumberBo,
  PlumberDetailBo,
  PlumberListItemBo,
  PlumberProfileInputBo,
  PlumberQueryBo,
  RegisterPlumberBo,
} from '../bo/plumber.bo.js';
import type { PlumberDao } from '../dao/plumber.dao.js';
import { PlumberMapper } from '../mappers/plumber.mapper.js';
import { PlumbersRepository } from '../repositories/plumbers.repository.js';
import { UploadsService } from '../../uploads/services/uploads.service.js';

@Injectable()
export class PlumbersService {
  constructor(
    private readonly plumbers: PlumbersRepository,
    private readonly points: PointsService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
  ) {}

  async list(query: PlumberQueryBo): Promise<Page<PlumberListItemBo>> {
    const page = await this.plumbers.findPage(query);
    return {
      ...page,
      items: page.items.map(({ plumber, lifetime, available }) => ({
        ...PlumberMapper.toBo(plumber),
        lifetimePoints: lifetime,
        availablePoints: available,
      })),
    };
  }

  states(): Promise<string[]> {
    return this.plumbers.distinctStates();
  }

  async get(id: string): Promise<PlumberBo> {
    return PlumberMapper.toBo(await this.load(id));
  }

  async detail(id: string): Promise<PlumberDetailBo> {
    const [plumber, points, scanCounts] = await Promise.all([this.load(id), this.points.balance(id), this.plumbers.scanCounts(id)]);
    return { ...PlumberMapper.toBo(plumber), points, scanCounts };
  }

  /** For workflows that need an active plumber (scanning, redeeming). */
  async requireActive(id: string, manager?: EntityManager): Promise<PlumberBo> {
    const plumber = await this.load(id, manager);
    if (plumber.accountStatus !== 'Active') {
      throw AppException.rule(ErrorCode.ACCOUNT_INACTIVE, `Your account is ${plumber.accountStatus.toLowerCase()}. Contact Levik support.`);
    }
    return PlumberMapper.toBo(plumber);
  }

  async updateProfile(actor: ActorBo, id: string, input: PlumberProfileInputBo): Promise<PlumberBo> {
    const current = await this.load(id);
    if (input.photoKey) await this.uploads.assertOwned(input.photoKey, id, 'profile-photo');
    const patch: Partial<PlumberDao> = { ...input };
    if (input.mobile !== undefined) {
      const mobile = normalizeIndianMobile(input.mobile);
      if (!mobile) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Enter a valid Indian mobile number.');
      patch.mobile = mobile.display;
    }
    if (input.email !== undefined) patch.email = input.email || null;
    const changed = (Object.keys(patch) as Array<keyof PlumberDao>).filter(
      (k) => patch[k] !== undefined && patch[k] !== current[k],
    );
    if (changed.length === 0) return PlumberMapper.toBo(current);
    await this.plumbers.update(id, Object.fromEntries(changed.map((k) => [k, patch[k]])));
    await this.audit.record(actor, { action: 'Plumber profile edited', entityType: 'Plumber', entityId: id, summary: `${current.name} · changed: ${changed.join(', ')}` });
    return this.get(id);
  }

  async setVerification(actor: ActorBo, id: string, status: PlumberVerificationStatus, note?: string): Promise<PlumberBo> {
    const plumber = await this.load(id);
    const trimmed = note?.trim() || null;
    if (status === 'Rejected' && (!trimmed || trimmed.length < 5)) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'A reason of at least 5 characters is required to reject KYC.');
    }
    if (plumber.verificationStatus === status) throw AppException.invalidState(`KYC is already ${status.toLowerCase()}.`);
    await this.plumbers.setVerification(id, status, trimmed);
    await this.audit.record(actor, {
      action: `Plumber verification ${status.toLowerCase()}`,
      entityType: 'Plumber',
      entityId: id,
      summary: trimmed ?? `${plumber.name} marked ${status}`,
    });
    return this.get(id);
  }

  async setAccountStatus(actor: ActorBo, id: string, status: AccountStatus, reason: string): Promise<PlumberBo> {
    const plumber = await this.load(id);
    if (plumber.accountStatus === status) throw AppException.invalidState(`Account is already ${status.toLowerCase()}.`);
    await this.plumbers.setAccountStatus(id, status);
    await this.audit.record(actor, { action: `Plumber account ${status.toLowerCase()}`, entityType: 'Plumber', entityId: id, summary: reason });
    return this.get(id);
  }

  /** App self-registration for a verified phone number. KYC starts as Pending. */
  async register(phoneDigits: string, input: RegisterPlumberBo): Promise<PlumberBo> {
    const mobile = normalizeIndianMobile(phoneDigits);
    if (!mobile) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Sign in with an Indian mobile number to register.');
    if (await this.plumbers.findByMobile(mobile.display)) throw AppException.rule(ErrorCode.DUPLICATE, 'This number is already registered.');
    const id = await this.plumbers.insert({ ...input, mobile: mobile.display });
    return this.get(id);
  }

  async submitKyc(id: string, aadhaarLast4: string): Promise<PlumberBo> {
    const plumber = await this.load(id);
    if (plumber.verificationStatus === 'Verified') throw AppException.invalidState('KYC is already verified.');
    await this.plumbers.update(id, {
      aadhaarMasked: `XXXX XXXX ${aadhaarLast4}`,
      verificationStatus: 'Pending',
      verificationNote: 'KYC submitted from app',
    });
    return this.get(id);
  }

  private async load(id: string, manager?: EntityManager): Promise<PlumberDao> {
    const plumber = await this.plumbers.findById(id, manager);
    if (!plumber) throw AppException.notFound('Plumber', id);
    return plumber;
  }
}
