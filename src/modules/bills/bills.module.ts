import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ProductsModule } from '../products/products.module.js';
import { RetailersModule } from '../retailers/retailers.module.js';
import { AdminBillsController, AppBillsController, BillDocumentController } from './controllers/bills.controller.js';
import { BillsRepository } from './repositories/bills.repository.js';
import { BillsService } from './services/bills.service.js';

@Module({
  imports: [RetailersModule, ProductsModule, InventoryModule],
  controllers: [AdminBillsController, AppBillsController, BillDocumentController],
  providers: [BillsRepository, BillsService],
  exports: [BillsService],
})
export class BillsModule {}
