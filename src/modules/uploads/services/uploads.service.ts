import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { EntityManager } from 'typeorm';
import type { UploadPurpose } from '../../../common/domain/enums.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface.js';
import { fileUrl } from '../file-url.js';
import { UploadsRepository } from '../repositories/uploads.repository.js';
import { STORAGE_DRIVER, type StorageDriver } from '../storage/storage-driver.interface.js';

const IMAGES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const ALLOWED: Record<UploadPurpose, Record<string, string>> = {
  'scan-photo': IMAGES,
  'product-image': IMAGES,
  'profile-photo': IMAGES,
  'shop-photo': IMAGES,
  'invoice-document': { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' },
};

/** Lifetime of the bucket's presigned links behind a file link redirect. */
const PRESIGNED_TTL_SECONDS = 3600;

/** Magic-byte sniffing so a renamed executable cannot be stored as an "image". */
function sniff(buffer: Buffer): string | null {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buffer.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

/** Plain-English cause for the common S3 misconfigurations, for the logs. */
export function storageHint(error: unknown): string {
  const e = error as { name?: string; code?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const name = e?.name && e.name !== 'Error' ? e.name : (e?.code ?? 'Error');
  const status = e?.$metadata?.httpStatusCode;
  const hints: Record<string, string> = {
    NoSuchBucket: 'the bucket does not exist: check S3_BUCKET matches the bucket name exactly',
    NotFound: 'bucket not found: check S3_BUCKET, and S3_FORCE_PATH_STYLE=true for Supabase',
    InvalidAccessKeyId: 'the access key id is wrong: check S3_ACCESS_KEY_ID',
    SignatureDoesNotMatch: 'the secret or region is wrong: check S3_SECRET_ACCESS_KEY and S3_REGION',
    AccessDenied: 'the key has no write access to this bucket',
    Forbidden: 'the key has no access to this bucket, or S3_REGION is wrong',
    ENOTFOUND: 'the endpoint host does not resolve: check S3_ENDPOINT (and S3_FORCE_PATH_STYLE=true for Supabase)',
  };
  // Bucket checks (HEAD) carry no error body, so only the status tells what is wrong.
  const byStatus: Record<number, string> = {
    403: 'access denied: check S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_REGION',
    404: 'bucket not found: check S3_BUCKET, and S3_FORCE_PATH_STYLE=true for Supabase',
  };
  return `${name}${status ? ` (HTTP ${status})` : ''}: ${hints[name] ?? (status ? byStatus[status] : undefined) ?? e?.message ?? 'unknown storage error'}`;
}

export interface UploadedFileInput {
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly maxBytes: number;

  constructor(
    private readonly uploads: UploadsRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    config: ConfigService,
  ) {
    this.maxBytes = config.getOrThrow<{ maxBytes: number }>('storage').maxBytes;
  }

  async save(owner: AuthenticatedUser, purpose: UploadPurpose, file: UploadedFileInput | undefined): Promise<{ key: string; url: string; contentType: string; sizeBytes: number }> {
    if (!file?.buffer?.length) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Attach a file.');
    if (file.size > this.maxBytes) throw AppException.rule(ErrorCode.VALIDATION_FAILED, `File is larger than ${Math.round(this.maxBytes / 1048576)} MB.`);
    const contentType = sniff(file.buffer);
    const extension = contentType ? ALLOWED[purpose][contentType] : undefined;
    if (!contentType || !extension) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, `Unsupported file type for ${purpose}. Allowed: ${Object.values(ALLOWED[purpose]).join(', ')}.`);
    }
    const key = `${purpose}_${randomUUID()}.${extension}`;
    try {
      await this.storage.put(key, file.buffer, contentType);
    } catch (error) {
      this.logger.error({ err: error, storage: this.storage.describe(), key }, `Could not store upload: ${storageHint(error)}`);
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.STORAGE_UNAVAILABLE, 'File storage is not reachable right now, so the file was not saved. Try again later.');
    }
    await this.uploads.insert({
      key,
      ownerId: owner.sub,
      ownerRole: owner.role,
      purpose,
      contentType,
      sizeBytes: file.size,
      originalName: file.originalname?.slice(0, 200) ?? null,
    });
    return { key, url: fileUrl(key)!, contentType, sizeBytes: file.size };
  }

  /** Ensures a participant only attaches their own uploads of the right kind. */
  async assertOwned(key: string, ownerId: string, purpose: UploadPurpose, manager?: EntityManager): Promise<void> {
    const upload = await this.uploads.findByKey(key, manager);
    if (!upload || upload.ownerId !== ownerId || upload.purpose !== purpose) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Attachment not found. Upload the file again.');
    }
  }

  /** Target of a verified signed link: a presigned bucket URL when the driver has one, else the file itself. */
  async openLink(key: string): Promise<{ redirect: string; maxAgeSeconds: number } | { stream: Readable; contentType: string }> {
    const upload = await this.uploads.findByKey(key);
    if (!upload) throw AppException.notFound('File');
    if (this.storage.signedUrl) {
      // Cache the redirect for less time than the presigned URL lives.
      return { redirect: await this.storage.signedUrl(key, PRESIGNED_TTL_SECONDS), maxAgeSeconds: PRESIGNED_TTL_SECONDS - 300 };
    }
    return { stream: await this.storage.get(key), contentType: upload.contentType };
  }

  /** For admin-managed images (any admin may reuse another admin's upload): the key exists and has this purpose. */
  async assertExists(key: string, purpose: UploadPurpose): Promise<void> {
    const upload = await this.uploads.findByKey(key);
    if (!upload || upload.purpose !== purpose) throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Image not found. Upload the file again.');
  }

  async open(key: string, requester: AuthenticatedUser): Promise<{ stream: Readable; contentType: string }> {
    const upload = await this.uploads.findByKey(key);
    if (!upload || (requester.role !== 'admin' && upload.ownerId !== requester.sub)) throw AppException.notFound('File');
    return { stream: await this.storage.get(key), contentType: upload.contentType };
  }
}
