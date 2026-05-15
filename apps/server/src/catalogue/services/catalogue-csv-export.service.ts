import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from '@vetply/shared';
import { Repository } from 'typeorm';
import { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';
import { CATALOGUE_PRODUCT_CSV_COLUMNS } from '../utils/catalogue-products-csv.columns';
import { SUPPLIER_LISTING_CSV_COLUMNS } from '../utils/catalogue-supplier-listings-csv.columns';

const UTF8_BOM = '\uFEFF';

@Injectable()
export class CatalogueCsvExportService {
  constructor(
    @InjectRepository(CatalogueProductEntity)
    private readonly productRepository: Repository<CatalogueProductEntity>,
    @InjectRepository(CatalogueProductSupplierListingEntity)
    private readonly listingRepository: Repository<CatalogueProductSupplierListingEntity>,
    @InjectRepository(CatalogueSupplierEntity)
    private readonly catalogueSupplierRepository: Repository<CatalogueSupplierEntity>,
  ) {}

  async buildCatalogueProductsCsv(): Promise<{
    body: string;
    filename: string;
  }> {
    const products = await this.productRepository.find({
      order: { name: 'ASC' },
      relations: { manufacturer: true },
    });
    const body = this.buildCsvDocument(CATALOGUE_PRODUCT_CSV_COLUMNS, products);
    return { body, filename: 'catalogue_products.csv' };
  }

  async buildSupplierListingsCsv(
    supplier: Supplier,
  ): Promise<{ body: string; filename: string }> {
    const supplierRow = await this.catalogueSupplierRepository.findOne({
      where: { name: supplier },
    });

    const listings =
      supplierRow === null
        ? []
        : await this.listingRepository.find({
            where: { supplierId: supplierRow.id },
            order: { name: 'ASC' },
          });

    const body = this.buildCsvDocument(SUPPLIER_LISTING_CSV_COLUMNS, listings);
    const filename = `supplier_listings_${supplier}.csv`;
    return { body, filename };
  }

  private buildCsvDocument<
    T,
    C extends { readonly header: string; readonly cell: (row: T) => string },
  >(columns: readonly C[], rows: T[]): string {
    const headerLine = columns
      .map((c) => CatalogueCsvExportService.escapeCsvCell(c.header))
      .join(',');
    const dataLines = rows.map((row) =>
      columns
        .map((c) => CatalogueCsvExportService.escapeCsvCell(c.cell(row)))
        .join(','),
    );
    return UTF8_BOM + [headerLine, ...dataLines].join('\r\n') + '\r\n';
  }

  private static escapeCsvCell(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
