import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { LabelsModule } from '../labels/labels.module.js';
import { PlumbersModule } from '../plumbers/plumbers.module.js';
import { PointsModule } from '../points/points.module.js';
import { RetailersModule } from '../retailers/retailers.module.js';
import { SchemesModule } from '../schemes/schemes.module.js';
import { AdminScansController, AppScansController } from './controllers/scans.controller.js';
import { ScansRepository } from './repositories/scans.repository.js';
import { ScansService } from './services/scans.service.js';

@Module({
  imports: [LabelsModule, PlumbersModule, RetailersModule, InvoicesModule, PointsModule, SchemesModule],
  controllers: [AdminScansController, AppScansController],
  providers: [ScansRepository, ScansService],
})
export class ScansModule {}
