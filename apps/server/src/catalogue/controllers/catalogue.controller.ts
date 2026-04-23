import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ImportSupplierPricesBatchReq,
  catalogueProductUpdateBodySchema,
  catalogueProductsListQuerySchema,
  importSupplierPricesBatchReqSchema,
  type CatalogueProductUpdateBody,
} from '@vetply/shared';
import { ZodError } from 'zod';
import { ZodValidationPipe } from '~/commons/validations';
import { SuperUserGuard } from '../guards/super-user.guard';
import { CatalogueImportService } from '../services/catalogue-import.service';
import { CatalogueProductDetailService } from '../services/catalogue-product-detail.service';
import { CatalogueProductListService } from '../services/catalogue-product-list.service';

@Controller('admin/catalogue')
@UseGuards(SuperUserGuard)
export class CatalogueController {
  constructor(
    private readonly catalogueImportService: CatalogueImportService,
    private readonly catalogueProductListService: CatalogueProductListService,
    private readonly catalogueProductDetailService: CatalogueProductDetailService,
  ) {}

  @Get('products/:id')
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogueProductDetailService.getProductDetail(id);
  }

  @Get('manufacturers')
  listManufacturers() {
    return this.catalogueProductDetailService.listManufacturers();
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
