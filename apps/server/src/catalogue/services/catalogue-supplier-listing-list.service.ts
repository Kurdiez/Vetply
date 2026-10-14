import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogueSupplierListingListItem,
  CatalogueSupplierListingsListRes,
  CatalogueSupplierListingsQuery,
  ProductCategoryStatus,
  UpdateSupplierListingProductCategoryBody,
  UpdateSupplierListingProductCategoryRes,
  catalogueSupplierListingsListResSchema,
  isProductCategoryLeafPath,
  updateSupplierListingProductCategoryResSchema,
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

    const items: CatalogueSupplierListingListItem[] = entities.map((l) =>
      this.toListItem(l),
    );

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

  async updateListingProductCategory(
    body: UpdateSupplierListingProductCategoryBody,
  ): Promise<UpdateSupplierListingProductCategoryRes> {
    this.assertValidProductCategoryPath(body.productCategory);

    const listing = await this.listingRepository.findOne({
      where: { id: body.listingId },
    });
    if (listing == null) {
      throw new NotFoundException('Supplier listing not found');
    }

    listing.productCategory = body.productCategory;
    listing.productCategoryStatus = ProductCategoryStatus.Reviewed;
    await this.listingRepository.save(listing);

    const payload = {
      id: listing.id,
      productCategory: listing.productCategory,
      productCategoryStatus: ProductCategoryStatus.Reviewed,
    };
    return (
      zodResTransform(payload, updateSupplierListingProductCategoryResSchema) ??
      payload
    );
  }

  private assertValidProductCategoryPath(path: string): void {
    if (!isProductCategoryLeafPath(path)) {
      throw new BadRequestException({
        failReason: 'INVALID_PRODUCT_CATEGORY_PATH',
      });
    }
  }

  private toListItem(
    listing: CatalogueProductSupplierListingEntity,
  ): CatalogueSupplierListingListItem {
    return {
      id: listing.id,
      name: listing.name,
      supplierName: listing.supplier.name,
      supplierProductId: listing.supplierProductId,
      listedPrice:
        listing.listedPrice != null ? String(listing.listedPrice) : null,
      catalogProductName: listing.product?.name ?? null,
      thumbnailImage: listing.product?.image ?? null,
      productCategory: listing.productCategory,
      productCategoryStatus: listing.productCategoryStatus,
    };
  }
}
