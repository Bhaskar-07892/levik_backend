import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import {
  PRODUCT_CATEGORIES,
  SCHEME_STATUSES,
  SCHEME_TARGET_TYPES,
  USER_ROLES,
  type ProductCategory,
  type SchemeStatus,
  type SchemeTargetType,
  type UserRole,
} from '../../../common/domain/enums.js';
import { numericTransformer } from '../../../database/column-transformers.js';

@Entity('schemes')
export class SchemeDao {
  @PrimaryColumn('text', { default: () => `'SCH-' || nextval('scheme_seq')` })
  id: string;

  @Column('text')
  name: string;

  @Column('text', { default: '' })
  description: string;

  @Column({ type: 'enum', enum: USER_ROLES, enumName: 'user_role' })
  role: UserRole;

  @Column('timestamptz', { name: 'start_date' })
  startDate: Date;

  @Column('timestamptz', { name: 'end_date' })
  endDate: Date;

  @Column({ name: 'eligible_categories', type: 'enum', enum: PRODUCT_CATEGORIES, enumName: 'product_category', array: true })
  eligibleCategories: ProductCategory[];

  @Column({ name: 'target_type', type: 'enum', enum: SCHEME_TARGET_TYPES, enumName: 'scheme_target_type' })
  targetType: SchemeTargetType;

  @Column('bigint', { name: 'target_value', transformer: numericTransformer })
  targetValue: number;

  @Column('int', { name: 'incentive_points' })
  incentivePoints: number;

  @Column({ type: 'enum', enum: SCHEME_STATUSES, enumName: 'scheme_status', default: 'Draft' })
  status: SchemeStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
