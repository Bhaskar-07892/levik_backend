import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { INVOICE_STATUSES, type InvoiceStatus } from '../../../common/domain/enums.js';
import { RetailerDao } from '../../retailers/dao/retailer.dao.js';
import { InvoiceLineDao } from './invoice-line.dao.js';

@Entity('invoices')
export class InvoiceDao {
  @PrimaryColumn('text', { default: () => `'INV-' || nextval('invoice_seq')` })
  id: string;

  @Column('text', { name: 'invoice_number' })
  invoiceNumber: string;

  @Column('text', { name: 'retailer_id' })
  retailerId: string;

  @ManyToOne(() => RetailerDao)
  @JoinColumn({ name: 'retailer_id' })
  retailer?: RetailerDao;

  @Column('text', { name: 'buyer_name', default: '' })
  buyerName: string;

  @Column('timestamptz', { name: 'invoice_date' })
  invoiceDate: Date;

  @Column('timestamptz', { name: 'submitted_at', default: () => 'now()' })
  submittedAt: Date;

  @Column('text', { name: 'document_key', nullable: true })
  documentKey: string | null;

  @Column({ type: 'enum', enum: INVOICE_STATUSES, enumName: 'invoice_status', default: 'Submitted' })
  status: InvoiceStatus;

  @Column('text', { nullable: true })
  reviewer: string | null;

  @Column('timestamptz', { name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column('int', { name: 'incentive_points', nullable: true })
  incentivePoints: number | null;

  @Column('text', { name: 'ledger_txn_id', nullable: true })
  ledgerTxnId: string | null;

  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column('text', { name: 'info_request', nullable: true })
  infoRequest: string | null;

  @OneToMany(() => InvoiceLineDao, (line) => line.invoice)
  lines?: InvoiceLineDao[];
}
