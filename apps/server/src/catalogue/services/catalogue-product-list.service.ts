import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogueProductListItem,
  CatalogueProductPickerListRes,
  CatalogueProductPickerQuery,
  CatalogueProductsListQuery,
  CatalogueProductsListRes,
  Supplier,
  catalogueProductPickerListResSchema,
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
  applyCatalogueProductPickerFilters,
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

    type PriceRow = {
      productId: string;
      supplierName: string;
      listedPrice: string;
    };

    const pricesByProductId = new Map<
      string,
      Partial<Record<Supplier, string>>
    >();
    if (ids.length > 0) {
      const n = ids.length;
      const inPlaceholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const priceRows = await this.productRepository.manager.query<PriceRow[]>(
        `SELECT l.product_id AS "productId",
                s.name::text AS "supplierName",
                l.listed_price AS "listedPrice"
         FROM catalogue_product_supplier_listings l
         INNER JOIN catalogue_suppliers s ON s.id = l.supplier_id
         WHERE l.product_id IN (${inPlaceholders})
           AND s.name IN ($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4})
           AND l.listed_price IS NOT NULL`,
        [
          ...ids,
          Supplier.COVETRUS,
          Supplier.NVS,
          Supplier.VEENAK,
          Supplier.MWIAH,
        ],
      );

      for (const row of priceRows) {
        const supplier = row.supplierName as Supplier;
        if (
          supplier !== Supplier.COVETRUS &&
          supplier !== Supplier.NVS &&
          supplier !== Supplier.VEENAK &&
          supplier !== Supplier.MWIAH
        ) {
          continue;
        }
        const formatted = ceilPriceToTwoDecimalPlaces(String(row.listedPrice));
        const m = pricesByProductId.get(row.productId) ?? {};
        m[supplier] = formatted;
        pricesByProductId.set(row.productId, m);
      }
    }

    const items: CatalogueProductListItem[] = entities.map((p) => {
      const m = pricesByProductId.get(p.id);
      return {
        id: p.id,
        name: p.name,
        image: p.image ?? null,
        manufacturerName: p.manufacturer?.name ?? null,
        unitType: p.unitType,
        unitQuantity: formatUnitQuantityAsWholeNumber(p.unitQuantity),
        covetrusPrice: m?.[Supplier.COVETRUS] ?? null,
        nvsPrice: m?.[Supplier.NVS] ?? null,
        veenakPrice: m?.[Supplier.VEENAK] ?? null,
        mwiahPrice: m?.[Supplier.MWIAH] ?? null,
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

  async listProductsForPicker(
    query: CatalogueProductPickerQuery,
  ): Promise<CatalogueProductPickerListRes> {
    const qb = createCatalogueProductListQueryBuilder(this.productRepository);
    applyCatalogueProductNameSearch(qb, query.q);
    applyCatalogueProductPickerFilters(qb, query);
    qb.orderBy('product.name', 'ASC').addOrderBy('product.id', 'ASC');
    qb.take(3);
    const entities = await qb.getMany();

    const items = entities.map((p) => ({
      id: p.id,
      name: p.name,
      legalCategory: p.legalCategory,
      unitType: p.unitType,
      unitQuantity: formatUnitQuantityAsWholeNumber(p.unitQuantity),
      image: p.image ?? null,
      manufacturerName: p.manufacturer?.name ?? null,
    }));

    const payload: CatalogueProductPickerListRes = { items };
    return (
      zodResTransform(payload, catalogueProductPickerListResSchema) ?? payload
    );
  }
}
