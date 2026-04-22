import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogueProductListItem,
  CatalogueProductsListQuery,
  CatalogueProductsListRes,
  catalogueProductsListResSchema,
} from '@vetply/shared';
import { Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import {
  ceilPriceToTwoDecimalPlaces,
  formatUnitQuantityAsWholeNumber,
} from '../utils/catalogue-price-format';
import {
  applyCatalogueProductFilters,
  applyCatalogueProductNameSearch,
  applyCatalogueProductSort,
  createCatalogueProductListQueryBuilder,
} from '../utils/catalogue-product-list-query';

@Injectable()
export class CatalogueProductListService {
  constructor(
    @InjectRepository(CatalogueProductEntity)
    private readonly productRepository: Repository<CatalogueProductEntity>,
  ) {}

  async listProducts(
    query: CatalogueProductsListQuery,
  ): Promise<CatalogueProductsListRes> {
    const { page, pageSize, filters, sort, q: nameSearch } = query;
    const skip = (page - 1) * pageSize;

    const qb = createCatalogueProductListQueryBuilder(this.productRepository);
    applyCatalogueProductNameSearch(qb, nameSearch);
    applyCatalogueProductFilters(qb, filters);
    applyCatalogueProductSort(qb, sort);

    const [entities, totalCount] = await qb
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const ids = entities.map((p) => p.id);
    const listingRepo = this.productRepository.manager.getRepository(
      CatalogueProductSupplierListingEntity,
    );

    const lowestPriceByProductId = new Map<string, string | null>();
    if (ids.length > 0) {
      const minRows = await listingRepo
        .createQueryBuilder('l')
        .select('l.product_id', 'productId')
        .addSelect('MIN(l.listed_price)', 'lowestPrice')
        .where('l.product_id IN (:...ids)', { ids })
        .groupBy('l.product_id')
        .getRawMany<{ productId: string; lowestPrice: string | null }>();

      for (const row of minRows) {
        const v = row.lowestPrice;
        lowestPriceByProductId.set(
          row.productId,
          ceilPriceToTwoDecimalPlaces(
            v === null || v === undefined ? null : String(v),
          ),
        );
      }
    }

    const items: CatalogueProductListItem[] = entities.map((p) => ({
      id: p.id,
      name: p.name,
      image: p.image ?? null,
      manufacturerName: p.manufacturer?.name ?? null,
      salesCategory: p.salesCategory,
      legalCategory: p.legalCategory,
      pom: p.pom,
      unitType: p.unitType,
      unitQuantity: formatUnitQuantityAsWholeNumber(p.unitQuantity),
      lowestPrice: lowestPriceByProductId.get(p.id) ?? null,
    }));

    const payload: CatalogueProductsListRes = {
      items,
      totalCount,
      page,
      pageSize,
    };

    return zodResTransform(payload, catalogueProductsListResSchema) ?? payload;
  }
}
