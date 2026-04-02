import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ImportSupplierPricesBatchReq,
  importSupplierPricesBatchReqSchema,
} from '@vetply/shared';
import { ZodValidationPipe } from '~/commons/validations';
import { CatalogueImportService } from './catalogue-import.service';
import { SuperUserGuard } from './super-user.guard';

@Controller('admin/catalogue')
@UseGuards(SuperUserGuard)
export class CatalogueController {
  constructor(
    private readonly catalogueImportService: CatalogueImportService,
  ) {}

  @Post('import-supplier-prices/batch')
  importSupplierPricesBatch(
    @Body(new ZodValidationPipe(importSupplierPricesBatchReqSchema))
    body: ImportSupplierPricesBatchReq,
  ) {
    return this.catalogueImportService.importNvsBatch(body);
  }
}
