import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameSupplierProductId1776985121620 implements MigrationInterface {
    name = 'RenameSupplierProductId1776985121620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "catalogue_product_supplier_listings" RENAME COLUMN "variant_ref" TO "supplier_product_id"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "catalogue_product_supplier_listings" RENAME COLUMN "supplier_product_id" TO "variant_ref"`);
    }

}
