import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CatalogueProductEntity } from './catalogue-product.entity';

@Entity('catalogue_manufacturers')
export class CatalogueManufacturerEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 512, unique: true })
  name!: string;

  @OneToMany(() => CatalogueProductEntity, (p) => p.manufacturer)
  products!: CatalogueProductEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
