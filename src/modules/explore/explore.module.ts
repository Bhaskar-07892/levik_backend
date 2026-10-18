import { Module } from '@nestjs/common';
import { AppExploreController } from './controllers/app-explore.controller.js';
import { ExploreRepository } from './repositories/explore.repository.js';
import { ExploreService } from './services/explore.service.js';

/** Read-only "where to buy and what it earns" views for the mobile app (SettingsService is global). */
@Module({
  controllers: [AppExploreController],
  providers: [ExploreRepository, ExploreService],
})
export class ExploreModule {}
