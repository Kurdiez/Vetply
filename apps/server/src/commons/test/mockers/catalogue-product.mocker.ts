import { CatalogUnitType, LegalCategory, SalesCategory } from '@vetply/shared';
import type { Repository } from 'typeorm';
import type { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import type { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';

export async function saveCatalogueManufacturer(
  repo: Repository<CatalogueManufacturerEntity>,
  name: string,
): Promise<CatalogueManufacturerEntity> {
  return repo.save(repo.create({ name }));
}

export async function saveCatalogueProduct(
  repo: Repository<CatalogueProductEntity>,
  input: {
    manufacturerId?: string | null;
    name: string;
    salesCategory?: SalesCategory | null;
    legalCategory?: LegalCategory | null;
    pom?: boolean | null;
    unitType?: CatalogUnitType;
    unitQuantity?: string;
  },
): Promise<CatalogueProductEntity> {
  return repo.save(
    repo.create({
      ...input,
      unitType: input.unitType ?? CatalogUnitType.EA,
      unitQuantity: input.unitQuantity ?? '1.000000',
    }),
  );
}
