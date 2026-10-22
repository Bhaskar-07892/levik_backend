import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../../database/column-transformers.js';
import { RetailerDao } from '../../retailers/dao/retailer.dao.js';
import { BillLineDao } from './bill-line.dao.js';

/** A bill the retailer's store issues to its buyer (a plumber or a walk-in customer). */
@Entity('customer_bills')
export class CustomerBillDao {
  @PrimaryColumn('text', { default: () => `'BILL-' || nextval('bill_seq')` })
  id: string;

  @Column('text', { name: 'retailer_id' })
  retailerId: string;

  @ManyToOne(() => RetailerDao)
  @JoinColumn({ name: 'retailer_id' })
  retailer?: RetailerDao;

  /** Per-store running number, e.g. "B-0007". */
  @Column('text', { name: 'bill_number' })
  billNumber: string;

  @Column('text', { name: 'customer_name' })
  customerName: string;

  @Column('text', { name: 'customer_mobile', nullable: true })
  customerMobile: string | null;

  /** The plumber sale this bill was raised for, if any (stock was already reduced by that sale). */
  @Column('text', { name: 'scan_id', nullable: true })
  scanId: string | null;

  @Column('bigint', { name: 'total_value', transformer: numericTransformer })
  totalValue: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column('text', { name: 'created_by' })
  createdBy: string;

  @OneToMany(() => BillLineDao, (line) => line.bill)
  lines?: BillLineDao[];
}
