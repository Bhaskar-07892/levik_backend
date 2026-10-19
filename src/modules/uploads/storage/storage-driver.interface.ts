import type { Readable } from 'node:stream';

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

/** Object storage abstraction: local disk in development, S3-compatible storage in production. */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
}
