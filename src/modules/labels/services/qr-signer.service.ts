import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalSerial } from '../utils/serial-code.js';

interface LabelSettings {
  signingSecret: string;
  /** Older secrets still accepted when verifying printed labels (QR_SIGNING_SECRETS_PREVIOUS). */
  previousSecrets?: string[];
  baseUrl: string;
}

export interface ParsedLabelCode {
  serial: string;
  /** Signature from the QR, absent for manual entry. */
  signature?: string;
}

const SIGNATURE_LENGTH = 12; // base64url chars ≈ 72 bits

/**
 * QR payload = `${QR_BASE_URL}/<serial>?k=<signature>`. The HMAC signature lets the API reject
 * counterfeit labels that were never issued by Levik, and the URL opens a verification page if a
 * customer scans it with a normal camera.
 */
@Injectable()
export class QrSignerService {
  private readonly settings: LabelSettings;

  constructor(config: ConfigService) {
    this.settings = config.getOrThrow<LabelSettings>('labels');
  }

  sign(serial: string, secret = this.settings.signingSecret): string {
    return createHmac('sha256', secret).update(serial).digest('base64url').slice(0, SIGNATURE_LENGTH);
  }

  payload(serial: string): string {
    return `${this.settings.baseUrl}/${encodeURIComponent(serial)}?k=${this.sign(serial)}`;
  }

  /** True when the signature matches the current secret or one of the previous ones. */
  verify(serial: string, signature: string): boolean {
    const actual = Buffer.from(signature);
    return [this.settings.signingSecret, ...(this.settings.previousSecrets ?? [])].some((secret) => {
      const expected = Buffer.from(this.sign(serial, secret));
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    });
  }

  /** Accepts a scanned QR payload (URL) or a typed serial. */
  parse(input: string): ParsedLabelCode | null {
    const text = input.trim();
    if (!text) return null;
    let serialPart = text;
    let signature: string | undefined;
    if (/^https?:\/\//i.test(text)) {
      try {
        const url = new URL(text);
        serialPart = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
        signature = url.searchParams.get('k') ?? undefined;
      } catch {
        return null;
      }
    }
    const canonical = canonicalSerial(serialPart);
    // Units created before label generation (legacy/demo data) keep their original serial format.
    const serial = canonical ?? (/^[A-Z0-9-]{4,64}$/i.test(serialPart) ? serialPart.toUpperCase() : null);
    return serial ? { serial, signature } : null;
  }
}
