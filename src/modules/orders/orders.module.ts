import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ProductsModule } from '../products/products.module.js';
import { RetailersModule } from '../retailers/retailers.module.js';
import { AdminOrdersController, AppOrdersController, PurchaseInvoiceDocumentController } from './controllers/orders.controller.js';
import { OrdersRepository } from './repositories/orders.repository.js';
import { OrdersService } from './services/orders.service.js';

@Module({
  imports: [RetailersModule, ProductsModule, InventoryModule],
  controllers: [AdminOrdersController, AppOrdersController, PurchaseInvoiceDocumentController],
  providers: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
