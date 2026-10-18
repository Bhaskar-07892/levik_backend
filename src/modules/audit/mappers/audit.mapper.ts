import type { AuditLogBo, StatusEventBo } from '../bo/audit.bo.js';
import type { AuditLogDao } from '../dao/audit-log.dao.js';
import type { StatusEventDao } from '../dao/status-event.dao.js';
import type { AuditLogResponseDto, StatusEventResponseDto } from '../dto/audit.response.dto.js';

export const AuditMapper = {
  logToBo: (d: AuditLogDao): AuditLogBo => ({
    id: d.id,
    at: d.at,
    adminName: d.adminName,
    adminId: d.adminId,
    action: d.action,
    entityType: d.entityType,
    entityId: d.entityId,
    summary: d.summary,
  }),
  eventToBo: (d: StatusEventDao): StatusEventBo => ({ at: d.at, byName: d.byName, action: d.action, note: d.note }),
  logToDto: (b: AuditLogBo): AuditLogResponseDto => ({
    id: b.id,
    at: b.at.toISOString(),
    admin: b.adminName,
    action: b.action,
    entityType: b.entityType,
    entityId: b.entityId,
    summary: b.summary,
  }),
  eventToDto: (b: StatusEventBo): StatusEventResponseDto => ({ at: b.at.toISOString(), by: b.byName, action: b.action, note: b.note ?? undefined }),
};
