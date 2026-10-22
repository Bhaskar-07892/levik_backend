import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { ORDER_STATUSES, type OrderStatus } from '../../../common/domain/enums.js';
import { numericTransformer } from '../../../database/column-transformers.js';
import { RetailerDao } from '../../retailers/dao/retailer.dao.js';
import { OrderLineDao } from './order-line.dao.js';

/** A retailer's stock order to Levik. Delivered orders add stock and carry a purchase invoice number. */
@Entity('orders')
export class OrderDao {
  @PrimaryColumn('text', { default: () => `'ORD-' || nextval('order_seq')` })
  id: string;

  @Column('text', { name: 'retailer_id' })
  retailerId: string;

  @ManyToOne(() => RetailerDao)
  @JoinColumn({ name: 'retailer_id' })
  retailer?: RetailerDao;

  @Column({ type: 'enum', enum: ORDER_STATUSES, enumName: 'order_status', default: 'Placed' })
  status: OrderStatus;

  @Column('text', { nullable: true })
  note: string | null;

  @Column('bigint', { name: 'total_value', transformer: numericTransformer })
  totalValue: number;

  @Column('timestamptz', { name: 'placed_at', default: () => 'now()' })
  placedAt: Date;

  @Column('timestamptz', { name: 'confirmed_at', nullable: true })
  confirmedAt: Date | null;

  @Column('timestamptz', { name: 'dispatched_at', nullable: true })
  dispatchedAt: Date | null;

  @Column('timestamptz', { name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  @Column('timestamptz', { name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @Column('text', { name: 'cancel_reason', nullable: true })
  cancelReason: string | null;

  @Column('text', { name: 'purchase_invoice_number', nullable: true })
  purchaseInvoiceNumber: string | null;

  @Column('timestamptz', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  @OneToMany(() => OrderLineDao, (line) => line.order)
  lines?: OrderLineDao[];
}
