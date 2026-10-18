import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { RetailersModule } from '../retailers/retailers.module.js';
import { AdminInventoryController, AppInventoryController } from './controllers/inventory.controller.js';
import { InventoryRepository } from './repositories/inventory.repository.js';
import { InventoryService } from './services/inventory.service.js';

@Module({
  imports: [RetailersModule, ProductsModule],
  controllers: [AdminInventoryController, AppInventoryController],
  providers: [InventoryRepository, InventoryService],
})
export class InventoryModule {}
