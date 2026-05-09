import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSupplierListingMappingConstraint1778361650781 implements MigrationInterface {
  name = 'DropSupplierListingMappingConstraint1778361650781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP CONSTRAINT "FK_f412975cb1927738791b60e4b5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP CONSTRAINT "UQ_catalogue_product_supplier_listings_product_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ALTER COLUMN "product_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD CONSTRAINT "UQ_catalogue_product_supplier_listings_product_supplier" UNIQUE ("product_id", "supplier_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD CONSTRAINT "FK_f412975cb1927738791b60e4b5b" FOREIGN KEY ("product_id") REFERENCES "catalogue_products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP CONSTRAINT "FK_f412975cb1927738791b60e4b5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP CONSTRAINT "UQ_catalogue_product_supplier_listings_product_supplier"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ALTER COLUMN "product_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD CONSTRAINT "UQ_catalogue_product_supplier_listings_product_supplier" UNIQUE ("product_id", "supplier_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD CONSTRAINT "FK_f412975cb1927738791b60e4b5b" FOREIGN KEY ("product_id") REFERENCES "catalogue_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
