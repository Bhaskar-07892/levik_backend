import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { Page } from '../../../common/dto/pagination.dto.js';
import type { ProductUnitStatus } from '../../../common/domain/enums.js';
import { BaseRepository } from '../../../database/base.repository.js';
import type { BatchQueryBo } from '../bo/label.bo.js';
import { LabelBatchDao } from '../dao/label-batch.dao.js';
import { ProductUnitDao } from '../dao/product-unit.dao.js';

export interface BatchRow {
  id: string;
  product_id: string;
  product_name: string;
  model_code: string;
  quantity: number;
  claimed: number;
  voided: number;
  note: string | null;
  created_by: string;
  created_at: Date;
}

const BATCH_SELECT = `
  select b.id, b.product_id, p.name as product_name, p.model_code, b.quantity, b.note, b.created_by, b.created_at,
         count(u.serial) filter (where u.status = 'Claimed')::int as claimed,
         count(u.serial) filter (where u.status = 'Void')::int as voided
    from label_batches b
    join products p on p.id = b.product_id
    left join product_units u on u.batch_id = b.id`;

@Injectable()
export class LabelsRepository extends BaseRepository<ProductUnitDao> {
  constructor(dataSource: DataSource) {
    super(dataSource, ProductUnitDao);
  }

  async createBatch(row: Pick<LabelBatchDao, 'productId' | 'quantity' | 'note' | 'createdBy'>, manager: EntityManager): Promise<string> {
    const result = await manager.getRepository(LabelBatchDao).createQueryBuilder().insert().values(row).returning(['id']).execute();
    return (result.raw as Array<{ id: string }>)[0].id;
  }

  /** Bulk insert in one statement; serial collisions are skipped and reported via the inserted count. */
  async insertUnits(batchId: string, productId: string, serials: string[], manager: EntityManager): Promise<number> {
    const rows: Array<{ serial: string }> = await manager.query(
      `insert into product_units (serial, product_id, batch_id)
       select unnest($1::text[]), $2, $3
       on conflict (serial) do nothing
       returning serial`,
      [serials, productId, batchId],
    );
    return rows.length;
  }

  async findBatchPage(query: BatchQueryBo): Promise<Page<BatchRow>> {
    const params: unknown[] = [];
    const where = query.productId ? `where b.product_id = $${params.push(query.productId)}` : '';
    const [{ total }] = await this.dataSource.query(`select count(*)::int as total from label_batches b ${where}`, params);
    const items: BatchRow[] = await this.dataSource.query(
      `${BATCH_SELECT} ${where}
       group by b.id, p.name, p.model_code
       order by b.created_at desc, b.id desc
       limit $${params.push(query.pageSize)} offset $${params.push((query.page - 1) * query.pageSize)}`,
      params,
    );
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findBatch(id: string): Promise<BatchRow | undefined> {
    const rows: BatchRow[] = await this.dataSource.query(`${BATCH_SELECT} where b.id = $1 group by b.id, p.name, p.model_code`, [id]);
    return rows[0];
  }

  async batchUnits(batchId: string, offset: number, limit: number): Promise<ProductUnitDao[]> {
    return this.repo().find({ where: { batchId }, order: { serial: 'ASC' }, skip: offset, take: limit });
  }

  findUnit(serial: string, manager?: EntityManager): Promise<ProductUnitDao | null> {
    return this.repo(manager).findOne({ where: { serial }, relations: { product: true } });
  }

  findUnitForUpdate(serial: string, manager: EntityManager): Promise<ProductUnitDao | null> {
    return this.repo(manager).createQueryBuilder('u').setLock('pessimistic_write').where('u.serial = :serial', { serial }).getOne();
  }

  async setStatus(
    serial: string,
    patch: { status: ProductUnitStatus; claimedScanId?: string | null; voidReason?: string | null; claimed?: boolean },
    manager?: EntityManager,
  ): Promise<void> {
    await this.repo(manager).update(
      { serial },
      {
        status: patch.status,
        ...(patch.claimedScanId !== undefined ? { claimedScanId: patch.claimedScanId } : {}),
        ...(patch.voidReason !== undefined ? { voidReason: patch.voidReason } : {}),
        ...(patch.claimed ? { claimedAt: () => 'now()' } : {}),
      },
    );
  }
}
