import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsController } from './controllers/uploads.controller.js';
import { UploadsRepository } from './repositories/uploads.repository.js';
import { UploadsService } from './services/uploads.service.js';
import { LocalStorageDriver } from './storage/local-storage.driver.js';
import { STORAGE_DRIVER } from './storage/storage-driver.interface.js';

@Global()
@Module({
  controllers: [UploadsController],
  providers: [
    UploadsRepository,
    UploadsService,
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new LocalStorageDriver(config.getOrThrow<{ dir: string }>('storage').dir),
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
