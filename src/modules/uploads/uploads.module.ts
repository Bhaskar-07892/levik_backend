import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesController } from './controllers/files.controller.js';
import { UploadsController } from './controllers/uploads.controller.js';
import { configureFileUrls } from './file-url.js';
import { UploadsRepository } from './repositories/uploads.repository.js';
import { UploadsService } from './services/uploads.service.js';
import { LocalStorageDriver } from './storage/local-storage.driver.js';
import { S3StorageDriver, type S3Settings } from './storage/s3-storage.driver.js';
import { STORAGE_DRIVER, type StorageDriver } from './storage/storage-driver.interface.js';

interface StorageSettings {
  driver: 'local' | 's3';
  dir: string;
  s3: S3Settings;
}

@Global()
@Module({
  controllers: [UploadsController, FilesController],
  providers: [
    UploadsRepository,
    UploadsService,
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageDriver => {
        const storage = config.getOrThrow<StorageSettings>('storage');
        return storage.driver === 's3' ? new S3StorageDriver(storage.s3) : new LocalStorageDriver(storage.dir);
      },
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {
  constructor(config: ConfigService) {
    configureFileUrls(config.getOrThrow<{ accessSecret: string }>('auth').accessSecret, config.getOrThrow<{ apiPrefix: string }>('app').apiPrefix);
  }
}
