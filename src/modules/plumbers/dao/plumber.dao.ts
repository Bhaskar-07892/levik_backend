import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import {
  ACCOUNT_STATUSES,
  PLUMBER_VERIFICATION_STATUSES,
  type AccountStatus,
  type PlumberVerificationStatus,
} from '../../../common/domain/enums.js';
import { RetailerDao } from '../../retailers/dao/retailer.dao.js';

@Entity('plumbers')
export class PlumberDao {
  @PrimaryColumn('text', { default: () => `'PLM-' || nextval('plumber_seq')` })
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  mobile: string;

  @Column('text', { nullable: true })
  email: string | null;

  @Column('text')
  city: string;

  @Column('text')
  state: string;

  @Column('text')
  pincode: string;

  @Column('timestamptz', { name: 'registered_at', default: () => 'now()' })
  registeredAt: Date;

  @Column({ name: 'verification_status', type: 'enum', enum: PLUMBER_VERIFICATION_STATUSES, enumName: 'plumber_verification_status', default: 'Pending' })
  verificationStatus: PlumberVerificationStatus;

  @Column({ name: 'account_status', type: 'enum', enum: ACCOUNT_STATUSES, enumName: 'account_status', default: 'Active' })
  accountStatus: AccountStatus;

  @Column('text', { name: 'aadhaar_masked', nullable: true })
  aadhaarMasked: string | null;

  @Column('int', { name: 'experience_years', default: 0 })
  experienceYears: number;

  @Column('text', { default: '' })
  specialization: string;

  @Column('text', { name: 'preferred_retailer_id', nullable: true })
  preferredRetailerId: string | null;

  @ManyToOne(() => RetailerDao, { nullable: true })
  @JoinColumn({ name: 'preferred_retailer_id' })
  preferredRetailer?: RetailerDao | null;

  @Column('text', { name: 'verification_note', nullable: true })
  verificationNote: string | null;

  @Column('timestamptz', { name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;
}
