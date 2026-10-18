import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

/** Unit of work: runs a callback in one database transaction (commit on success, rollback on throw). */
@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction('READ COMMITTED', work);
  }

  /**
   * Serialises concurrent work on the same key until the transaction ends
   * (e.g. every balance-changing operation for one participant).
   */
  async lock(manager: EntityManager, key: string): Promise<void> {
    await manager.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
  }
}
