import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogueSupplierListingListItem,
  CatalogueSupplierListingsListRes,
  CatalogueSupplierListingsQuery,
  catalogueSupplierListingsListResSchema,
} from '@vetply/shared';
import { Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import {
  applySupplierListingFilters,
  applySupplierListingNameSearch,
  applySupplierListingSort,
  createSupplierListingListQueryBuilder,
} from '../utils/catalogue-supplier-listing-list-query';

@Injectable()
export class CatalogueSupplierListingListService {
  constructor(
    @InjectRepository(CatalogueProductSupplierListingEntity)
    private readonly listingRepository: Repository<CatalogueProductSupplierListingEntity>,
  ) {}

  async listSupplierListings(
    query: CatalogueSupplierListingsQuery,
  ): Promise<CatalogueSupplierListingsListRes> {
    const { page, pageSize, filters, sort, q: nameSearch } = query;
    const skip = (page - 1) * pageSize;

    const qb = createSupplierListingListQueryBuilder(this.listingRepository);
    applySupplierListingNameSearch(qb, nameSearch);
    applySupplierListingFilters(qb, filters);
    applySupplierListingSort(qb, sort);

    const [entities, totalCount] = await qb
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    const items: CatalogueSupplierListingListItem[] = entities.map((l) => ({
      id: l.id,
      name: l.name,
      supplierName: l.supplier.name,
      supplierProductId: l.supplierProductId,
      listedPrice: l.listedPrice != null ? String(l.listedPrice) : null,
      catalogProductName: l.product?.name ?? null,
      thumbnailImage: l.product?.image ?? null,
    }));

    const payload = {
      items,
      totalCount,
      page,
      pageSize,
    };
    return (
      zodResTransform(payload, catalogueSupplierListingsListResSchema) ??
      payload
    );
  }
}
