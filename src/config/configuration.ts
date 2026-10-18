import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4100),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
  isProduction: process.env.NODE_ENV === 'production',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
  ssl: process.env.DB_SSL === 'true',
  logging: process.env.DB_LOGGING === 'true',
  runMigrations: process.env.DB_RUN_MIGRATIONS !== 'false',
  poolSize: Number(process.env.DB_POOL_SIZE ?? 10),
}));

export const authConfig = registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
  refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30),
  issuer: process.env.JWT_ISSUER ?? 'levik-api',
  audience: process.env.JWT_AUDIENCE ?? 'levik-clients',
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  otpTestCodes: parseTestCodes(process.env.OTP_TEST_CODES ?? ''),
  smsProvider: (process.env.SMS_PROVIDER ?? 'console') as 'console' | 'msg91',
  msg91AuthKey: process.env.MSG91_AUTH_KEY,
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID,
}));

export const labelsConfig = registerAs('labels', () => ({
  signingSecret: process.env.QR_SIGNING_SECRET as string,
  baseUrl: (process.env.QR_BASE_URL ?? 'https://levik.in/v').replace(/\/+$/, ''),
}));

export const storageConfig = registerAs('storage', () => ({
  dir: process.env.STORAGE_DIR ?? './storage',
  maxBytes: Number(process.env.UPLOAD_MAX_MB ?? 10) * 1024 * 1024,
}));

function parseTestCodes(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  if (process.env.NODE_ENV === 'production') return map;
  for (const pair of raw.split(',')) {
    const [phone, code] = pair.split(':').map((p) => p?.trim());
    if (phone && code) map.set(phone.replace(/\D/g, ''), code);
  }
  return map;
}

export const configurations = [appConfig, databaseConfig, authConfig, labelsConfig, storageConfig];
