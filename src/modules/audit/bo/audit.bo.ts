import type { AuditEntity, RelatedEntity } from '../../../common/domain/enums.js';

export interface AuditLogBo {
  id: string;
  at: Date;
  adminName: string;
  adminId: string | null;
  action: string;
  entityType: AuditEntity;
  entityId: string;
  summary: string;
}

export interface StatusEventBo {
  at: Date;
  byName: string;
  action: string;
  note: string | null;
}

export interface AuditQueryBo {
  page: number;
  pageSize: number;
  search?: string;
  entityType?: AuditEntity;
  adminName?: string;
  from?: Date;
  to?: Date;
}

export interface RecordAuditBo {
  action: string;
  entityType: AuditEntity;
  entityId: string;
  summary: string;
}

export interface RecordEventBo {
  entityType: RelatedEntity;
  entityId: string;
  action: string;
  note?: string | null;
}
