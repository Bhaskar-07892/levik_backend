import type { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/**
 * Base for all repositories. Every method accepts an optional EntityManager so the same repository
 * call can run standalone or inside a service-level transaction.
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  protected constructor(
    protected readonly dataSource: DataSource,
    private readonly entity: EntityTarget<T>,
  ) {}

  protected repo(manager?: EntityManager): Repository<T> {
    return (manager ?? this.dataSource.manager).getRepository(this.entity);
  }

  protected manager(manager?: EntityManager): EntityManager {
    return manager ?? this.dataSource.manager;
  }
}
