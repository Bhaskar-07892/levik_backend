import { Global, Module } from '@nestjs/common';
import { AdminSettingsController, AppSettingsController } from './controllers/settings.controller.js';
import { SettingsRepository } from './repositories/settings.repository.js';
import { SettingsService } from './services/settings.service.js';

@Global()
@Module({
  controllers: [AdminSettingsController, AppSettingsController],
  providers: [SettingsRepository, SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
