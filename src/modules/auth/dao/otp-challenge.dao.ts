import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otp_challenges')
export class OtpChallengeDao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** E.164 digits, e.g. 919829011234. */
  @Column('text')
  phone: string;

  @Column('text', { name: 'code_hash' })
  codeHash: string;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt: Date;

  @Column('int', { default: 0 })
  attempts: number;

  @Column('timestamptz', { name: 'consumed_at', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
