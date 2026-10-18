import { Injectable } from '@nestjs/common';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { AuditService } from '../../audit/services/audit.service.js';
import type { AdminBo } from '../bo/admin.bo.js';
import { AdminMapper } from '../mappers/admin.mapper.js';
import { AdminsRepository } from '../repositories/admins.repository.js';

@Injectable()
export class AdminsService {
  constructor(
    private readonly admins: AdminsRepository,
    private readonly audit: AuditService,
  ) {}

  async profile(id: string): Promise<AdminBo> {
    const admin = await this.admins.findById(id);
    if (!admin) throw AppException.notFound('Admin');
    return AdminMapper.toBo(admin);
  }

  async rename(actor: ActorBo, id: string, name: string): Promise<AdminBo> {
    await this.admins.updateName(id, name);
    await this.audit.record(actor, { action: 'Admin profile updated', entityType: 'Settings', entityId: id, summary: `Display name set to ${name}` });
    return this.profile(id);
  }
}
