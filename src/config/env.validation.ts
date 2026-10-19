import Joi from 'joi';

/** Fails fast at boot when required configuration is missing or malformed. */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  // Deployment tier, separate from NODE_ENV so a hosted test server can run an optimised production build
  // while keeping test OTP codes and API docs. Defaults to "production" when NODE_ENV=production.
  APP_ENV: Joi.string().valid('development', 'staging', 'production').optional(),
  PORT: Joi.number().port().default(4100),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGINS: Joi.string().default('http://localhost:3020'),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  // Direct (non-pooled) connection for migrations and seeding; falls back to DATABASE_URL.
  DATABASE_MIGRATION_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).optional(),
  // Allows `npm run db:reset` against a non-local database (e.g. a developer's own Neon branch).
  ALLOW_DB_RESET: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_RUN_MIGRATIONS: Joi.boolean().default(true),
  DB_POOL_SIZE: Joi.number().integer().min(1).max(100).default(10),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_TTL_DAYS: Joi.number().integer().min(1).default(30),
  JWT_ISSUER: Joi.string().default('levik-api'),
  JWT_AUDIENCE: Joi.string().default('levik-clients'),

  OTP_TTL_SECONDS: Joi.number().integer().min(60).default(300),
  OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
  /** Comma-separated "<e164 digits>:<code>" pairs. Ignored when APP_ENV is production. */
  OTP_TEST_CODES: Joi.string().allow('').default(''),
  /** One 6-digit code accepted for EVERY number (no SMS is sent). For test environments; ignored when APP_ENV is production. */
  TEST_OTP: Joi.string().pattern(/^\d{6}$/).allow('').optional(),
  SMS_PROVIDER: Joi.string().valid('console', 'msg91').default('console'),
  // oxlint-disable-next-line unicorn/no-thenable -- Joi's conditional schema syntax
  MSG91_AUTH_KEY: Joi.string().when('SMS_PROVIDER', { is: 'msg91', then: Joi.required(), otherwise: Joi.optional() }),
  // oxlint-disable-next-line unicorn/no-thenable -- Joi's conditional schema syntax
  MSG91_TEMPLATE_ID: Joi.string().when('SMS_PROVIDER', { is: 'msg91', then: Joi.required(), otherwise: Joi.optional() }),

  QR_SIGNING_SECRET: Joi.string().min(32).required(),
  QR_BASE_URL: Joi.string().uri().default('https://levik.in/v'),

  // local = files under STORAGE_DIR (development). s3 = an S3-compatible bucket (Cloudflare R2, Backblaze B2, AWS S3…).
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  STORAGE_DIR: Joi.string().default('./storage'),
  /** R2: https://<account id>.r2.cloudflarestorage.com · B2: https://s3.<region>.backblazeb2.com. Omit for AWS. */
  S3_ENDPOINT: Joi.string().uri().optional(),
  /** "auto" for R2. */
  S3_REGION: Joi.string().default('auto'),
  // oxlint-disable-next-line unicorn/no-thenable -- Joi's conditional schema syntax
  S3_BUCKET: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.optional() }),
  // oxlint-disable-next-line unicorn/no-thenable -- Joi's conditional schema syntax
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.optional() }),
  // oxlint-disable-next-line unicorn/no-thenable -- Joi's conditional schema syntax
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_DRIVER', { is: 's3', then: Joi.required(), otherwise: Joi.optional() }),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(false),
  UPLOAD_MAX_MB: Joi.number().min(1).max(50).default(10),
})
  // The process environment contains many unrelated variables; report every problem at once.
  .unknown(true)
  .prefs({ abortEarly: false });
