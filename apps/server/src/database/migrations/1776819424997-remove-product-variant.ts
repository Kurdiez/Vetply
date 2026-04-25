import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductVariant1776819424997 implements MigrationInterface {
  name = 'RemoveProductVariant1776819424997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "catalogue_product_supplier_listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "supplier_id" uuid NOT NULL, "variant_ref" character varying(128) NOT NULL, "name" character varying(2048) NOT NULL, "listed_price" numeric(14,4), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_catalogue_product_supplier_listings_product_supplier" UNIQUE ("product_id", "supplier_id"), CONSTRAINT "UQ_catalogue_product_supplier_listings_supplier_variant_ref" UNIQUE ("supplier_id", "variant_ref"), CONSTRAINT "PK_5187ac14d2b9d9bd192bd36463c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ADD "unit_type" "public"."catalog_unit_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ADD "unit_quantity" numeric(18,6) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD CONSTRAINT "FK_f412975cb1927738791b60e4b5b" FOREIGN KEY ("product_id") REFERENCES "catalogue_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" ADD CONSTRAINT "FK_1d9e5cf52532d7a1ac3cd00a68f" FOREIGN KEY ("supplier_id") REFERENCES "catalogue_suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP CONSTRAINT "FK_1d9e5cf52532d7a1ac3cd00a68f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_product_supplier_listings" DROP CONSTRAINT "FK_f412975cb1927738791b60e4b5b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" DROP COLUMN "unit_quantity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" DROP COLUMN "unit_type"`,
    );
    await queryRunner.query(`DROP TABLE "catalogue_product_supplier_listings"`);
  }
}
