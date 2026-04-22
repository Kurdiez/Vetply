import { CatalogUnitType, LegalCategory, SalesCategory } from '@vetply/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogueManufacturerEntity } from './catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from './catalogue-product-supplier-listing.entity';

@Entity('catalogue_products')
@Index('IDX_catalogue_products_name', ['name'])
@Index('IDX_catalogue_products_sales_category', ['salesCategory'])
@Index('IDX_catalogue_products_legal_category', ['legalCategory'])
@Index('IDX_catalogue_products_pom', ['pom'])
@Index('IDX_catalogue_products_updated_at_id', ['updatedAt', 'id'])
@Index('IDX_catalogue_products_import_lookup', [
  'manufacturerId',
  'salesCategory',
  'legalCategory',
  'pom',
  'name',
])
export class CatalogueProductEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'manufacturer_id', type: 'uuid', nullable: true })
  manufacturerId!: string | null;

  @ManyToOne(() => CatalogueManufacturerEntity, (m) => m.products, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'manufacturer_id' })
  manufacturer!: CatalogueManufacturerEntity | null;

  @Column({
    name: 'sales_category',
    type: 'enum',
    enum: SalesCategory,
    enumName: 'sales_category_enum',
    nullable: true,
  })
  salesCategory!: SalesCategory | null;

  @Column({
    name: 'legal_category',
    type: 'enum',
    enum: LegalCategory,
    enumName: 'legal_category_enum',
    nullable: true,
  })
  legalCategory!: LegalCategory | null;

  @Column({ name: 'name', type: 'varchar', length: 1024 })
  name!: string;

  @Column({ type: 'boolean', name: 'pom', nullable: true })
  pom!: boolean | null;

  @Column({
    name: 'unit_type',
    type: 'enum',
    enum: CatalogUnitType,
    enumName: 'catalog_unit_type_enum',
  })
  unitType!: CatalogUnitType;

  @Column({
    name: 'unit_quantity',
    type: 'decimal',
    precision: 18,
    scale: 6,
  })
  unitQuantity!: string;

  @OneToMany(() => CatalogueProductSupplierListingEntity, (l) => l.product)
  listings!: CatalogueProductSupplierListingEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
