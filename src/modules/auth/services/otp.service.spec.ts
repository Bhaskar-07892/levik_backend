import { ConfigService } from '@nestjs/config';
import { authConfig } from '../../../config/configuration.js';
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
function setup(auth: { otpTestCodes?: Map<string, string>; otpTestCodeForAll?: string }) {
  const rows: Challenge[] = [];
  const sent: string[] = [];
  const challenges = {
    recentStats: async () => ({ count: 0, lastAt: undefined }),
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

  it('sends a random code by SMS when no test code applies', async () => {
    const { otp, sent } = setup({});
    await otp.request('919812345678');
    expect(sent).toEqual(['919812345678']);
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
