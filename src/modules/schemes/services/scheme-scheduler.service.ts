import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SYSTEM_ACTOR } from '../../../common/bo/actor.bo.js';
import { TransactionService } from '../../../database/transaction.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { SchemesRepository } from '../repositories/schemes.repository.js';

/** Moves schemes along by date: Scheduled → Active on the start date; anything past its end → Completed. */
@Injectable()
export class SchemeSchedulerService {
  private readonly logger = new Logger(SchemeSchedulerService.name);

  constructor(
    private readonly schemes: SchemesRepository,
    private readonly tx: TransactionService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'scheme-status-by-date' })
  async run(): Promise<{ activated: string[]; completed: string[] }> {
    const result = await this.tx.run(async (manager) => {
      // Only one instance should do this work when several API replicas run.
      const [{ locked }] = await manager.query(`select pg_try_advisory_xact_lock(hashtextextended('scheme-scheduler', 0)) as locked`);
      if (!locked) return { activated: [], completed: [] };
      const changes = await this.schemes.promoteByDate(manager);
      for (const id of changes.activated) {
        await this.audit.record(SYSTEM_ACTOR, { action: 'Scheme activated', entityType: 'Scheme', entityId: id, summary: 'Start date reached' }, manager);
      }
      for (const id of changes.completed) {
        await this.audit.record(SYSTEM_ACTOR, { action: 'Scheme completed', entityType: 'Scheme', entityId: id, summary: 'End date passed' }, manager);
      }
      return changes;
    });
    if (result.activated.length || result.completed.length) this.logger.log(result, 'Scheme statuses updated by date');
    return result;
  }
}
