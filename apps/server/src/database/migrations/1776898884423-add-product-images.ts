import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductImages1776898884423 implements MigrationInterface {
    name = 'AddProductImages1776898884423'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "catalogue_products" ADD "image" character varying(2048)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "catalogue_products" DROP COLUMN "image"`);
    }

}
