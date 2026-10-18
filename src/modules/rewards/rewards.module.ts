import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { AdminRewardsController, AppRewardsController } from './controllers/rewards.controller.js';
import { RewardsRepository } from './repositories/rewards.repository.js';
import { RewardsService } from './services/rewards.service.js';

@Module({
  imports: [PointsModule],
  controllers: [AdminRewardsController, AppRewardsController],
  providers: [RewardsRepository, RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
