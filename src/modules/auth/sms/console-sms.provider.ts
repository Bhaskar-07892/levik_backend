import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider } from './sms-provider.interface.js';

/** Development provider: logs the OTP instead of sending it. Never use in production. */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');

  async sendOtp(phoneDigits: string, code: string): Promise<void> {
    this.logger.warn(`OTP for +${phoneDigits}: ${code} (console SMS provider — not delivered)`);
  }
}
