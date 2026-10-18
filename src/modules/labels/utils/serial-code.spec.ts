import { canonicalSerial, generateSerial } from './serial-code.js';

describe('serial codes', () => {
  it('generates well-formed, self-validating serials', () => {
    for (let i = 0; i < 500; i++) {
      const serial = generateSerial();
      expect(serial).toMatch(/^LVK-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]$/);
      expect(canonicalSerial(serial)).toBe(serial);
    }
  });

  it('does not repeat across a large sample', () => {
    const set = new Set(Array.from({ length: 20_000 }, generateSerial));
    expect(set.size).toBe(20_000);
  });

  it('normalises manual entry: case, spacing, missing prefix and look-alike letters', () => {
    const serial = generateSerial();
    const body = serial.slice(4).replace(/-/g, '');
    expect(canonicalSerial(body.toLowerCase())).toBe(serial);
    expect(canonicalSerial(` lvk ${body.slice(0, 5)} ${body.slice(5)} `)).toBe(serial);
    const withLookAlikes = body.replace(/0/g, 'O').replace(/1/g, 'I');
    expect(canonicalSerial(withLookAlikes)).toBe(serial);
  });

  it('rejects typos via the check character', () => {
    const serial = generateSerial();
    const chars = serial.split('');
    const i = 4; // first body character
    chars[i] = chars[i] === 'A' ? 'B' : 'A';
    expect(canonicalSerial(chars.join(''))).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(canonicalSerial('')).toBeNull();
    expect(canonicalSerial('LVK-123')).toBeNull();
    expect(canonicalSerial('LVK-UUUUU-UUUUU-U')).toBeNull();
  });
});
