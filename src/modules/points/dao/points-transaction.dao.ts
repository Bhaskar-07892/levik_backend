import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import {
  POINTS_SOURCES,
  RELATED_ENTITIES,
  USER_ROLES,
  type PointsSource,
  type RelatedEntity,
  type UserRole,
} from '../../../common/domain/enums.js';

/** Append-only ledger row. Exactly one of credit/debit is positive. */
@Entity('points_ledger')
export class PointsTransactionDao {
  @PrimaryColumn('text', { default: () => `'TXN-' || nextval('txn_seq')` })
  id: string;

  @Column('text', { name: 'user_id' })
  userId: string;

  @Column({ name: 'user_role', type: 'enum', enum: USER_ROLES, enumName: 'user_role' })
  userRole: UserRole;

  @Column({ type: 'enum', enum: POINTS_SOURCES, enumName: 'points_source' })
  source: PointsSource;

  @Column({ name: 'related_type', type: 'enum', enum: RELATED_ENTITIES, enumName: 'related_entity', nullable: true })
  relatedType: RelatedEntity | null;

  @Column('text', { name: 'related_id', nullable: true })
  relatedId: string | null;

  @Column('int', { default: 0 })
  credit: number;

  @Column('int', { default: 0 })
  debit: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column('text', { default: 'Posted' })
  status: 'Posted';

  @Column('text', { default: '' })
  note: string;

  @Column('text', { name: 'created_by' })
  createdBy: string;
}
