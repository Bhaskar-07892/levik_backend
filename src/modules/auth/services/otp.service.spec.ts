import { ConfigService } from '@nestjs/config';
import { authConfig, rateLimitDisabled } from '../../../config/configuration.js';
import type { TransactionService } from '../../../database/transaction.service.js';
import type { OtpChallengeRepository } from '../repositories/otp-challenge.repository.js';
import type { SmsProvider } from '../sms/sms-provider.interface.js';
import { OtpService } from './otp.service.js';

interface Challenge {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt?: Date;
}

/** In-memory challenge store, a pass-through transaction and a recording SMS provider. */
function setup(auth: { otpTestCodes?: Map<string, string>; otpTestCodeForAll?: string; rateLimitDisabled?: boolean }, recent = { count: 0, lastAt: undefined as Date | undefined }) {
  const rows: Challenge[] = [];
  const sent: string[] = [];
  const challenges = {
    recentStats: async () => recent,
    create: async (row: Omit<Challenge, 'attempts'>) => void rows.push({ ...row, attempts: 0 }),
    findLatestOpenForUpdate: async (phone: string) => rows.filter((r) => r.phone === phone && !r.consumedAt).at(-1),
    save: async () => undefined,
  } as unknown as OtpChallengeRepository;
  const tx = { run: (work: (manager: unknown) => unknown) => work(undefined) } as unknown as TransactionService;
  const sms: SmsProvider = { sendOtp: async (phone: string) => void sent.push(phone) };
  const config = new ConfigService({
    auth: { accessSecret: 'unit-test-secret-unit-test-secret-1234', otpTtlSeconds: 300, otpMaxAttempts: 5, otpTestCodes: new Map(), ...auth },
  });
  return { otp: new OtpService(challenges, tx, sms, config), sent };
}

describe('OtpService', () => {
  it('accepts TEST_OTP for any number and sends no SMS', async () => {
    const { otp, sent } = setup({ otpTestCodeForAll: '123456' });
    await otp.request('919812345678');
    await expect(otp.verify('919812345678', '123456')).resolves.toBeUndefined();
    expect(sent).toEqual([]);
  });

  it('rejects other codes when TEST_OTP is set', async () => {
    const { otp } = setup({ otpTestCodeForAll: '123456' });
    await otp.request('919812345678');
    await expect(otp.verify('919812345678', '654321')).rejects.toThrow('Incorrect OTP.');
  });

  it('prefers a per-number test code over TEST_OTP', async () => {
    const { otp } = setup({ otpTestCodes: new Map([['919829011234', '111111']]), otpTestCodeForAll: '123456' });
    await otp.request('919829011234');
    await expect(otp.verify('919829011234', '123456')).rejects.toThrow('Incorrect OTP.');
  });

  it('enforces the resend cooldown and hourly cap by default', async () => {
    await expect(setup({}, { count: 1, lastAt: new Date() }).otp.request('919812345678')).rejects.toThrow('wait 30 seconds');
    await expect(setup({}, { count: 5, lastAt: new Date(Date.now() - 60_000) }).otp.request('919812345678')).rejects.toThrow('Too many OTP requests');
  });

  it('skips the cooldown and hourly cap when rate limiting is disabled', async () => {
    const { otp } = setup({ rateLimitDisabled: true, otpTestCodeForAll: '123456' }, { count: 50, lastAt: new Date() });
    await otp.request('919812345678');
    await expect(otp.verify('919812345678', '123456')).resolves.toBeUndefined();
  });

  it('sends a random code by SMS when no test code applies', async () => {
    const { otp, sent } = setup({});
    await otp.request('919812345678');
    expect(sent).toEqual(['919812345678']);
  });
});

describe('RATE_LIMIT_DISABLED configuration', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('turns rate limiting off outside production', () => {
    process.env = { ...saved, NODE_ENV: 'production', APP_ENV: 'staging', RATE_LIMIT_DISABLED: 'true' };
    expect(rateLimitDisabled()).toBe(true);
    expect(authConfig().rateLimitDisabled).toBe(true);
  });

  it('is ignored in production and off by default', () => {
    process.env = { ...saved, NODE_ENV: 'production', APP_ENV: 'production', RATE_LIMIT_DISABLED: 'true' };
    expect(rateLimitDisabled()).toBe(false);
    process.env = { ...saved, NODE_ENV: 'development', APP_ENV: 'development' };
    delete process.env.RATE_LIMIT_DISABLED;
    expect(rateLimitDisabled()).toBe(false);
  });
});

describe('TEST_OTP configuration', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('is applied outside production', () => {
    process.env = { ...saved, NODE_ENV: 'production', APP_ENV: 'staging', TEST_OTP: '123456' };
    expect(authConfig().otpTestCodeForAll).toBe('123456');
  });

  it('is ignored when APP_ENV is production', () => {
    process.env = { ...saved, NODE_ENV: 'production', APP_ENV: 'production', TEST_OTP: '123456' };
    expect(authConfig().otpTestCodeForAll).toBeUndefined();
    delete process.env.APP_ENV;
    expect(authConfig().otpTestCodeForAll).toBeUndefined();
  });

  it('is off when empty', () => {
    process.env = { ...saved, NODE_ENV: 'development', TEST_OTP: '' };
    expect(authConfig().otpTestCodeForAll).toBeUndefined();
  });
});
