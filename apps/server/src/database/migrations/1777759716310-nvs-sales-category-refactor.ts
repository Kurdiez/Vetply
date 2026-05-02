import { MigrationInterface, QueryRunner } from 'typeorm';

export class NvsSalesCategoryRefactor1777759716310 implements MigrationInterface {
  name = 'NvsSalesCategoryRefactor1777759716310';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalogue_products_import_lookup"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."sales_category_enum" RENAME TO "sales_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_category_enum" AS ENUM('Consumables', 'Retail', 'Petfood', 'Equipment', 'Pharmaceutical', 'Instruments')`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "sales_category" TYPE "public"."sales_category_enum" USING "sales_category"::"text"::"public"."sales_category_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."sales_category_enum_old"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_catalogue_products_import_lookup" ON "catalogue_products" ("manufacturer_id", "sales_category", "legal_category", "pom", "name") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_catalogue_products_import_lookup"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sales_category_enum_old" AS ENUM('Anaesthetics', 'Anti-inflammatory', 'Antimicrobial', 'Cancer', 'Cardiac/Respiratory', 'Combi Ecto/Endo - SA', 'Consumables', 'Dental', 'Dermatology', 'Diagnostics', 'Diets', 'Ear/Eye', 'Ectos - Equine', 'Ectos - LA', 'Ectos - SA', 'Endectos - LA', 'Endocrine', 'Endos - Equine', 'Endos - LA', 'Endos - SA', 'GSL', 'Gastro', 'Instruments/Equipment', 'Misc', 'Musculoskeletal', 'NVS Admin', 'Neurology', 'Nutrients', 'Obstetrics', 'Reproduction', 'Urinary', 'Vaccines - Equine', 'Vaccines - LA', 'Vaccines - SA', 'Vascular/Haemorhage', 'WRS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_products" ALTER COLUMN "sales_category" TYPE "public"."sales_category_enum_old" USING "sales_category"::"text"::"public"."sales_category_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."sales_category_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."sales_category_enum_old" RENAME TO "sales_category_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_catalogue_products_import_lookup" ON "catalogue_products" ("manufacturer_id", "sales_category", "legal_category", "name", "pom") `,
    );
  }
}
