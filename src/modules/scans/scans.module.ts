import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { LabelsModule } from '../labels/labels.module.js';
import { PlumbersModule } from '../plumbers/plumbers.module.js';
import { PointsModule } from '../points/points.module.js';
import { RetailersModule } from '../retailers/retailers.module.js';
import { SchemesModule } from '../schemes/schemes.module.js';
import { BillsModule } from '../bills/bills.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AdminScansController, AppSalesController, AppScansController } from './controllers/scans.controller.js';
import { ScansRepository } from './repositories/scans.repository.js';
import { ScansService } from './services/scans.service.js';

@Module({
  imports: [LabelsModule, PlumbersModule, RetailersModule, InvoicesModule, PointsModule, SchemesModule, InventoryModule, BillsModule],
  controllers: [AdminScansController, AppScansController, AppSalesController],
  providers: [ScansRepository, ScansService],
})
export class ScansModule {}
