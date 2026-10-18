import { Global, Module } from '@nestjs/common';
import { AdminAuditController } from './controllers/admin-audit.controller.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { StatusEventRepository } from './repositories/status-event.repository.js';
import { AuditService } from './services/audit.service.js';

/** Global: almost every module records audit entries and status events. */
@Global()
@Module({
  controllers: [AdminAuditController],
  providers: [AuditLogRepository, StatusEventRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
