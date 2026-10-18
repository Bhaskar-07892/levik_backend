import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Role } from '../../../common/interfaces/authenticated-user.interface.js';

@Entity('refresh_tokens')
export class RefreshTokenDao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { name: 'subject_id' })
  subjectId: string;

  @Column('text')
  role: Role;

  @Column('text', { nullable: true })
  phone: string | null;

  /** SHA-256 of the opaque token; the token itself is never stored. */
  @Column('text', { name: 'token_hash' })
  tokenHash: string;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt: Date;

  @Column('timestamptz', { name: 'revoked_at', nullable: true })
  revokedAt: Date | null;

  @Column('uuid', { name: 'replaced_by', nullable: true })
  replacedBy: string | null;

  @Column('text', { name: 'user_agent', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
