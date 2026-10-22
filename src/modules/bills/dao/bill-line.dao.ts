import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../database/column-transformers.js';
import { ProductDao } from '../../products/dao/product.dao.js';
import type { CustomerBillDao } from './customer-bill.dao.js';

@Entity('bill_lines')
export class BillLineDao {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: string;

  @Column('text', { name: 'bill_id' })
  billId: string;

  @ManyToOne('CustomerBillDao', 'lines')
  @JoinColumn({ name: 'bill_id' })
  bill?: CustomerBillDao;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  @Column('int')
  quantity: number;

  @Column('bigint', { name: 'unit_price', transformer: numericTransformer })
  unitPrice: number;
}
