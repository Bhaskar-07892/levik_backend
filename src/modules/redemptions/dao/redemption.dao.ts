import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { REDEMPTION_STATUSES, USER_ROLES, type RedemptionStatus, type UserRole } from '../../../common/domain/enums.js';
import { RewardDao } from '../../rewards/dao/reward.dao.js';

@Entity('redemptions')
export class RedemptionDao {
  @PrimaryColumn('text', { default: () => `'RDM-' || nextval('redemption_seq')` })
  id: string;

  @Column('text', { name: 'user_id' })
  userId: string;

  @Column({ name: 'user_role', type: 'enum', enum: USER_ROLES, enumName: 'user_role' })
  userRole: UserRole;

  @Column('text', { name: 'reward_id' })
  rewardId: string;

  @ManyToOne(() => RewardDao)
  @JoinColumn({ name: 'reward_id' })
  reward?: RewardDao;

  @Column('int', { name: 'points_cost' })
  pointsCost: number;

  @Column('timestamptz', { name: 'requested_at', default: () => 'now()' })
  requestedAt: Date;

  @Column({ type: 'enum', enum: REDEMPTION_STATUSES, enumName: 'redemption_status', default: 'Requested' })
  status: RedemptionStatus;

  @Column('text', { name: 'delivery_address', default: '' })
  deliveryAddress: string;

  @Column('text', { name: 'debit_txn_id', nullable: true })
  debitTxnId: string | null;

  @Column('text', { name: 'reversal_txn_id', nullable: true })
  reversalTxnId: string | null;

  @Column('text', { name: 'fulfilment_ref', nullable: true })
  fulfilmentRef: string | null;

  @Column('text', { name: 'voucher_code', nullable: true })
  voucherCode: string | null;

  @Column('text', { name: 'courier_name', nullable: true })
  courierName: string | null;

  @Column('text', { name: 'tracking_number', nullable: true })
  trackingNumber: string | null;

  @Column('text', { name: 'cancel_reason', nullable: true })
  cancelReason: string | null;
}
