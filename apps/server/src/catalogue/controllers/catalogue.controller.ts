import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ImportSupplierPricesBatchReq,
  catalogueBulkDeleteProductsBodySchema,
  catalogueProductPickerQuerySchema,
  catalogueProductUpdateBodySchema,
  catalogueProductsImportBatchReqSchema,
  catalogueProductsImportDeleteMissingBodySchema,
  catalogueProductsListQuerySchema,
  catalogueSupplierListingsExportQuerySchema,
  catalogueSupplierListingsQuerySchema,
  importSupplierPricesBatchReqSchema,
  linkSupplierListingsBodySchema,
  supplierListingsMappingImportBatchReqSchema,
  unlinkSupplierListingsBodySchema,
  type CatalogueBulkDeleteProductsBody,
  type CatalogueProductUpdateBody,
  type CatalogueProductsImportBatchReq,
  type CatalogueProductsImportDeleteMissingBody,
  type LinkSupplierListingsBody,
  type SupplierListingsMappingImportBatchReq,
  type UnlinkSupplierListingsBody,
} from '@vetply/shared';
import type { Response } from 'express';
import { ZodError } from 'zod';
import { ZodValidationPipe } from '~/commons/validations';
import { SuperUserGuard } from '../guards/super-user.guard';
import { CatalogueCsvExportService } from '../services/catalogue-csv-export.service';
import { CatalogueImportService } from '../services/catalogue-import.service';
import { CatalogueProductDetailService } from '../services/catalogue-product-detail.service';
import { CatalogueProductListService } from '../services/catalogue-product-list.service';
import { CatalogueProductsCsvImportService } from '../services/catalogue-products-csv-import.service';
import { CatalogueSupplierListingListService } from '../services/catalogue-supplier-listing-list.service';
import { CatalogueSupplierListingsMappingImportService } from '../services/catalogue-supplier-listings-mapping-import.service';

@Controller('admin/catalogue')
@UseGuards(SuperUserGuard)
export class CatalogueController {
  constructor(
    private readonly catalogueImportService: CatalogueImportService,
    private readonly catalogueProductListService: CatalogueProductListService,
    private readonly catalogueSupplierListingListService: CatalogueSupplierListingListService,
    private readonly catalogueProductDetailService: CatalogueProductDetailService,
    private readonly catalogueCsvExportService: CatalogueCsvExportService,
    private readonly catalogueProductsCsvImportService: CatalogueProductsCsvImportService,
    private readonly catalogueSupplierListingsMappingImportService: CatalogueSupplierListingsMappingImportService,
  ) {}

