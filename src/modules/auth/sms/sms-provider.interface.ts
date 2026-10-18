export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/** Delivers one-time passwords. Swap implementations via SMS_PROVIDER without touching auth logic. */
export interface SmsProvider {
  /** @param phoneDigits E.164 digits, e.g. 919829011234 */
  sendOtp(phoneDigits: string, code: string): Promise<void>;
}
