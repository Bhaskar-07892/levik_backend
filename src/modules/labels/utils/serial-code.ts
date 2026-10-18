import { randomBytes } from 'node:crypto';

/** Crockford base32: no I, L, O, U — easy to read aloud and to type from a label. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const RANDOM_LENGTH = 10; // 50 bits of entropy per unit
const PREFIX = 'LVK';

function checkChar(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += ALPHABET.indexOf(body[i]) * (i + 1);
  return ALPHABET[sum % 32];
}

/** Generates a serial like "LVK-7K3QX-9MP2D-4" (10 random chars + 1 check char). */
export function generateSerial(): string {
  const bytes = randomBytes(RANDOM_LENGTH);
  let body = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) body += ALPHABET[bytes[i] & 31];
  return `${PREFIX}-${body.slice(0, 5)}-${body.slice(5)}-${checkChar(body)}`;
}

/**
 * Normalises manual entry ("lvk 7k3qx 9mp2d 4", "LVK7K3QX9MP2D4", O→0, I/L→1) to the canonical form.
 * Returns null when the input is not a well-formed serial or its check character is wrong.
 */
export function canonicalSerial(input: string): string | null {
  let raw = input.toUpperCase().replace(/[\s-]/g, '');
  if (raw.startsWith(PREFIX)) raw = raw.slice(PREFIX.length);
  raw = raw.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (raw.length !== RANDOM_LENGTH + 1 || [...raw].some((c) => !ALPHABET.includes(c))) return null;
  const body = raw.slice(0, RANDOM_LENGTH);
  if (checkChar(body) !== raw[RANDOM_LENGTH]) return null;
  return `${PREFIX}-${body.slice(0, 5)}-${body.slice(5)}-${raw[RANDOM_LENGTH]}`;
}
