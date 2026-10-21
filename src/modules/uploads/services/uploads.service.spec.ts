import { ConfigService } from '@nestjs/config';
import { configureFileUrls } from '../file-url.js';
import type { UploadsRepository } from '../repositories/uploads.repository.js';
import type { StorageDriver } from '../storage/storage-driver.interface.js';
import { storageHint, UploadsService } from './uploads.service.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const admin = { sub: 'admin-1', role: 'admin' } as never;

function service(put: StorageDriver['put']) {
  const insert = vi.fn();
  const storage: StorageDriver = { put, get: vi.fn(), describe: () => 'test bucket', check: vi.fn() };
  const uploads = new UploadsService({ insert } as unknown as UploadsRepository, storage, new ConfigService({ storage: { maxBytes: 1024 * 1024 } }));
  return { uploads, insert };
}

describe('UploadsService storage failures', () => {
  beforeAll(() => configureFileUrls('unit-test-secret-unit-test-secret-1234', 'api'));

  it('stores the file, records it and returns its key and link', async () => {
    const { uploads, insert } = service(vi.fn().mockResolvedValue(undefined));
    const result = await uploads.save(admin, 'product-image', { buffer: png, size: png.length, originalname: 'wc.png' });
    expect(result.key).toMatch(/^product-image_[0-9a-f-]{36}\.png$/);
    expect(result.url).toMatch(/^\/api\/v1\/files\//);
    expect(insert).toHaveBeenCalledOnce();
  });

  it('answers 503 STORAGE_UNAVAILABLE (not a bare 500) and records nothing when the bucket rejects the file', async () => {
    const failure = Object.assign(new Error('The specified bucket does not exist'), { name: 'NoSuchBucket', $metadata: { httpStatusCode: 404 } });
    const { uploads, insert } = service(vi.fn().mockRejectedValue(failure));
    await expect(uploads.save(admin, 'product-image', { buffer: png, size: png.length, originalname: 'wc.png' })).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
      status: 503,
    });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('storageHint', () => {
  it('explains the common S3 misconfigurations', () => {
    expect(storageHint(Object.assign(new Error('x'), { name: 'NoSuchBucket', $metadata: { httpStatusCode: 404 } }))).toBe(
      'NoSuchBucket (HTTP 404): the bucket does not exist: check S3_BUCKET matches the bucket name exactly',
    );
    expect(storageHint(Object.assign(new Error('x'), { name: 'SignatureDoesNotMatch' }))).toContain('S3_SECRET_ACCESS_KEY');
    expect(storageHint(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }))).toContain('S3_ENDPOINT');
    expect(storageHint(new Error('socket hang up'))).toBe('Error: socket hang up');
    expect(storageHint(Object.assign(new Error('UnknownError'), { name: 'Unknown', $metadata: { httpStatusCode: 403 } }))).toContain('S3_SECRET_ACCESS_KEY');
  });
});
