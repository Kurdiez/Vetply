import { Module } from '@nestjs/common';

import { CovetrusProductCategoryCodegenService } from './covetrus-product-category-codegen.service';
import { CovetrusSessionService } from './covetrus-session.service';

@Module({
  providers: [CovetrusSessionService, CovetrusProductCategoryCodegenService],
  exports: [CovetrusSessionService, CovetrusProductCategoryCodegenService],
})
export class CovetrusModule {}
