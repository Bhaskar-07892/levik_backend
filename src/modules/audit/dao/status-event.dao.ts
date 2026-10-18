import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RELATED_ENTITIES, type RelatedEntity } from '../../../common/domain/enums.js';

/** Timeline entry for a scan, invoice or redemption. Append-only. */
@Entity('status_events')
export class StatusEventDao {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column({ name: 'entity_type', type: 'enum', enum: RELATED_ENTITIES, enumName: 'related_entity' })
  entityType: RelatedEntity;

  @Column('text', { name: 'entity_id' })
  entityId: string;

  @Column('timestamptz', { default: () => 'now()' })
  at: Date;

  @Column('text', { name: 'by_name' })
  byName: string;

  @Column('text')
  action: string;

  @Column('text', { nullable: true })
  note: string | null;
}
