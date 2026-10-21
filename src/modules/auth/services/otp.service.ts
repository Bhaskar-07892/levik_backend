import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { OtpChallengeRepository } from '../repositories/otp-challenge.repository.js';
import { SMS_PROVIDER, type SmsProvider } from '../sms/sms-provider.interface.js';

interface OtpSettings {
  accessSecret: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  otpTestCodes: Map<string, string>;
  /** TEST_OTP: accepted for every number when set (never in production). */
  otpTestCodeForAll?: string;
  /** RATE_LIMIT_DISABLED: skip the resend cooldown and hourly cap (never in production). */
  rateLimitDisabled?: boolean;
}

const RESEND_COOLDOWN_MS = 30_000;
const MAX_PER_HOUR = 5;

/** Phone OTP issue/verify with hashed codes, resend cooldown, hourly cap and attempt limits. */
@Injectable()
export class OtpService {
  private readonly settings: OtpSettings;

  constructor(
    private readonly challenges: OtpChallengeRepository,
    private readonly tx: TransactionService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    config: ConfigService,
  ) {
    this.settings = config.getOrThrow<OtpSettings>('auth');
  }

  async request(phoneDigits: string): Promise<{ expiresIn: number }> {
    if (!this.settings.rateLimitDisabled) await this.assertWithinLimits(phoneDigits);
    const testCode = this.settings.otpTestCodes.get(phoneDigits) ?? this.settings.otpTestCodeForAll;
    const code = testCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.challenges.create({
      phone: phoneDigits,
      codeHash: this.hash(phoneDigits, code),
      expiresAt: new Date(Date.now() + this.settings.otpTtlSeconds * 1000),
    });
    if (!testCode) await this.sms.sendOtp(phoneDigits, code);
    return { expiresIn: this.settings.otpTtlSeconds };
  }

  /** Resend cooldown and hourly cap per number. */
  private async assertWithinLimits(phoneDigits: string): Promise<void> {
    const stats = await this.challenges.recentStats(phoneDigits, new Date(Date.now() - 3_600_000));
    if (stats.lastAt && Date.now() - stats.lastAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new AppException(HttpStatus.TOO_MANY_REQUESTS, ErrorCode.LIMIT_REACHED, 'Please wait 30 seconds before requesting another OTP.');
    }
    if (stats.count >= MAX_PER_HOUR) {
      throw new AppException(HttpStatus.TOO_MANY_REQUESTS, ErrorCode.LIMIT_REACHED, 'Too many OTP requests. Try again in an hour.');
    }
  }

  /** Consumes the latest open challenge when the code matches. */
  async verify(phoneDigits: string, code: string): Promise<void> {
    const outcome = await this.tx.run(async (manager) => {
      const challenge = await this.challenges.findLatestOpenForUpdate(phoneDigits, manager);
      if (!challenge || challenge.expiresAt.getTime() < Date.now()) return 'expired' as const;
      if (challenge.attempts >= this.settings.otpMaxAttempts) return 'locked' as const;
      const ok = this.matches(challenge.codeHash, this.hash(phoneDigits, code));
      challenge.attempts += 1;
      if (ok) challenge.consumedAt = new Date();
      await this.challenges.save(challenge, manager);
      return ok ? ('ok' as const) : ('wrong' as const);
    });
    if (outcome === 'ok') return;
    const message =
      outcome === 'expired'
        ? 'The OTP has expired. Request a new one.'
        : outcome === 'locked'
          ? 'Too many incorrect attempts. Request a new OTP.'
          : 'Incorrect OTP.';
    throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_OTP, message);
  }

  private hash(phoneDigits: string, code: string): string {
    return createHmac('sha256', this.settings.accessSecret).update(`${phoneDigits}:${code}`).digest('hex');
  }

  private matches(a: string, b: string): boolean {
    const x = Buffer.from(a, 'hex');
    const y = Buffer.from(b, 'hex');
    return x.length === y.length && timingSafeEqual(x, y);
  }
}
