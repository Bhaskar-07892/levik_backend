import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options.js';

/**
 * Standalone data source for the TypeORM CLI and scripts (npm run migration:*, db:seed).
 * Uses DATABASE_MIGRATION_URL when set: poolers such as Neon's (PgBouncer, transaction mode) are fine
 * for the app but migrations and bulk seeding should use a direct connection.
 */
export default new DataSource(
  buildDataSourceOptions({
    url: process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || '',
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.DB_LOGGING === 'true',
    runMigrations: false,
    poolSize: 5,
  }),
);
