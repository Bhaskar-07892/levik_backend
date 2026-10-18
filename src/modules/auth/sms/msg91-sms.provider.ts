import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { SmsProvider } from './sms-provider.interface.js';

/**
 * MSG91 Flow API (India, DLT-compliant). The flow template must contain an "otp" variable.
 * Configure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID. Not yet verified against a live account.
 */
@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger(Msg91SmsProvider.name);

  constructor(
    private readonly authKey: string,
    private readonly templateId: string,
  ) {}

  async sendOtp(phoneDigits: string, code: string): Promise<void> {
    const response = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: this.authKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ template_id: this.templateId, short_url: '0', recipients: [{ mobiles: phoneDigits, otp: code }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      this.logger.error(`MSG91 responded ${response.status}`);
      throw new ServiceUnavailableException('Could not send the OTP. Please try again.');
    }
  }
}
