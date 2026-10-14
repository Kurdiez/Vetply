import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductCategoryRelatedColumns1791770076547 implements MigrationInterface {
  name = 'ProductCategoryRelatedColumns1791770076547';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD "product_category" character varying(512)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."catalogue_product_supplier_listings_product_category_status_enum" AS ENUM('confident', 'needs_review', 'reviewed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD "product_category_status" "public"."catalogue_product_supplier_listings_product_category_status_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalogue_product_supplier_listings_product_category_status" ON "catalogue_product_supplier_listings" ("product_category_status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalogue_product_supplier_listings_product_category_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP COLUMN "product_category_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."catalogue_product_supplier_listings_product_category_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP COLUMN "product_category"`,
    );
  }
}
