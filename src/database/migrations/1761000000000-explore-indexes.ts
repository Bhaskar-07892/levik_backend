import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Explore ("which dealers stock this product") looks inventory up by product. The existing
 * unique (retailer_id, product_id) index only serves lookups by retailer.
 */
export class ExploreIndexes1761000000000 implements MigrationInterface {
  name = 'ExploreIndexes1761000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create index inventory_product_in_stock_idx on inventory (product_id, quantity desc) where quantity > 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop index if exists inventory_product_in_stock_idx`);
  }
}
