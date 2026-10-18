import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options.js';

/** Standalone data source for the TypeORM CLI and scripts (npm run migration:*). */
export default new DataSource(
  buildDataSourceOptions({
    url: process.env.DATABASE_URL ?? '',
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.DB_LOGGING === 'true',
    runMigrations: false,
    poolSize: 5,
  }),
);
