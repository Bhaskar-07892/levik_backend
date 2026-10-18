import { ApiProperty } from '@nestjs/swagger';
import { AUDIT_ENTITIES, type AuditEntity } from '../../../common/domain/enums.js';

export class AuditLogResponseDto {
  id: string;
  /** ISO timestamp */
  at: string;
  admin: string;
  action: string;
  @ApiProperty({ enum: AUDIT_ENTITIES })
  entityType: AuditEntity;
  entityId: string;
  summary: string;
}

export class AuditLogPageResponseDto {
  items: AuditLogResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class StatusEventResponseDto {
  at: string;
  by: string;
  action: string;
  note?: string;
}

export class AuditFilterOptionsResponseDto {
  @ApiProperty({ enum: AUDIT_ENTITIES, isArray: true })
  entityTypes: readonly string[];
  admins: string[];
}
