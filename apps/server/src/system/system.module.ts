import { Module } from '@nestjs/common';

import { CatalogueModule } from '~/catalogue/catalogue.module';
import { JobsModule } from '~/jobs/jobs.module';

import { SystemGuard } from './auth/system.guard';
import { CatalogueJobsController } from './jobs/catalogue-jobs.controller';
import { CovetrusJobsController } from './jobs/covetrus-jobs.controller';
import { MwiahJobsController } from './jobs/mwiah-jobs.controller';
import { MonitorController } from './monitor/monitor.controller';

@Module({
  imports: [JobsModule, CatalogueModule],
  controllers: [
    MonitorController,
    CovetrusJobsController,
    MwiahJobsController,
    CatalogueJobsController,
  ],
  providers: [SystemGuard],
})
export class SystemModule {}
