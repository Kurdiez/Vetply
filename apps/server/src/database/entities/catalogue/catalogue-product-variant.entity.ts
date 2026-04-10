import { CatalogUnitType } from '@vetply/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogueProductEntity } from './catalogue-product.entity';

@Entity('catalogue_product_variants')
@Index('IDX_catalogue_product_variants_product_id', ['productId'])
export class CatalogueProductVariantEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => CatalogueProductEntity, (p) => p.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: CatalogueProductEntity;

  @Column({ name: 'name', type: 'varchar', length: 2048 })
  name!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
