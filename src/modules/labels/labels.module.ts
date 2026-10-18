import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module.js';
import { AdminLabelsController } from './controllers/admin-labels.controller.js';
import { AppLabelsController, PublicLabelsController } from './controllers/app-labels.controller.js';
import { LabelsRepository } from './repositories/labels.repository.js';
import { LabelSheetService } from './services/label-sheet.service.js';
import { LabelsService } from './services/labels.service.js';
import { QrSignerService } from './services/qr-signer.service.js';

@Module({
  imports: [ProductsModule],
  controllers: [AdminLabelsController, AppLabelsController, PublicLabelsController],
  providers: [LabelsRepository, LabelsService, LabelSheetService, QrSignerService],
  exports: [LabelsService, QrSignerService],
})
export class LabelsModule {}
