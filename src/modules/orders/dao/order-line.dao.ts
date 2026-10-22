import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../database/column-transformers.js';
import { ProductDao } from '../../products/dao/product.dao.js';
import type { OrderDao } from './order.dao.js';

@Entity('order_lines')
export class OrderLineDao {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column('text', { name: 'order_id' })
  orderId: string;

  @ManyToOne('OrderDao', 'lines')
  @JoinColumn({ name: 'order_id' })
  order?: OrderDao;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  @Column('int')
  quantity: number;

  /** Price per unit when the order was placed (list price; payment is out of scope for now). */
  @Column('bigint', { name: 'unit_price', transformer: numericTransformer })
  unitPrice: number;
}
