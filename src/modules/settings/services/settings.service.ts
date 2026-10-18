import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AuditService } from '../../audit/services/audit.service.js';
import type { SettingsBo, SettingsUpdateBo } from '../bo/settings.bo.js';
import { SettingsMapper } from '../mappers/settings.mapper.js';
import { SettingsRepository } from '../repositories/settings.repository.js';

const CACHE_TTL_MS = 30_000;

/** Programme configuration, read on hot paths (approvals, scan limits), so it is cached briefly. */
@Injectable()
export class SettingsService {
  private cache: { value: SettingsBo; expiresAt: number } | null = null;

  constructor(
    private readonly settings: SettingsRepository,
    private readonly audit: AuditService,
  ) {}

  async get(manager?: EntityManager): Promise<SettingsBo> {
    // Inside a transaction always read the committed row to avoid acting on a stale rate.
    if (manager) return SettingsMapper.toBo(await this.settings.get(manager));
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.value;
    const value = SettingsMapper.toBo(await this.settings.get());
    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  }

  async update(actor: ActorBo, patch: SettingsUpdateBo): Promise<SettingsBo> {
    const current = await this.get();
    const changed = Object.keys(patch).filter((k) => patch[k as keyof SettingsUpdateBo] !== undefined);
    await this.settings.update({
      ...patch,
      notifications: patch.notifications ? { ...current.notifications, ...patch.notifications } : undefined,
    });
    this.cache = null;
    await this.audit.record(actor, { action: 'Settings updated', entityType: 'Settings', entityId: 'SETTINGS', summary: changed.join(', ') });
    return this.get();
  }
}
