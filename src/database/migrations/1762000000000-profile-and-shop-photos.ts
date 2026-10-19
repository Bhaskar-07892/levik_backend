import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Profile photos for plumbers and retailers, and a shop photo for retailers. Each column holds an upload
 * key (the image ID in `uploads`); the API turns it into a signed link.
 */
export class ProfileAndShopPhotos1762000000000 implements MigrationInterface {
  name = 'ProfileAndShopPhotos1762000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter type upload_purpose add value if not exists 'profile-photo'`);
    await queryRunner.query(`alter type upload_purpose add value if not exists 'shop-photo'`);
    await queryRunner.query(`alter table plumbers add column photo_key text references uploads (key) on delete set null`);
    await queryRunner.query(`alter table retailers add column photo_key text references uploads (key) on delete set null`);
    await queryRunner.query(`alter table retailers add column shop_photo_key text references uploads (key) on delete set null`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`alter table retailers drop column if exists shop_photo_key`);
    await queryRunner.query(`alter table retailers drop column if exists photo_key`);
    await queryRunner.query(`alter table plumbers drop column if exists photo_key`);
    // Postgres cannot drop enum values; the two upload purposes stay (unused) after a revert.
  }
}
