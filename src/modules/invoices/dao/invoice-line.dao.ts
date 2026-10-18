import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../../database/column-transformers.js';
import { ProductDao } from '../../products/dao/product.dao.js';
import type { InvoiceDao } from './invoice.dao.js';

@Entity('invoice_lines')
export class InvoiceLineDao {
  @PrimaryColumn('text', { default: () => 'gen_random_uuid()::text' })
  id: string;

  @Column('text', { name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne('InvoiceDao', 'lines', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceDao;

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
