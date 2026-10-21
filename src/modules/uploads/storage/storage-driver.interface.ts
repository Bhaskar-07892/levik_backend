import type { Readable } from 'node:stream';

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

/** Object storage abstraction: local disk in development, an S3-compatible bucket (Cloudflare R2, Backblaze B2…) when deployed. */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  /** Short-lived direct download link from the bucket. Drivers without one (local disk) are streamed by the API instead. */
  signedUrl?(key: string, ttlSeconds: number): Promise<string>;
  /** Where files go, for logs (no secrets). */
  describe(): string;
  /** Throws when the storage cannot be reached with the configured settings (checked at boot). */
  check(): Promise<void>;
}

/** Upload keys are `<purpose>_<uuid>.<ext>` and generated server-side; anything else is rejected before touching storage. */
export const UPLOAD_KEY_PATTERN = /^[a-z-]+_[0-9a-f-]{36}\.[a-z]+$/;

/** Groups objects by purpose: `scan-photo/scan-photo_<uuid>.jpg`. */
export function objectPath(key: string): string {
  return `${key.split('_')[0]}/${key}`;
}
