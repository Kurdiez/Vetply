import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1775963620926 implements MigrationInterface {
    name = 'Initial1775963620926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."catalog_unit_type_enum" AS ENUM('ML', 'L', 'G', 'MG', 'MCG', 'IU', 'EA', 'PK', 'TAB', 'CAP', 'VIAL', 'AMP', 'BTL', 'SET', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "catalogue_product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "name" character varying(2048) NOT NULL, "unit_type" "public"."catalog_unit_type_enum" NOT NULL, "unit_quantity" numeric(18,6) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1248948152a3e4f1a3fec34383c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_product_variants_product_id" ON "catalogue_product_variants" ("product_id") `);
        await queryRunner.query(`CREATE TYPE "public"."sales_category_enum" AS ENUM('Anaesthetics', 'Anti-inflammatory', 'Antimicrobial', 'Cancer', 'Cardiac/Respiratory', 'Combi Ecto/Endo - SA', 'Consumables', 'Dental', 'Dermatology', 'Diagnostics', 'Diets', 'Ear/Eye', 'Ectos - Equine', 'Ectos - LA', 'Ectos - SA', 'Endectos - LA', 'Endocrine', 'Endos - Equine', 'Endos - LA', 'Endos - SA', 'GSL', 'Gastro', 'Instruments/Equipment', 'Misc', 'Musculoskeletal', 'NVS Admin', 'Neurology', 'Nutrients', 'Obstetrics', 'Reproduction', 'Urinary', 'Vaccines - Equine', 'Vaccines - LA', 'Vaccines - SA', 'Vascular/Haemorhage', 'WRS')`);
        await queryRunner.query(`CREATE TYPE "public"."legal_category_enum" AS ENUM('AVM-GSL', 'Consumables', 'GSL (General Sales List)', 'Instruments/Equip', 'NFA-VPS', 'POM-V', 'POM-VPS', 'UVP (Unlicensed Vet Products)', 'Veterinary Diets', 'WRS (Waiting Room Sales)')`);
        await queryRunner.query(`CREATE TABLE "catalogue_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "manufacturer_id" uuid NOT NULL, "sales_category" "public"."sales_category_enum" NOT NULL, "legal_category" "public"."legal_category_enum" NOT NULL, "name" character varying(1024) NOT NULL, "pom" boolean NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1cd2263d5b3dba0e72599306b74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_products_import_lookup" ON "catalogue_products" ("manufacturer_id", "sales_category", "legal_category", "pom", "name") `);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_products_updated_at_id" ON "catalogue_products" ("updated_at", "id") `);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_products_pom" ON "catalogue_products" ("pom") `);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_products_legal_category" ON "catalogue_products" ("legal_category") `);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_products_sales_category" ON "catalogue_products" ("sales_category") `);
        await queryRunner.query(`CREATE INDEX "IDX_catalogue_products_name" ON "catalogue_products" ("name") `);
        await queryRunner.query(`CREATE TABLE "catalogue_manufacturers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(512) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8826730ada5993cbd3e9b2533cc" UNIQUE ("name"), CONSTRAINT "PK_8b7bf110f761151b77f17aaedf5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."supplier_enum" AS ENUM('NVS')`);
        await queryRunner.query(`CREATE TABLE "catalogue_suppliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" "public"."supplier_enum" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1d4c7a1dab6c1b2eb8eb700eb7a" UNIQUE ("name"), CONSTRAINT "PK_f5cdbd269de6d06dab32040b9dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "catalogue_variant_supplier_listings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "variant_id" uuid NOT NULL, "supplier_id" uuid NOT NULL, "variant_ref" character varying(128) NOT NULL, "name" character varying(2048) NOT NULL, "listed_price" numeric(14,4), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_catalogue_variant_supplier_listings_variant_supplier" UNIQUE ("variant_id", "supplier_id"), CONSTRAINT "UQ_catalogue_variant_supplier_listings_supplier_variant_ref" UNIQUE ("supplier_id", "variant_ref"), CONSTRAINT "PK_f78535bc76d6be7ca521781051e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_type_enum" AS ENUM('Member', 'Admin', 'Super')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "user_type" "public"."user_type_enum" NOT NULL DEFAULT 'Member', "password_hash" character varying, "google_sub" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_68b61ba0fb359b93b517cf1073d" UNIQUE ("google_sub"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "catalogue_product_variants" ADD CONSTRAINT "FK_364eb63cf541fb3a8b3c0c3db96" FOREIGN KEY ("product_id") REFERENCES "catalogue_products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "catalogue_products" ADD CONSTRAINT "FK_700b1ba20872c935f6901fd00ac" FOREIGN KEY ("manufacturer_id") REFERENCES "catalogue_manufacturers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "catalogue_variant_supplier_listings" ADD CONSTRAINT "FK_0fa7680c7d72c885bf8aa9c4b47" FOREIGN KEY ("variant_id") REFERENCES "catalogue_product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "catalogue_variant_supplier_listings" ADD CONSTRAINT "FK_aa606ddbdd17b272746bc2af0a7" FOREIGN KEY ("supplier_id") REFERENCES "catalogue_suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "catalogue_variant_supplier_listings" DROP CONSTRAINT "FK_aa606ddbdd17b272746bc2af0a7"`);
        await queryRunner.query(`ALTER TABLE "catalogue_variant_supplier_listings" DROP CONSTRAINT "FK_0fa7680c7d72c885bf8aa9c4b47"`);
        await queryRunner.query(`ALTER TABLE "catalogue_products" DROP CONSTRAINT "FK_700b1ba20872c935f6901fd00ac"`);
        await queryRunner.query(`ALTER TABLE "catalogue_product_variants" DROP CONSTRAINT "FK_364eb63cf541fb3a8b3c0c3db96"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."user_type_enum"`);
        await queryRunner.query(`DROP TABLE "catalogue_variant_supplier_listings"`);
        await queryRunner.query(`DROP TABLE "catalogue_suppliers"`);
        await queryRunner.query(`DROP TYPE "public"."supplier_enum"`);
        await queryRunner.query(`DROP TABLE "catalogue_manufacturers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_products_name"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_products_sales_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_products_legal_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_products_pom"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_products_updated_at_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_products_import_lookup"`);
        await queryRunner.query(`DROP TABLE "catalogue_products"`);
        await queryRunner.query(`DROP TYPE "public"."legal_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sales_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_catalogue_product_variants_product_id"`);
        await queryRunner.query(`DROP TABLE "catalogue_product_variants"`);
        await queryRunner.query(`DROP TYPE "public"."catalog_unit_type_enum"`);
    }

}
