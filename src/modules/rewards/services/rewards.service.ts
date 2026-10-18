import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import type { RewardBo, RewardInputBo, RewardQueryBo, RewardWithStatsBo } from '../bo/reward.bo.js';
import type { RewardDao } from '../dao/reward.dao.js';
import { RewardMapper } from '../mappers/reward.mapper.js';
import { RewardsRepository } from '../repositories/rewards.repository.js';

@Injectable()
export class RewardsService {
  constructor(
    private readonly rewards: RewardsRepository,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  async list(query: RewardQueryBo): Promise<Page<RewardWithStatsBo>> {
    const page = await this.rewards.findPage(query);
    const counts = await this.rewards.redeemedCounts(page.items.map((r) => r.id));
    return { ...page, items: page.items.map((r) => ({ ...RewardMapper.toBo(r), redeemedCount: counts.get(r.id) ?? 0 })) };
  }

  async get(id: string, manager?: EntityManager): Promise<RewardWithStatsBo> {
    const reward = await this.rewards.findById(id, manager);
    if (!reward) throw AppException.notFound('Reward', id);
    const counts = await this.rewards.redeemedCounts([id]);
    return { ...RewardMapper.toBo(reward), redeemedCount: counts.get(id) ?? 0 };
  }

  async create(actor: ActorBo, input: RewardInputBo): Promise<RewardWithStatsBo> {
    const id = await this.rewards.insert(input);
    await this.audit.record(actor, { action: 'Reward created', entityType: 'Reward', entityId: id, summary: `${input.name} · ${input.pointsRequired} pts` });
    return this.get(id);
  }

  async update(actor: ActorBo, id: string, patch: Partial<Omit<RewardInputBo, 'stock'>>): Promise<RewardWithStatsBo> {
    const current = await this.get(id);
    const changed = (Object.keys(patch) as Array<keyof typeof patch>).filter((k) => patch[k] !== undefined && JSON.stringify(patch[k]) !== JSON.stringify(current[k]));
    if (changed.length === 0) return current;
    await this.rewards.update(id, Object.fromEntries(changed.map((k) => [k, patch[k]])) as Partial<RewardDao>);
    const action = changed.length === 1 && changed[0] === 'isActive' ? (patch.isActive ? 'Reward activated' : 'Reward deactivated') : 'Reward edited';
    await this.audit.record(actor, { action, entityType: 'Reward', entityId: id, summary: `${current.name} · changed: ${changed.join(', ')}` });
    return this.get(id);
  }

  async adjustStock(actor: ActorBo, id: string, delta: number, reason: string): Promise<RewardWithStatsBo> {
    await this.tx.run(async (manager) => {
      const reward = await this.rewards.findByIdForUpdate(id, manager);
      if (!reward) throw AppException.notFound('Reward', id);
      if (reward.stock + delta < 0) throw AppException.rule(ErrorCode.OUT_OF_STOCK, `Stock cannot go below zero (current stock ${reward.stock}).`);
      const stock = await this.rewards.changeStock(id, delta, manager);
      await this.audit.record(actor, { action: 'Reward stock adjusted', entityType: 'Reward', entityId: id, summary: `${delta > 0 ? '+' : ''}${delta} units (now ${stock}) · ${reason}` }, manager);
    });
    return this.get(id);
  }

  /** Used by redemptions: locks the reward row for the rest of the transaction. */
  async lockForUpdate(id: string, manager: EntityManager): Promise<RewardBo> {
    const reward = await this.rewards.findByIdForUpdate(id, manager);
    if (!reward) throw AppException.notFound('Reward', id);
    return RewardMapper.toBo(reward);
  }

  changeStock(id: string, delta: number, manager: EntityManager): Promise<number> {
    return this.rewards.changeStock(id, delta, manager);
  }
}
