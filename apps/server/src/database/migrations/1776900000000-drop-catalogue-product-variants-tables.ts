import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes legacy variant tables. `catalogue_variant_supplier_listings` must be
 * dropped first because it references `catalogue_product_variants`.
 */
export class DropCatalogueProductVariantsTables1776900000000 implements MigrationInterface {
  name = 'DropCatalogueProductVariantsTables1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "catalogue_variant_supplier_listings"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "catalogue_product_variants"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    void queryRunner;
    throw new Error(
      'DropCatalogueProductVariantsTables1776900000000 is irreversible',
    );
  }
}
