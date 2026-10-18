import { Module } from '@nestjs/common';
import { AdminProfileController } from './controllers/admin-profile.controller.js';
import { AdminsRepository } from './repositories/admins.repository.js';
import { AdminsService } from './services/admins.service.js';

@Module({
  controllers: [AdminProfileController],
  providers: [AdminsRepository, AdminsService],
  exports: [AdminsRepository, AdminsService],
})
export class AdminsModule {}
