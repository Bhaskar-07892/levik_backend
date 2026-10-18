import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { RewardsModule } from '../rewards/rewards.module.js';
import { AdminRedemptionsController, AppRedemptionsController } from './controllers/redemptions.controller.js';
import { RedemptionsRepository } from './repositories/redemptions.repository.js';
import { RedemptionsService } from './services/redemptions.service.js';

@Module({
  imports: [PointsModule, RewardsModule],
  controllers: [AdminRedemptionsController, AppRedemptionsController],
  providers: [RedemptionsRepository, RedemptionsService],
})
export class RedemptionsModule {}
