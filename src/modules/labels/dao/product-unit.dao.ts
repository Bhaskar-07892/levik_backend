import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PRODUCT_UNIT_STATUSES, type ProductUnitStatus } from '../../../common/domain/enums.js';
import { ProductDao } from '../../products/dao/product.dao.js';

/** One physical, individually labelled product unit. */
@Entity('product_units')
export class ProductUnitDao {
  @PrimaryColumn('text')
  serial: string;

  @Column('text', { name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductDao)
  @JoinColumn({ name: 'product_id' })
  product?: ProductDao;

  @Column('text', { name: 'batch_id' })
  batchId: string;

  @Column({ type: 'enum', enum: PRODUCT_UNIT_STATUSES, enumName: 'product_unit_status', default: 'Available' })
  status: ProductUnitStatus;

  @Column('text', { name: 'claimed_scan_id', nullable: true })
  claimedScanId: string | null;

  @Column('timestamptz', { name: 'claimed_at', nullable: true })
  claimedAt: Date | null;

  @Column('text', { name: 'void_reason', nullable: true })
  voidReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
