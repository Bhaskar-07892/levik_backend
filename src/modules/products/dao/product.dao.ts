import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../common/domain/enums.js';
import { numericTransformer } from '../../../database/column-transformers.js';

@Entity('products')
export class ProductDao {
  @PrimaryColumn('text', { default: () => `'PRD-' || nextval('product_seq')` })
  id: string;

  @Column('text')
  name: string;

  @Column('text', { name: 'model_code' })
  modelCode: string;

  @Column({ type: 'enum', enum: PRODUCT_CATEGORIES, enumName: 'product_category' })
  category: ProductCategory;

  @Column('text', { default: '' })
  description: string;

  @Column('text', { nullable: true })
  dimensions: string | null;

  @Column('text', { array: true, default: () => `'{}'` })
  features: string[];

  @Column('text', { name: 'image_url', nullable: true })
  imageUrl: string | null;

  @Column('text')
  sku: string;

  @Column('text')
  barcode: string;

  @Column('bigint', { transformer: numericTransformer })
  mrp: number;

  @Column('int', { name: 'plumber_points', default: 0 })
  plumberPoints: number;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('boolean', { name: 'reward_eligible', default: true })
  rewardEligible: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
