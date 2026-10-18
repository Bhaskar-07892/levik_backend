import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities.js';
import { InitialSchema1760900000000 } from './migrations/1760900000000-initial-schema.js';

export const MIGRATIONS = [InitialSchema1760900000000];

export interface DatabaseSettings {
  url: string;
  ssl: boolean;
  logging: boolean;
  runMigrations: boolean;
  poolSize: number;
}

/** Shared by the Nest app, the CLI data source and the seed script. Schema changes go through migrations only. */
export function buildDataSourceOptions(db: DatabaseSettings): DataSourceOptions {
  return {
    type: 'postgres',
    url: db.url,
    ssl: db.ssl ? { rejectUnauthorized: true } : false,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsRun: db.runMigrations,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: db.logging ? ['query', 'error'] : ['error'],
    extra: { max: db.poolSize, application_name: 'levik-api' },
  };
}
