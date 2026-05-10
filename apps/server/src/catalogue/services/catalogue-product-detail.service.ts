import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogUnitType,
  CatalogueManufacturerOption,
  CatalogueProductDetail,
  CatalogueProductUpdateBody,
  LinkSupplierListingsBody,
  LinkSupplierListingsRes,
  UnlinkSupplierListingsBody,
  UnlinkSupplierListingsRes,
  catalogueProductDetailSchema,
  linkSupplierListingsResSchema,
  unlinkSupplierListingsResSchema,
} from '@vetply/shared';
import { In, Repository } from 'typeorm';
import { zodResTransform } from '~/commons/validations';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import {
  ceilPriceToTwoDecimalPlaces,
  formatUnitQuantityAsWholeNumber,
} from '../utils/catalogue-price-format';

const MANUAL_CREATE_DEFAULT_PRODUCT_NAME = 'Default Product Title';

@Injectable()
export class CatalogueProductDetailService {
  constructor(
    @InjectRepository(CatalogueProductEntity)
    private readonly productRepository: Repository<CatalogueProductEntity>,
    @InjectRepository(CatalogueManufacturerEntity)
    private readonly manufacturerRepository: Repository<CatalogueManufacturerEntity>,
    @InjectRepository(CatalogueProductSupplierListingEntity)
    private readonly listingRepository: Repository<CatalogueProductSupplierListingEntity>,
  ) {}

  async getProductDetail(id: string): Promise<CatalogueProductDetail> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        manufacturer: true,
        listings: { supplier: true },
      },
    });

    if (!product) {
      throw new NotFoundException();
    }

    const listings = [...(product.listings ?? [])].sort((a, b) => {
      const sa = a.supplier?.name ?? '';
      const sb = b.supplier?.name ?? '';
      const c = sa.localeCompare(sb, undefined, { sensitivity: 'base' });
      if (c !== 0) {
        return c;
      }
      return a.supplierProductId.localeCompare(b.supplierProductId, undefined, {
        sensitivity: 'base',
      });
    });

    const payload: CatalogueProductDetail = {
      id: product.id,
      name: product.name,
      image: product.image ?? null,
      manufacturerId: product.manufacturerId ?? null,
      manufacturerName: product.manufacturer?.name ?? null,
      salesCategory: product.salesCategory,
      legalCategory: product.legalCategory,
      pom: product.pom,
      unitType: product.unitType,
      unitQuantity: formatUnitQuantityAsWholeNumber(product.unitQuantity),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      listings: listings.map((l) => ({
        id: l.id,
        supplierName: l.supplier?.name ?? 'Unknown supplier',
        supplierProductId: l.supplierProductId,
        name: l.name,
        listedPrice: ceilPriceToTwoDecimalPlaces(
          l.listedPrice === null || l.listedPrice === undefined
            ? null
            : String(l.listedPrice),
        ),
      })),
    };

    return zodResTransform(payload, catalogueProductDetailSchema) ?? payload;
  }

  async createManualProduct(): Promise<CatalogueProductDetail> {
    const draft = this.productRepository.create({
      name: MANUAL_CREATE_DEFAULT_PRODUCT_NAME,
      manufacturerId: null,
      salesCategory: null,
      legalCategory: null,
      pom: null,
      image: null,
      unitType: CatalogUnitType.EA,
      unitQuantity: '1.000000',
    });
    const saved = await this.productRepository.save(draft);
    return this.getProductDetail(saved.id);
  }

  async listManufacturers(): Promise<CatalogueManufacturerOption[]> {
    const rows = await this.manufacturerRepository.find({
      order: { name: 'ASC' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async updateProduct(
    id: string,
    body: CatalogueProductUpdateBody,
  ): Promise<CatalogueProductDetail> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException();
    }

    if (body.manufacturerId !== null) {
      const mfg = await this.manufacturerRepository.findOne({
        where: { id: body.manufacturerId },
      });
      if (!mfg) {
        throw new BadRequestException('Unknown manufacturer');
      }
    }

    product.name = body.name;
    product.manufacturerId = body.manufacturerId;
    product.salesCategory = body.salesCategory;
    product.legalCategory = body.legalCategory;
    product.pom = body.pom;
    product.unitType = body.unitType;
    product.unitQuantity = body.unitQuantity;

    await this.productRepository.save(product);

    return this.getProductDetail(id);
  }

  async bulkDeleteProducts(
    productIds: string[],
  ): Promise<{ deletedCount: number }> {
    const unique = [...new Set(productIds)];
    if (unique.length === 0) {
      return { deletedCount: 0 };
    }
    const result = await this.productRepository.delete({ id: In(unique) });
    return { deletedCount: result.affected ?? 0 };
  }

  async unlinkSupplierListing(
    productId: string,
    listingId: string,
  ): Promise<CatalogueProductDetail> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId, productId },
    });
    if (!listing) {
      throw new NotFoundException();
    }
    listing.productId = null;
    await this.listingRepository.save(listing);
    return this.getProductDetail(productId);
  }

  async linkSupplierListingsToProduct(
    body: LinkSupplierListingsBody,
  ): Promise<LinkSupplierListingsRes> {
    const { listingIds, productId } = body;

    return this.productRepository.manager.transaction(async (manager) => {
      const productRepo = manager.getRepository(CatalogueProductEntity);
      const listingRepo = manager.getRepository(
        CatalogueProductSupplierListingEntity,
      );

      const product = await productRepo.findOne({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException('Catalogue product not found');
      }

      const listings = await listingRepo.find({
        where: { id: In(listingIds) },
      });

      if (listings.length !== listingIds.length) {
        throw new BadRequestException(
          'One or more supplier listings were not found',
        );
      }

      const supplierIds = listings.map((l) => l.supplierId);
      if (new Set(supplierIds).size !== supplierIds.length) {
        throw new BadRequestException(
          'Cannot link multiple listings from the same supplier to one catalogue product',
        );
      }

      for (const l of listings) {
        if (l.productId !== null) {
          throw new BadRequestException(
            'Only listings not linked to a catalogue product can be linked',
          );
        }
      }

      for (const l of listings) {
        const blocking = await listingRepo.findOne({
          where: {
            productId,
            supplierId: l.supplierId,
          },
        });
        if (blocking && blocking.id !== l.id) {
          throw new ConflictException(
            'Another listing for this supplier is already linked to this catalogue product',
          );
        }
      }

      for (const l of listings) {
        l.productId = productId;
      }
      await listingRepo.save(listings);

      const payload: LinkSupplierListingsRes = {
        linkedCount: listings.length,
      };
      return zodResTransform(payload, linkSupplierListingsResSchema) ?? payload;
    });
  }

  async bulkUnlinkSupplierListings(
    body: UnlinkSupplierListingsBody,
  ): Promise<UnlinkSupplierListingsRes> {
    const unique = [...new Set(body.listingIds)];

    return this.listingRepository.manager.transaction(async (manager) => {
      const listingRepo = manager.getRepository(
        CatalogueProductSupplierListingEntity,
      );

      const found = await listingRepo.find({
        where: { id: In(unique) },
        select: { id: true },
      });

      if (found.length !== unique.length) {
        throw new BadRequestException(
          'One or more supplier listings were not found',
        );
      }

      const result = await listingRepo.update(
        { id: In(unique) },
        { productId: null },
      );

      const payload: UnlinkSupplierListingsRes = {
        unlinkedCount: result.affected ?? unique.length,
      };
      return (
        zodResTransform(payload, unlinkSupplierListingsResSchema) ?? payload
      );
    });
  }
}
