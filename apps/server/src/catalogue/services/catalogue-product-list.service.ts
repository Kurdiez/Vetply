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
  applyCatalogueProductFilters,
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
    const { page, pageSize, filters, sort } = query;
    const skip = (page - 1) * pageSize;

    const qb = createCatalogueProductListQueryBuilder(this.productRepository);
    applyCatalogueProductFilters(qb, filters);
    applyCatalogueProductSort(qb, sort);

    const [entities, totalCount] = await qb
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const items: CatalogueProductListItem[] = entities.map((p) => ({
      id: p.id,
      name: p.name,
      manufacturerName: p.manufacturer.name,
      salesCategory: p.salesCategory,
      legalCategory: p.legalCategory,
      pom: p.pom,
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
