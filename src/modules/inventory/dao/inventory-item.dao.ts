import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProductDao } from '../../products/dao/product.dao.js';
import { RetailerDao } from '../../retailers/dao/retailer.dao.js';

/** Retailer-reported stock line (not warehouse stock). */
@Entity('inventory')
export class InventoryItemDao {
  @PrimaryColumn('text', { default: () => `'STK-' || nextval('inventory_seq')` })
  id: string;

  @Column('text', { name: 'retailer_id' })
  retailerId: string;

  @ManyToOne(() => RetailerDao)
  @JoinColumn({ name: 'retailer_id' })
  retailer?: RetailerDao;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  @Column('int')
  quantity: number;

  @Column('timestamptz', { name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  @Column('text', { name: 'updated_by', default: 'Retailer app' })
  updatedBy: string;
}
