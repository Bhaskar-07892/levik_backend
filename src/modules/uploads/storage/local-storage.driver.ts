import { NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageDriver } from './storage-driver.interface.js';

/** Stores objects under STORAGE_DIR. Keys are generated server-side and never contain path separators. */
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(dir: string) {
    this.root = resolve(dir);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body, { flag: 'wx' });
  }

  async get(key: string): Promise<Readable> {
    const path = this.pathFor(key);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('File not found');
    }
    return createReadStream(path);
  }

  private pathFor(key: string): string {
    if (!/^[a-z-]+_[0-9a-f-]{36}\.[a-z]+$/.test(key)) throw new NotFoundException('File not found');
    const [folder] = key.split('_');
    return join(this.root, folder, key);
  }
}
