import { Module } from '@nestjs/common';
import { SchemesModule } from '../schemes/schemes.module.js';
import { AdminDashboardController, AdminReportsController } from './controllers/analytics.controller.js';
import { AnalyticsRepository } from './repositories/analytics.repository.js';
import { AnalyticsService } from './services/analytics.service.js';

@Module({
  imports: [SchemesModule],
  controllers: [AdminDashboardController, AdminReportsController],
  providers: [AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
