import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admins')
export class AdminDao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  email: string;

  @Column('text', { name: 'password_hash', select: false })
  passwordHash: string;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('timestamptz', { name: 'password_changed_at', default: () => 'now()' })
  passwordChangedAt: Date;

  @Column('timestamptz', { name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
