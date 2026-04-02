import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogueProductVariantEntity } from './catalogue-product-variant.entity';
import { CatalogueSupplierEntity } from './catalogue-supplier.entity';

@Entity('catalogue_variant_supplier_listings')
@Unique('UQ_catalogue_variant_supplier_listings_supplier_variant_ref', [
  'supplierId',
  'variantRef',
])
@Unique('UQ_catalogue_variant_supplier_listings_variant_supplier', [
  'variantId',
  'supplierId',
])
export class CatalogueVariantSupplierListingEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @ManyToOne(() => CatalogueProductVariantEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variant_id' })
  variant!: CatalogueProductVariantEntity;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => CatalogueSupplierEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: CatalogueSupplierEntity;

  @Column({ name: 'variant_ref', type: 'varchar', length: 128 })
  variantRef!: string;

  @Column({ name: 'name', type: 'varchar', length: 2048 })
  name!: string;

  @Column({
    name: 'listed_price',
    type: 'decimal',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  listedPrice!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
