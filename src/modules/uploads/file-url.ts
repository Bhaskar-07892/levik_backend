import { createHmac, timingSafeEqual } from 'node:crypto';
import { UPLOAD_KEY_PATTERN } from './storage/storage-driver.interface.js';

const DAY_SECONDS = 86_400;

let state: { secret: Buffer; basePath: string } | null = null;

/**
 * Called once at boot by UploadsModule. Mappers then turn stored upload keys (image IDs) into links with
 * `fileUrl(key)`, which needs no request context, so it works in the plain object mappers.
 */
export function configureFileUrls(accessSecret: string, apiPrefix: string): void {
  // A key derived from the JWT secret, so file links never share a signature with tokens.
  state = { secret: createHmac('sha256', accessSecret).update('levik:file-links').digest(), basePath: `/${apiPrefix}/v1/files` };
}

/**
 * Signed link for an upload, relative to the API origin: `/api/v1/files/<key>?exp=…&sig=…`.
 * Valid for 1–2 days. The expiry is rounded up to a day boundary, so a key's link stays identical for a
 * whole day and image caches on phones and browsers keep hitting.
 */
export function fileUrl(key: string | null | undefined, now = Date.now()): string | undefined {
  if (!key) return undefined;
  const exp = (Math.floor(now / 1000 / DAY_SECONDS) + 2) * DAY_SECONDS;
  return `${config().basePath}/${encodeURIComponent(key)}?exp=${exp}&sig=${sign(key, exp)}`;
}

/**
 * Image fields that hold either a web path / absolute URL (the bundled catalogue photos) or an upload key from
 * POST /uploads. Keys become signed links (`/api/v1/files/…`, relative to the API origin); anything else is kept.
 */
export function imageLink(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;
  return UPLOAD_KEY_PATTERN.test(stored) ? fileUrl(stored) : stored;
}

export function verifyFileLink(key: string, exp: number, sig: string, now = Date.now()): boolean {
  if (!Number.isInteger(exp) || exp * 1000 < now) return false;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function sign(key: string, exp: number): string {
  return createHmac('sha256', config().secret).update(`${key}:${exp}`).digest('base64url').slice(0, 32);
}

function config() {
  if (!state) throw new Error('File links are not configured (UploadsModule not initialised).');
  return state;
}
