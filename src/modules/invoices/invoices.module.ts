import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module.js';
import { ProductsModule } from '../products/products.module.js';
import { RetailersModule } from '../retailers/retailers.module.js';
import { SchemesModule } from '../schemes/schemes.module.js';
import { AdminInvoicesController, AppInvoicesController } from './controllers/invoices.controller.js';
import { InvoicesRepository } from './repositories/invoices.repository.js';
import { InvoicesService } from './services/invoices.service.js';

@Module({
  imports: [PointsModule, ProductsModule, RetailersModule, SchemesModule],
  controllers: [AdminInvoicesController, AppInvoicesController],
  providers: [InvoicesRepository, InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
