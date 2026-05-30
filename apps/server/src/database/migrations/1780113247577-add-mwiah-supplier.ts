import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMwiahSupplier1780113247577 implements MigrationInterface {
  name = 'AddMwiahSupplier1780113247577';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."supplier_enum" RENAME TO "supplier_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_enum" AS ENUM('NVS', 'VEENAK', 'COVETRUS', 'MWIAH')`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalogue_suppliers" ALTER COLUMN "name" TYPE "public"."supplier_enum" USING "name"::"text"::"public"."supplier_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."supplier_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."supplier_enum_old" AS ENUM('NVS', 'VEENAK', 'COVETRUS')`,
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
