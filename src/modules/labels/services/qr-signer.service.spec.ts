import { ConfigService } from '@nestjs/config';
import { generateSerial } from '../utils/serial-code.js';
import { QrSignerService } from './qr-signer.service.js';

const signer = (secret = 'unit-test-secret-unit-test-secret-1234', previousSecrets: string[] = []) =>
  new QrSignerService(new ConfigService({ labels: { signingSecret: secret, previousSecrets, baseUrl: 'https://levik.in/v' } }));

describe('QrSignerService', () => {
  const qr = signer();
  const serial = generateSerial();

  it('builds a payload that parses back to the serial and a valid signature', () => {
    const payload = qr.payload(serial);
    expect(payload).toMatch(/^https:\/\/levik\.in\/v\/LVK-[\w-]+\?k=[\w-]{12}$/);
    const parsed = qr.parse(payload)!;
    expect(parsed.serial).toBe(serial);
    expect(qr.verify(parsed.serial, parsed.signature!)).toBe(true);
  });

  it('rejects tampered signatures, other serials and other secrets', () => {
    const sig = qr.sign(serial);
    expect(qr.verify(serial, `${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`)).toBe(false);
    expect(qr.verify(serial, sig.slice(0, 6))).toBe(false);
    expect(qr.verify(generateSerial(), sig)).toBe(false);
    expect(signer('a-different-secret-a-different-secret').verify(serial, sig)).toBe(false);
  });

  it('accepts a typed serial without a signature', () => {
    expect(qr.parse(serial.toLowerCase())).toEqual({ serial, signature: undefined });
  });

  it('accepts labels signed with a previous secret and signs new ones with the current secret', () => {
    const old = signer('the-old-secret-the-old-secret-0123456789');
    const rotated = signer('the-new-secret-the-new-secret-0123456789', ['the-old-secret-the-old-secret-0123456789']);
    const printed = old.sign(serial);
    expect(rotated.verify(serial, printed)).toBe(true);
    expect(rotated.sign(serial)).not.toBe(printed);
    expect(old.verify(serial, rotated.sign(serial))).toBe(false);
    expect(rotated.verify(serial, signer('an-unknown-secret-an-unknown-secret-01').sign(serial))).toBe(false);
  });

  it('keeps legacy serials and rejects junk', () => {
    expect(qr.parse('lv-1012-a7f3')).toEqual({ serial: 'LV-1012-A7F3', signature: undefined });
    expect(qr.parse('   ')).toBeNull();
    expect(qr.parse('<script>')).toBeNull();
    expect(qr.parse('https://')).toBeNull();
  });
});
