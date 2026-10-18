import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { AdminRetailersController } from './controllers/admin-retailers.controller.js';
import { AppRetailersController, AppStoresController } from './controllers/app-retailers.controller.js';
import { RetailersRepository } from './repositories/retailers.repository.js';
import { RetailersService } from './services/retailers.service.js';

@Module({
  imports: [PointsModule],
  controllers: [AdminRetailersController, AppRetailersController, AppStoresController],
  providers: [RetailersRepository, RetailersService],
  exports: [RetailersService],
})
export class RetailersModule {}
