import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NotFoundException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { objectPath, UPLOAD_KEY_PATTERN, type StorageDriver } from './storage-driver.interface.js';

export interface S3Settings {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/** Private S3-compatible bucket. Objects are never public: clients get short-lived presigned links. */
export class S3StorageDriver implements StorageDriver {
  private readonly bucket: string;

  constructor(
    settings: S3Settings,
    private readonly client = new S3Client({
      endpoint: settings.endpoint,
      region: settings.region,
      forcePathStyle: settings.forcePathStyle,
      credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    }),
  ) {
    this.bucket = settings.bucket;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.path(key),
        Body: body,
        ContentType: contentType,
        // Keys are unique and never rewritten, so the bytes behind a key never change.
        CacheControl: 'private, max-age=31536000, immutable',
      }),
    );
  }

  async get(key: string): Promise<Readable> {
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.path(key) }));
      return object.Body as Readable;
    } catch (error) {
      if (error instanceof NoSuchKey) throw new NotFoundException('File not found');
      throw error;
    }
  }

  signedUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: this.path(key) }), { expiresIn: ttlSeconds });
  }

  private path(key: string): string {
    if (!UPLOAD_KEY_PATTERN.test(key)) throw new NotFoundException('File not found');
    return objectPath(key);
  }
}
