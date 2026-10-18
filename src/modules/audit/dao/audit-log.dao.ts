import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AUDIT_ENTITIES, type AuditEntity } from '../../../common/domain/enums.js';

/** Append-only (enforced by a database trigger). */
@Entity('audit_logs')
export class AuditLogDao {
  @PrimaryColumn('text', { default: () => `'AUD-' || nextval('audit_seq')` })
  id: string;

  @Column('timestamptz', { default: () => 'now()' })
  at: Date;

  @Column('text', { name: 'admin_name' })
  adminName: string;

  @Column('text', { name: 'admin_id', nullable: true })
  adminId: string | null;

  @Column('text')
  action: string;

  @Column({ name: 'entity_type', type: 'enum', enum: AUDIT_ENTITIES, enumName: 'audit_entity' })
  entityType: AuditEntity;

  @Column('text', { name: 'entity_id' })
  entityId: string;

  @Column('text', { default: '' })
  summary: string;
}
