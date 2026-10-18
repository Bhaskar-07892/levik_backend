import { Module } from '@nestjs/common';
import { AdminProductsController } from './controllers/admin-products.controller.js';
import { AppProductsController } from './controllers/app-products.controller.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { ProductsService } from './services/products.service.js';

@Module({
  controllers: [AdminProductsController, AppProductsController],
  providers: [ProductsRepository, ProductsService],
  exports: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
