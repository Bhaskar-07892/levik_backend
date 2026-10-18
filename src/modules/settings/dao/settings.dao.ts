import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../../database/column-transformers.js';

export interface NotificationPreferences {
  pendingScans: boolean;
  pendingInvoices: boolean;
  redemptions: boolean;
  lowStock: boolean;
}

/** Single-row programme configuration. */
@Entity('settings')
export class SettingsDao {
  @PrimaryColumn('boolean', { default: true })
  id: boolean;

  @Column('text', { name: 'programme_name' })
  programmeName: string;

  @Column('numeric', { name: 'retailer_points_per_100', precision: 5, scale: 2, transformer: numericTransformer })
  retailerPointsPer100: number;

  @Column('int', { name: 'low_stock_threshold' })
  lowStockThreshold: number;

  @Column('jsonb')
  notifications: NotificationPreferences;

  @Column('int', { name: 'max_daily_scans_per_plumber' })
  maxDailyScansPerPlumber: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
