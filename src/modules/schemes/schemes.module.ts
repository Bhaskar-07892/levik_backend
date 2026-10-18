import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { AdminSchemesController, AppSchemesController } from './controllers/schemes.controller.js';
import { SchemesRepository } from './repositories/schemes.repository.js';
import { SchemeAwardsService } from './services/scheme-awards.service.js';
import { SchemeSchedulerService } from './services/scheme-scheduler.service.js';
import { SchemesService } from './services/schemes.service.js';

@Module({
  imports: [PointsModule],
  controllers: [AdminSchemesController, AppSchemesController],
  providers: [SchemesRepository, SchemesService, SchemeAwardsService, SchemeSchedulerService],
  exports: [SchemeAwardsService, SchemesService],
})
export class SchemesModule {}
