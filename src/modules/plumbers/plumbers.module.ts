import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { AdminPlumbersController } from './controllers/admin-plumbers.controller.js';
import { AppPlumbersController } from './controllers/app-plumbers.controller.js';
import { PlumbersRepository } from './repositories/plumbers.repository.js';
import { PlumbersService } from './services/plumbers.service.js';

@Module({
  imports: [PointsModule],
  controllers: [AdminPlumbersController, AppPlumbersController],
  providers: [PlumbersRepository, PlumbersService],
  exports: [PlumbersService],
})
export class PlumbersModule {}
