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
  UseGuards,
} from '@nestjs/common';
import {
  ImportSupplierPricesBatchReq,
  catalogueBulkDeleteProductsBodySchema,
  catalogueProductPickerQuerySchema,
  catalogueProductUpdateBodySchema,
  catalogueProductsListQuerySchema,
  catalogueSupplierListingsQuerySchema,
  importSupplierPricesBatchReqSchema,
  linkSupplierListingsBodySchema,
  unlinkSupplierListingsBodySchema,
  type CatalogueBulkDeleteProductsBody,
  type CatalogueProductUpdateBody,
  type LinkSupplierListingsBody,
  type UnlinkSupplierListingsBody,
} from '@vetply/shared';
import { ZodError } from 'zod';
import { ZodValidationPipe } from '~/commons/validations';
import { SuperUserGuard } from '../guards/super-user.guard';
import { CatalogueImportService } from '../services/catalogue-import.service';
import { CatalogueProductDetailService } from '../services/catalogue-product-detail.service';
import { CatalogueProductListService } from '../services/catalogue-product-list.service';
import { CatalogueSupplierListingListService } from '../services/catalogue-supplier-listing-list.service';

@Controller('admin/catalogue')
@UseGuards(SuperUserGuard)
export class CatalogueController {
  constructor(
    private readonly catalogueImportService: CatalogueImportService,
    private readonly catalogueProductListService: CatalogueProductListService,
    private readonly catalogueSupplierListingListService: CatalogueSupplierListingListService,
    private readonly catalogueProductDetailService: CatalogueProductDetailService,
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
