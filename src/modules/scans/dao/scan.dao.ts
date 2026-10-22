import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SCAN_STATUSES, type RetailerDecision, type ScanStatus } from '../../../common/domain/enums.js';
import { PlumberDao } from '../../plumbers/dao/plumber.dao.js';
import { ProductDao } from '../../products/dao/product.dao.js';
import { RetailerDao } from '../../retailers/dao/retailer.dao.js';

@Entity('scans')
export class ScanDao {
  @PrimaryColumn('text', { default: () => `'SCN-' || nextval('scan_seq')` })
  id: string;

  @Column('text', { name: 'plumber_id' })
  plumberId: string;

  @ManyToOne(() => PlumberDao)
  @JoinColumn({ name: 'plumber_id' })
  plumber?: PlumberDao;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  /** Serial exactly as submitted (normalised to upper case). */
  @Column('text', { name: 'submitted_code' })
  submittedCode: string;

  /** Set when the serial matches an issued Levik label. */
  @Column('text', { name: 'product_unit_serial', nullable: true })
  productUnitSerial: string | null;

  /** True when the QR signature was verified (camera scan), false for manual entry. */
  @Column('boolean', { name: 'label_verified', default: false })
  labelVerified: boolean;

  @Column('timestamptz', { name: 'scanned_at', default: () => 'now()' })
  scannedAt: Date;

  @Column('text', { name: 'retailer_id', nullable: true })
  retailerId: string | null;

  @ManyToOne(() => RetailerDao, { nullable: true })
  @JoinColumn({ name: 'retailer_id' })
  retailer?: RetailerDao | null;

  @Column('text', { name: 'invoice_number', nullable: true })
  invoiceNumber: string | null;

  @Column('text', { name: 'site_location', default: '' })
  siteLocation: string;

  @Column('text', { name: 'photo_key', nullable: true })
  photoKey: string | null;

  @Column({ type: 'enum', enum: SCAN_STATUSES, enumName: 'scan_status', default: 'Pending' })
  status: ScanStatus;

  @Column('int', { name: 'awarded_points', nullable: true })
  awardedPoints: number | null;

  @Column('text', { name: 'ledger_txn_id', nullable: true })
  ledgerTxnId: string | null;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column('text', { name: 'flag_reason', nullable: true })
  flagReason: string | null;

  @Column('text', { name: 'reviewed_by', nullable: true })
  reviewedBy: string | null;

  @Column('timestamptz', { name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  /** The selected retailer's answer to this "bought from you" claim; null while waiting. */
  @Column('text', { name: 'retailer_decision', nullable: true })
  retailerDecision: RetailerDecision | null;

  @Column('timestamptz', { name: 'retailer_decided_at', nullable: true })
  retailerDecidedAt: Date | null;

  @Column('text', { name: 'retailer_note', nullable: true })
  retailerNote: string | null;

  /** Incentive credited to the retailer when they confirmed the sale. */
  @Column('int', { name: 'retailer_points', nullable: true })
  retailerPoints: number | null;

  @Column('text', { name: 'retailer_ledger_txn_id', nullable: true })
  retailerLedgerTxnId: string | null;
}
