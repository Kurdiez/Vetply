import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import {
  CatalogueProductDetailReq,
  ImportSupplierPricesBatchReq,
  catalogueProductDetailReqSchema,
  catalogueProductsListQuerySchema,
  importSupplierPricesBatchReqSchema,
} from '@vetply/shared';
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
    private readonly catalogueProductDetailService: CatalogueProductDetailService,
    private readonly catalogueProductListService: CatalogueProductListService,
  ) {}

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

  @Post('products/detail')
  getProductDetail(
    @Body(new ZodValidationPipe(catalogueProductDetailReqSchema))
    body: CatalogueProductDetailReq,
  ) {
    return this.catalogueProductDetailService.getProductDetail(body.productId);
  }

  @Post('import-supplier-prices/batch')
  importSupplierPricesBatch(
    @Body(new ZodValidationPipe(importSupplierPricesBatchReqSchema))
    body: ImportSupplierPricesBatchReq,
  ) {
    return this.catalogueImportService.importNvsBatch(body);
  }
}
