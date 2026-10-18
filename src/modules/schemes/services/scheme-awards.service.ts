import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import type { UserRole } from '../../../common/domain/enums.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { PointsService } from '../../points/services/points.service.js';
import type { AwardedSchemeBo, SchemeImpactBo } from '../bo/scheme.bo.js';
import type { SchemeDao } from '../dao/scheme.dao.js';
import { SchemesRepository } from '../repositories/schemes.repository.js';

/**
 * Pays one-time scheme bonuses. Called inside the approval transaction of a scan or invoice, after the
 * approval itself is written, so the new progress already includes it.
 */
@Injectable()
export class SchemeAwardsService {
  constructor(
    private readonly schemes: SchemesRepository,
    private readonly points: PointsService,
    private readonly audit: AuditService,
  ) {}

  async evaluate(manager: EntityManager, actor: ActorBo, userId: string, role: UserRole): Promise<AwardedSchemeBo[]> {
    const awarded: AwardedSchemeBo[] = [];
    for (const scheme of await this.schemes.findLive(role, manager)) {
      const progress = (await this.schemes.progress(scheme, [userId], manager)).get(userId) ?? 0;
      if (progress < scheme.targetValue) continue;
      // The award row is the idempotency key: concurrent approvals cannot pay the bonus twice.
      if (!(await this.schemes.tryInsertAward(scheme.id, userId, manager))) continue;
      const txnId = await this.points.post(manager, actor, {
        userId,
        role,
        source: 'Scheme Bonus',
        amount: scheme.incentivePoints,
        note: `Target achieved: ${scheme.name}`,
        related: { type: 'scheme', id: scheme.id },
      });
      await this.schemes.setAwardTransaction(scheme.id, userId, txnId, manager);
      await this.audit.record(
        actor,
        { action: 'Scheme target achieved', entityType: 'Scheme', entityId: scheme.id, summary: `${userId} earned ${scheme.incentivePoints} bonus points` },
        manager,
      );
      awarded.push({ id: scheme.id, name: scheme.name, incentivePoints: scheme.incentivePoints });
    }
    return awarded;
  }

  /**
   * Preview for reviewers. `delta(scheme)` = how much this transaction adds to the scheme's progress
   * (1 scan, or the eligible invoice value), or 0 if it doesn't count.
   */
  async impacts(userId: string, role: UserRole, delta: (scheme: SchemeDao) => number): Promise<SchemeImpactBo[]> {
    const live = await this.schemes.findLive(role);
    if (live.length === 0) return [];
    const awards = await this.schemes.awardsForUser(userId);
    const impacts: SchemeImpactBo[] = [];
    for (const scheme of live) {
      const before = (await this.schemes.progress(scheme, [userId])).get(userId) ?? 0;
      const after = before + delta(scheme);
      const alreadyAwarded = awards.has(scheme.id);
      if (after === before && !alreadyAwarded) continue;
      impacts.push({
        schemeId: scheme.id,
        schemeName: scheme.name,
        targetType: scheme.targetType,
        targetValue: scheme.targetValue,
        incentivePoints: scheme.incentivePoints,
        before,
        after,
        alreadyAwarded,
        willAward: !alreadyAwarded && after >= scheme.targetValue,
      });
    }
    return impacts;
  }
}
