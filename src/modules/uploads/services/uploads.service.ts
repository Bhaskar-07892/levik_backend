import { Inject, Injectable } from '@nestjs/common';
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

export interface UploadedFileInput {
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Injectable()
export class UploadsService {
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
    await this.storage.put(key, file.buffer, contentType);
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

  async open(key: string, requester: AuthenticatedUser): Promise<{ stream: Readable; contentType: string }> {
    const upload = await this.uploads.findByKey(key);
    if (!upload || (requester.role !== 'admin' && upload.ownerId !== requester.sub)) throw AppException.notFound('File');
    return { stream: await this.storage.get(key), contentType: upload.contentType };
  }
}
