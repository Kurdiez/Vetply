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

    const bestByProductId = new Map<
      string,
      { bestSupplierName: string; bestPrice: string | null }
    >();
    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const bestRows = await this.productRepository.manager.query<
        {
          productId: string;
          bestSupplierName: string;
          listedPrice: string;
        }[]
      >(
        `SELECT DISTINCT ON (l.product_id)
           l.product_id AS "productId",
           s.name AS "bestSupplierName",
           l.listed_price AS "listedPrice"
         FROM catalogue_product_supplier_listings l
         INNER JOIN catalogue_suppliers s ON s.id = l.supplier_id
         WHERE l.product_id IN (${placeholders})
           AND l.listed_price IS NOT NULL
         ORDER BY l.product_id, l.listed_price ASC, s.name ASC, l.supplier_product_id ASC, l.id ASC`,
        ids,
      );

      for (const row of bestRows) {
        bestByProductId.set(row.productId, {
          bestSupplierName: row.bestSupplierName,
          bestPrice: ceilPriceToTwoDecimalPlaces(String(row.listedPrice)),
        });
      }
    }

    const items: CatalogueProductListItem[] = entities.map((p) => {
      const best = bestByProductId.get(p.id);
      return {
        id: p.id,
        name: p.name,
        image: p.image ?? null,
        manufacturerName: p.manufacturer?.name ?? null,
        salesCategory: p.salesCategory,
        legalCategory: p.legalCategory,
        pom: p.pom,
        unitType: p.unitType,
        unitQuantity: formatUnitQuantityAsWholeNumber(p.unitQuantity),
        bestSupplierName: best?.bestSupplierName ?? null,
        bestPrice: best?.bestPrice ?? null,
      };
    });

    const payload: CatalogueProductsListRes = {
      items,
      totalCount,
      page,
      pageSize,
    };

    return zodResTransform(payload, catalogueProductsListResSchema) ?? payload;
  }
}
