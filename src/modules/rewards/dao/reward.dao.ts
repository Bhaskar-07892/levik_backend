import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import {
  REWARD_CATEGORIES,
  REWARD_TYPES,
  USER_ROLES,
  type RewardCategory,
  type RewardType,
  type UserRole,
} from '../../../common/domain/enums.js';

@Entity('rewards')
export class RewardDao {
  @PrimaryColumn('text', { default: () => `'RWD-' || nextval('reward_seq')` })
  id: string;

  @Column('text')
  name: string;

  @Column({ type: 'enum', enum: REWARD_CATEGORIES, enumName: 'reward_category' })
  category: RewardCategory;

  @Column({ type: 'enum', enum: REWARD_TYPES, enumName: 'reward_type' })
  type: RewardType;

  @Column('text', { default: '' })
  description: string;

  @Column('int', { name: 'points_required' })
  pointsRequired: number;

  @Column('int', { default: 0 })
  stock: number;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'eligible_roles', type: 'enum', enum: USER_ROLES, enumName: 'user_role', array: true })
  eligibleRoles: UserRole[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
