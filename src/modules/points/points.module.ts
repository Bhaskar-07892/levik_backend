import { Module } from '@nestjs/common';
import { AdminPointsController } from './controllers/admin-points.controller.js';
import { AppWalletController } from './controllers/app-wallet.controller.js';
import { PointsRepository } from './repositories/points.repository.js';
import { PointsService } from './services/points.service.js';

@Module({
  controllers: [AdminPointsController, AppWalletController],
  providers: [PointsRepository, PointsService],
  exports: [PointsService],
})
export class PointsModule {}
