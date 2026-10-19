import { Column, Entity, PrimaryColumn } from 'typeorm';
import {
  RETAILER_VERIFICATION_STATUSES,
  ACCOUNT_STATUSES,
  type AccountStatus,
  type RetailerVerificationStatus,
} from '../../../common/domain/enums.js';
import { numericTransformer } from '../../../database/column-transformers.js';

@Entity('retailers')
export class RetailerDao {
  @PrimaryColumn('text', { default: () => `'RTL-' || nextval('retailer_seq')` })
  id: string;

  @Column('text', { name: 'shop_name' })
  shopName: string;

  @Column('text', { name: 'owner_name' })
  ownerName: string;

  @Column('text')
  mobile: string;

  @Column('text', { nullable: true })
  email: string | null;

  @Column('text')
  address: string;

  @Column('text')
  city: string;

  @Column('text')
  state: string;

  @Column('text', { nullable: true })
  gstin: string | null;

  @Column('text', { default: '' })
  distributor: string;

  @Column('timestamptz', { name: 'registered_at', default: () => 'now()' })
  registeredAt: Date;

  @Column({ name: 'verification_status', type: 'enum', enum: RETAILER_VERIFICATION_STATUSES, enumName: 'retailer_verification_status', default: 'Pending' })
  verificationStatus: RetailerVerificationStatus;

  @Column({ name: 'account_status', type: 'enum', enum: ACCOUNT_STATUSES, enumName: 'account_status', default: 'Active' })
  accountStatus: AccountStatus;

  @Column('bigint', { name: 'monthly_target', default: 200000, transformer: numericTransformer })
  monthlyTarget: number;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  /** Upload key (image ID) of the owner's profile photo. */
  @Column('text', { name: 'photo_key', nullable: true })
  photoKey: string | null;

  /** Upload key (image ID) of the shop front photo. */
  @Column('text', { name: 'shop_photo_key', nullable: true })
  shopPhotoKey: string | null;

  @Column('timestamptz', { name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;
}
