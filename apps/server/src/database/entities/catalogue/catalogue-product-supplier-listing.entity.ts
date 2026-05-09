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
import { CatalogueProductEntity } from './catalogue-product.entity';
import { CatalogueSupplierEntity } from './catalogue-supplier.entity';

@Entity('catalogue_product_supplier_listings')
@Unique('UQ_catalogue_product_supplier_listings_supplier_variant_ref', [
  'supplierId',
  'supplierProductId',
])
@Unique('UQ_catalogue_product_supplier_listings_product_supplier', [
  'productId',
  'supplierId',
])
export class CatalogueProductSupplierListingEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @ManyToOne(() => CatalogueProductEntity, (p) => p.listings, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'product_id' })
  product!: CatalogueProductEntity | null;

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => CatalogueSupplierEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: CatalogueSupplierEntity;

  @Column({ name: 'supplier_product_id', type: 'varchar', length: 128 })
  supplierProductId!: string;

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
