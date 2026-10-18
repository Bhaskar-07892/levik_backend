import { HttpStatus, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ActorBo } from '../../../common/bo/actor.bo.js';
import { AppException, ErrorCode } from '../../../common/errors/app.exception.js';
import type { Page } from '../../../common/dto/pagination.dto.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository.js';
import type { LedgerQueryBo, PointsBalanceBo, PointsTransactionBo, PostPointsBo } from '../bo/points.bo.js';
import { PointsMapper } from '../mappers/points.mapper.js';
import { PointsRepository } from '../repositories/points.repository.js';

/** The only place points are written. Balances are always derived from the ledger. */
@Injectable()
export class PointsService {
  constructor(
    private readonly points: PointsRepository,
    private readonly participants: ParticipantsRepository,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  /** Serialises every balance-changing operation for one participant until the transaction ends. */
  lockParticipant(manager: EntityManager, userId: string): Promise<void> {
    return this.tx.lock(manager, `points:${userId}`);
  }

  available(userId: string, manager?: EntityManager): Promise<number> {
    return this.points.available(userId, manager);
  }

  /** Posts one ledger entry (+ audit). Must be called inside a transaction. */
  async post(manager: EntityManager, actor: ActorBo, entry: PostPointsBo): Promise<string> {
    if (!Number.isInteger(entry.amount) || entry.amount === 0) {
      throw AppException.rule(ErrorCode.VALIDATION_FAILED, 'Points amount must be a non-zero whole number.');
    }
    const id = await this.points.insert(
      {
        userId: entry.userId,
        userRole: entry.role,
        source: entry.source,
        relatedType: entry.related?.type ?? null,
        relatedId: entry.related?.id ?? null,
        credit: Math.max(entry.amount, 0),
        debit: Math.max(-entry.amount, 0),
        note: entry.note,
        createdBy: actor.name,
      },
      manager,
    );
    await this.audit.record(
      actor,
      {
        action: entry.amount > 0 ? 'Points credited' : 'Points debited',
        entityType: 'Points',
        entityId: id,
        summary: `${Math.abs(entry.amount)} pts ${entry.amount > 0 ? 'credited to' : 'debited from'} ${entry.userId} · ${entry.source}`,
      },
      manager,
    );
    return id;
  }

  /** Manual credit/debit by an admin. A reason is mandatory and a debit can never overdraw. */
  adjust(actor: ActorBo, userId: string, amount: number, reason: string): Promise<string> {
    return this.tx.run(async (manager) => {
      const participant = await this.participants.findById(userId, manager);
      if (!participant) throw AppException.notFound('User', userId);
      await this.lockParticipant(manager, userId);
      if (amount < 0 && (await this.points.available(userId, manager)) + amount < 0) {
        throw AppException.rule(ErrorCode.INSUFFICIENT_POINTS, 'A debit adjustment cannot make the balance negative.');
      }
      return this.post(manager, actor, { userId, role: participant.role, source: 'Manual Adjustment', amount, note: reason });
    });
  }

  async balance(userId: string): Promise<PointsBalanceBo> {
    const row = await this.points.balance(userId);
    const participant = row ? undefined : await this.participants.findById(userId);
    if (!row && !participant) throw AppException.notFound('User', userId);
    return row ? PointsMapper.balanceToBo(row) : { userId, userRole: participant!.role, lifetime: 0, redeemed: 0, available: 0 };
  }

  /** Balances for many participants in one query (list pages). Missing users have zero balances. */
  async balances(userIds: string[]): Promise<Map<string, PointsBalanceBo>> {
    const rows = await this.points.balances(userIds);
    return new Map([...rows].map(([id, row]) => [id, PointsMapper.balanceToBo(row)]));
  }

  async ledger(query: LedgerQueryBo): Promise<Page<PointsTransactionBo>> {
    const page = await this.points.findPage(query);
    const names = await this.participants.findByIds(page.items.map((t) => t.userId));
    return { ...page, items: page.items.map((t) => PointsMapper.txnToBo(t, names.get(t.userId)?.name)) };
  }

  totals(query: LedgerQueryBo) {
    return this.points.totals(query);
  }

  async transaction(id: string): Promise<PointsTransactionBo> {
    const row = await this.points.findById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, `Transaction ${id} not found.`);
    const participant = await this.participants.findById(row.userId);
    return PointsMapper.txnToBo(row, participant?.name);
  }
}
