import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { STOCK_REASONS, type StockReason } from '../../../common/domain/enums.js';
import { ProductDao } from '../../products/dao/product.dao.js';

/** One change to a retailer's stock of a product. `balanceAfter` equals inventory.quantity after this row. */
@Entity('stock_movements')
export class StockMovementDao {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column('text', { name: 'retailer_id' })
  retailerId: string;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  @Column('int')
  delta: number;

  @Column('int', { name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'enum', enum: STOCK_REASONS, enumName: 'stock_reason' })
  reason: StockReason;

  @Column('text', { name: 'related_type', nullable: true })
  relatedType: string | null;

  @Column('text', { name: 'related_id', nullable: true })
  relatedId: string | null;

  @Column('text', { nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column('text', { name: 'created_by' })
  createdBy: string;
}
