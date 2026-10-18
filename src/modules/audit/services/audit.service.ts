import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AUDIT_ENTITIES, type RelatedEntity } from '../../../common/domain/enums.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import type { AuditLogBo, AuditQueryBo, RecordAuditBo, RecordEventBo, StatusEventBo } from '../bo/audit.bo.js';
import { AuditMapper } from '../mappers/audit.mapper.js';
import { AuditLogRepository } from '../repositories/audit-log.repository.js';
import { StatusEventRepository } from '../repositories/status-event.repository.js';

/** Records the append-only audit trail and per-entity status timelines. */
@Injectable()
export class AuditService {
  constructor(
    private readonly auditLogs: AuditLogRepository,
    private readonly statusEvents: StatusEventRepository,
  ) {}

  record(actor: ActorBo, entry: RecordAuditBo, manager?: EntityManager): Promise<void> {
    return this.auditLogs.insert({ adminName: actor.name, adminId: actor.id, ...entry }, manager);
  }

  recordEvent(actor: ActorBo, event: RecordEventBo, manager?: EntityManager): Promise<void> {
    return this.statusEvents.insert({ byName: actor.name, note: event.note ?? null, ...event }, manager);
  }

  async timeline(entityType: RelatedEntity, entityId: string): Promise<StatusEventBo[]> {
    return (await this.statusEvents.findForEntity(entityType, entityId)).map(AuditMapper.eventToBo);
  }

  async list(query: AuditQueryBo): Promise<Page<AuditLogBo>> {
    const page = await this.auditLogs.findPage(query);
    return { ...page, items: page.items.map(AuditMapper.logToBo) };
  }

  async filterOptions(): Promise<{ entityTypes: readonly string[]; admins: string[] }> {
    return { entityTypes: AUDIT_ENTITIES, admins: await this.auditLogs.distinctAdminNames() };
  }
}
