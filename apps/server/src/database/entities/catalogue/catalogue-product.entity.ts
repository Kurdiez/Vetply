import { LegalCategory, SalesCategory } from '@vetply/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogueManufacturerEntity } from './catalogue-manufacturer.entity';
import { CatalogueProductVariantEntity } from './catalogue-product-variant.entity';

@Entity('catalogue_products')
export class CatalogueProductEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'manufacturer_id', type: 'uuid' })
  manufacturerId!: string;

  @ManyToOne(() => CatalogueManufacturerEntity, (m) => m.products, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'manufacturer_id' })
  manufacturer!: CatalogueManufacturerEntity;

  @Column({
    name: 'sales_category',
    type: 'enum',
    enum: SalesCategory,
    enumName: 'sales_category_enum',
  })
  salesCategory!: SalesCategory;

  @Column({
    name: 'legal_category',
    type: 'enum',
    enum: LegalCategory,
    enumName: 'legal_category_enum',
  })
  legalCategory!: LegalCategory;

  @Column({ name: 'name', type: 'varchar', length: 1024 })
  name!: string;

  @Column({ type: 'boolean', name: 'pom' })
  pom!: boolean;

  @OneToMany(() => CatalogueProductVariantEntity, (v) => v.product)
  variants!: CatalogueProductVariantEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
