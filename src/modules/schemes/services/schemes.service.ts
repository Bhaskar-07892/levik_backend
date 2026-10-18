import { Injectable } from '@nestjs/common';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { SchemeStatus, UserRole } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import type {
  MySchemeProgressBo,
  SchemeBo,
  SchemeInputBo,
  SchemeParticipantBo,
  SchemeQueryBo,
  SchemeSummaryBo,
  SchemeWithSummaryBo,
} from '../bo/scheme.bo.js';
import type { SchemeDao } from '../dao/scheme.dao.js';
import { SchemeMapper } from '../mappers/scheme.mapper.js';
import { SchemesRepository } from '../repositories/schemes.repository.js';

const EDITABLE: SchemeStatus[] = ['Draft', 'Scheduled'];

@Injectable()
export class SchemesService {
  constructor(
    private readonly schemes: SchemesRepository,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: SchemeQueryBo): Promise<Page<SchemeWithSummaryBo>> {
    const page = await this.schemes.findPage(query);
    const items = await Promise.all(page.items.map(async (s) => ({ ...SchemeMapper.toBo(s), summary: await this.summary(s) })));
    return { ...page, items };
  }

  statusCounts(): Promise<Record<string, number>> {
    return this.schemes.countByStatus();
  }

  async get(id: string): Promise<SchemeWithSummaryBo> {
    const scheme = await this.load(id);
    return { ...SchemeMapper.toBo(scheme), summary: await this.summary(scheme) };
  }

  async participants(id: string): Promise<SchemeParticipantBo[]> {
    const scheme = await this.load(id);
    const [people, progress, awarded] = await Promise.all([
      this.schemes.eligibleParticipants(scheme.role),
      this.schemes.progress(scheme, null),
      this.schemes.awardedUserIds(scheme.id),
    ]);
    return people
      .map((p) => {
        const value = progress.get(p.id) ?? 0;
        return { userId: p.id, name: p.name, location: p.location, progress: value, percent: SchemeMapper.percent(value, scheme.targetValue), awarded: awarded.has(p.id) };
      })
      .sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name));
  }

  async create(actor: ActorBo, input: SchemeInputBo): Promise<SchemeBo> {
    this.assertDates(input.startDate, input.endDate);
    const id = await this.schemes.insert({ ...input, targetType: this.targetType(input.role), status: 'Draft' });
    await this.audit.record(actor, { action: 'Scheme created', entityType: 'Scheme', entityId: id, summary: `${input.name} saved as Draft` });
    return SchemeMapper.toBo(await this.load(id));
  }

  async update(actor: ActorBo, id: string, patch: Partial<SchemeInputBo>): Promise<SchemeBo> {
    await this.tx.run(async (manager) => {
      const scheme = await this.schemes.findByIdForUpdate(id, manager);
      if (!scheme) throw AppException.notFound('Scheme', id);
      if (!EDITABLE.includes(scheme.status)) throw AppException.invalidState('Only Draft or Scheduled schemes can be edited.');
      this.assertDates(patch.startDate ?? scheme.startDate, patch.endDate ?? scheme.endDate);
      const role = patch.role ?? scheme.role;
      await this.schemes.update(id, { ...patch, targetType: this.targetType(role) }, manager);
      await this.audit.record(actor, { action: 'Scheme edited', entityType: 'Scheme', entityId: id, summary: Object.keys(patch).join(', ') }, manager);
    });
    return SchemeMapper.toBo(await this.load(id));
  }

  /** Draft/Scheduled/Paused → Active (or Scheduled if the start date is in the future). */
  async activate(actor: ActorBo, id: string): Promise<SchemeBo> {
    await this.tx.run(async (manager) => {
      const scheme = await this.schemes.findByIdForUpdate(id, manager);
      if (!scheme) throw AppException.notFound('Scheme', id);
      if (!['Draft', 'Scheduled', 'Paused'].includes(scheme.status)) throw AppException.invalidState(`A ${scheme.status} scheme cannot be activated.`);
      if (scheme.endDate.getTime() < Date.now()) throw AppException.invalidState('The scheme end date has passed. Edit the dates before activating.');
      const status: SchemeStatus = scheme.startDate.getTime() > Date.now() ? 'Scheduled' : 'Active';
      await this.schemes.setStatus(id, status, manager);
      await this.audit.record(
        actor,
        { action: status === 'Active' ? 'Scheme activated' : 'Scheme scheduled', entityType: 'Scheme', entityId: id, summary: `${scheme.name} is now ${status}` },
        manager,
      );
    });
    return SchemeMapper.toBo(await this.load(id));
  }

  async pause(actor: ActorBo, id: string, reason: string): Promise<SchemeBo> {
    return this.transition(actor, id, ['Active', 'Scheduled'], 'Paused', 'Scheme paused', reason);
  }

  async complete(actor: ActorBo, id: string): Promise<SchemeBo> {
    return this.transition(actor, id, ['Active', 'Paused'], 'Completed', 'Scheme completed');
  }

  /** Mobile: live and upcoming schemes for the signed-in participant with their own progress. */
  async myProgress(userId: string, role: UserRole): Promise<MySchemeProgressBo[]> {
    const [schemes, awards] = await Promise.all([this.schemes.findVisibleForRole(role), this.schemes.awardsForUser(userId)]);
    return Promise.all(
      schemes.map(async (s) => {
        const progress = (await this.schemes.progress(s, [userId])).get(userId) ?? 0;
        return { ...SchemeMapper.toBo(s), progress, percent: SchemeMapper.percent(progress, s.targetValue), awarded: awards.has(s.id) };
      }),
    );
  }

  private async transition(actor: ActorBo, id: string, from: SchemeStatus[], to: SchemeStatus, action: string, reason?: string): Promise<SchemeBo> {
    await this.tx.run(async (manager) => {
      const scheme = await this.schemes.findByIdForUpdate(id, manager);
      if (!scheme) throw AppException.notFound('Scheme', id);
      if (!from.includes(scheme.status)) throw AppException.invalidState(`A ${scheme.status} scheme cannot be moved to ${to}.`);
      await this.schemes.setStatus(id, to, manager);
      await this.audit.record(actor, { action, entityType: 'Scheme', entityId: id, summary: reason ?? scheme.name }, manager);
    });
    return SchemeMapper.toBo(await this.load(id));
  }

  private async summary(scheme: SchemeDao): Promise<SchemeSummaryBo> {
    const [people, progress, awards] = await Promise.all([
      this.schemes.eligibleParticipants(scheme.role),
      this.schemes.progress(scheme, null),
      this.schemes.awardCounts([scheme.id]),
    ]);
    const percents = people.map((p) => SchemeMapper.percent(progress.get(p.id) ?? 0, scheme.targetValue));
    const achievers = awards.get(scheme.id) ?? 0;
    return {
      participants: people.length,
      achievers,
      averagePercent: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0,
      bonusPointsIssued: achievers * scheme.incentivePoints,
    };
  }

  private targetType(role: UserRole) {
    return role === 'retailer' ? ('Sales Amount' as const) : ('Approved Scans' as const);
  }

  private assertDates(start: Date, end: Date) {
    if (end.getTime() < start.getTime()) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'End date must be on or after the start date.');
  }

  private async load(id: string): Promise<SchemeDao> {
    const scheme = await this.schemes.findById(id);
    if (!scheme) throw AppException.notFound('Scheme', id);
    return scheme;
  }
}
