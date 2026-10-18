import { Module } from '@nestjs/common';
import { AdminSupportController, AppSupportController } from './controllers/support.controller.js';
import { SupportRepository } from './repositories/support.repository.js';
import { SupportService } from './services/support.service.js';

@Module({
  controllers: [AdminSupportController, AppSupportController],
  providers: [SupportRepository, SupportService],
})
export class SupportModule {}
