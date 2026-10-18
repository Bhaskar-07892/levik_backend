import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProductDao } from '../../products/dao/product.dao.js';

@Entity('label_batches')
export class LabelBatchDao {
  @PrimaryColumn('text', { default: () => `'LB-' || nextval('label_batch_seq')` })
  id: string;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  @Column('int')
  quantity: number;

  @Column('text', { nullable: true })
  note: string | null;

  @Column('text', { name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
