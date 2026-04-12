import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogUnitType,
  CatalogueProductDetailRes,
  Supplier,
  catalogueProductDetailResSchema,
} from '@vetply/shared';
import { Repository } from 'typeorm';
import { CustomException } from '~/commons/errors/custom-exception';
import { zodResTransform } from '~/commons/validations';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';

type SupplierGroupAcc = {
  supplier: Supplier;
  rows: Array<{
    variantId: string;
    variantName: string;
    unitType: CatalogUnitType;
    unitQuantity: string;
    listing: {
      id: string;
      variantRef: string;
      name: string;
      listedPrice: string | null;
    };
  }>;
};

@Injectable()
export class CatalogueProductDetailService {
  constructor(
    @InjectRepository(CatalogueProductEntity)
    private readonly productRepository: Repository<CatalogueProductEntity>,
  ) {}

  async getProductDetail(productId: string): Promise<CatalogueProductDetailRes> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: [
        'manufacturer',
        'variants',
        'variants.listings',
        'variants.listings.supplier',
      ],
    });

    if (!product) {
      throw new NotFoundException();
    }

    const variantsMissingListings = product.variants.filter(
      (v) => !v.listings || v.listings.length === 0,
    );
    if (variantsMissingListings.length > 0) {
      throw new CustomException(
        'Catalogue variant(s) missing supplier listing rows',
        {
          code: 'CATALOGUE_VARIANT_MISSING_SUPPLIER_LISTING',
          productId: product.id,
          variantIds: variantsMissingListings.map((v) => v.id),
        },
      );
    }

    const bySupplier = new Map<Supplier, SupplierGroupAcc>();

    for (const variant of product.variants) {
      for (const listing of variant.listings) {
        const supplierName = listing.supplier.name;
        let group = bySupplier.get(supplierName);
        if (!group) {
          group = { supplier: supplierName, rows: [] };
          bySupplier.set(supplierName, group);
        }
        group.rows.push({
          variantId: variant.id,
          variantName: variant.name,
          unitType: variant.unitType,
          unitQuantity: variant.unitQuantity,
          listing: {
            id: listing.id,
            variantRef: listing.variantRef,
            name: listing.name,
            listedPrice: listing.listedPrice,
          },
        });
      }
    }

    const supplierKeys = Array.from(bySupplier.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    const supplierGroups = supplierKeys.map((key) => {
      const g = bySupplier.get(key)!;
      return {
        supplier: g.supplier,
        variants: g.rows.map((r) => ({
          id: r.variantId,
          name: r.variantName,
          unitType: r.unitType,
          unitQuantity: r.unitQuantity,
          listing: r.listing,
        })),
      };
    });

    const raw = {
      product: {
        id: product.id,
        name: product.name,
        manufacturerName: product.manufacturer.name,
        salesCategory: product.salesCategory,
        legalCategory: product.legalCategory,
        pom: product.pom,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
      supplierGroups,
    };

    return (
      zodResTransform(raw, catalogueProductDetailResSchema) ?? raw
    ) as CatalogueProductDetailRes;
  }
}
