// Runs before any test module is imported, so ConfigModule sees these values (process.env wins over .env).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/levik_test';
process.env.DB_RUN_MIGRATIONS = 'true';
process.env.DB_POOL_SIZE = '5';
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-e2e-access-secret-0123456789';
process.env.QR_SIGNING_SECRET = 'e2e-qr-secret-e2e-qr-secret-0123456789abcdef';
process.env.QR_BASE_URL = 'https://levik.in/v';
process.env.OTP_TEST_CODES = '919829011234:123456,919900011122:123456';
process.env.SMS_PROVIDER = 'console';
process.env.STORAGE_DIR = './storage-test';
process.env.LOG_LEVEL = 'silent';
