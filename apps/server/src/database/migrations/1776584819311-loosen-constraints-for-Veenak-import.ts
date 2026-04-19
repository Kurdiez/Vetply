import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoosenConstraintsForVeenakImport1776584819311 implements MigrationInterface {
  name = 'LoosenConstraintsForVeenakImport1776584819311';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."supplier_enum" RENAME TO "supplier_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_enum" AS ENUM('NVS', 'VEENAK')`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_suppliers" ALTER COLUMN "name" TYPE "public"."supplier_enum" USING "name"::"text"::"public"."supplier_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."supplier_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" DROP CONSTRAINT "FK_700b1ba20872c935f6901fd00ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "manufacturer_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "sales_category" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "legal_category" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "pom" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ADD CONSTRAINT "FK_700b1ba20872c935f6901fd00ac" FOREIGN KEY ("manufacturer_id") REFERENCES "catalogue_manufacturers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" DROP CONSTRAINT "FK_700b1ba20872c935f6901fd00ac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "pom" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "legal_category" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "sales_category" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "manufacturer_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ADD CONSTRAINT "FK_700b1ba20872c935f6901fd00ac" FOREIGN KEY ("manufacturer_id") REFERENCES "catalogue_manufacturers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_enum_old" AS ENUM('NVS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_suppliers" ALTER COLUMN "name" TYPE "public"."supplier_enum_old" USING "name"::"text"::"public"."supplier_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."supplier_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."supplier_enum_old" RENAME TO "supplier_enum"`,
    );
  }
}