  @Get('products/picker')
  listProductsForPicker(@Query() rawQuery: Record<string, unknown>) {
    const parsed = catalogueProductPickerQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error instanceof ZodError
          ? {
              statusCode: 400,
              message: 'Validation failed',
              error: 'Bad Request',
              details: parsed.error.issues,
            }
          : 'Validation failed',
      );
    }
    return this.catalogueProductListService.listProductsForPicker(parsed.data);
  }

  @Get('products/export')
  async exportCatalogueProductsCsv(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { body, filename } =
      await this.catalogueCsvExportService.buildCatalogueProductsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(body, 'utf-8'));
  }

  @Get('products/:id')
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogueProductDetailService.getProductDetail(id);
  }

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  createProduct() {
    return this.catalogueProductDetailService.createManualProduct();
  }

  @Post('products/bulk-delete')
  bulkDeleteProducts(
    @Body(new ZodValidationPipe(catalogueBulkDeleteProductsBodySchema))
    body: CatalogueBulkDeleteProductsBody,
  ) {
    return this.catalogueProductDetailService.bulkDeleteProducts(
      body.productIds,
    );
  }

  @Post('products/import/delete-missing')
  @HttpCode(HttpStatus.OK)
  catalogueProductsImportDeleteMissing(
    @Body(new ZodValidationPipe(catalogueProductsImportDeleteMissingBodySchema))
    body: CatalogueProductsImportDeleteMissingBody,
  ) {
    return this.catalogueProductsCsvImportService.deleteMissingNotInCsv(body);
  }

  @Post('products/import/batch')
  @HttpCode(HttpStatus.OK)
  catalogueProductsImportBatch(
    @Body(new ZodValidationPipe(catalogueProductsImportBatchReqSchema))
    body: CatalogueProductsImportBatchReq,
  ) {
    return this.catalogueProductsCsvImportService.importBatch(body);
  }

  @Post('supplier-listings/import-mapping/batch')
  @HttpCode(HttpStatus.OK)
  supplierListingsMappingImportBatch(
    @Body(new ZodValidationPipe(supplierListingsMappingImportBatchReqSchema))
    body: SupplierListingsMappingImportBatchReq,
  ) {
    return this.catalogueSupplierListingsMappingImportService.importBatch(body);
  }

  @Post('supplier-listings/link')
  @HttpCode(HttpStatus.OK)
  linkSupplierListings(
    @Body(new ZodValidationPipe(linkSupplierListingsBodySchema))
    body: LinkSupplierListingsBody,
  ) {
    return this.catalogueProductDetailService.linkSupplierListingsToProduct(
      body,
    );
  }

  @Post('supplier-listings/unlink')
  @HttpCode(HttpStatus.OK)
  unlinkSupplierListings(
    @Body(new ZodValidationPipe(unlinkSupplierListingsBodySchema))
    body: UnlinkSupplierListingsBody,
  ) {
    return this.catalogueProductDetailService.bulkUnlinkSupplierListings(body);
  }

  @Post('products/:productId/listings/:listingId/unlink')
  unlinkSupplierListing(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.catalogueProductDetailService.unlinkSupplierListing(
      productId,
      listingId,
    );
  }

  @Get('manufacturers')
  listManufacturers() {
    return this.catalogueProductDetailService.listManufacturers();
  }

  @Get('supplier-listings/export')
  async exportSupplierListingsCsv(
    @Query() rawQuery: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const parsed =
      catalogueSupplierListingsExportQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error instanceof ZodError
          ? {
              statusCode: 400,
              message: 'Validation failed',
              error: 'Bad Request',
              details: parsed.error.issues,
            }
          : 'Validation failed',
      );
    }
    const { body, filename } =
      await this.catalogueCsvExportService.buildSupplierListingsCsv(
        parsed.data.supplier,
      );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(body, 'utf-8'));
  }

  @Get('supplier-listings')
  listSupplierListings(@Query() rawQuery: Record<string, unknown>) {
    const parsed = catalogueSupplierListingsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error instanceof ZodError
          ? {
              statusCode: 400,
              message: 'Validation failed',
              error: 'Bad Request',
              details: parsed.error.issues,
            }
          : 'Validation failed',
      );
    }
    return this.catalogueSupplierListingListService.listSupplierListings(
      parsed.data,
    );
  }

  @Get('products')
  listProducts(@Query() rawQuery: Record<string, unknown>) {
    const parsed = catalogueProductsListQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error instanceof ZodError
          ? {
              statusCode: 400,
              message: 'Validation failed',
              error: 'Bad Request',
              details: parsed.error.issues,
            }
          : 'Validation failed',
      );
    }
    return this.catalogueProductListService.listProducts(parsed.data);
  }

  @Patch('products/:id')
  patchProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(catalogueProductUpdateBodySchema))
    body: CatalogueProductUpdateBody,
  ) {
    return this.catalogueProductDetailService.updateProduct(id, body);
  }

  @Post('import-supplier-prices/batch')
  importSupplierPricesBatch(
    @Body(new ZodValidationPipe(importSupplierPricesBatchReqSchema))
    body: ImportSupplierPricesBatchReq,
  ) {
    return this.catalogueImportService.importSupplierPricesBatch(body);
  }
}
