import { Module } from '@nestjs/common';

import { JobsModule } from '~/jobs/jobs.module';

import { SystemGuard } from './auth/system.guard';
import { CovetrusJobsController } from './jobs/covetrus-jobs.controller';
import { MonitorController } from './monitor/monitor.controller';

@Module({
  imports: [JobsModule],
  controllers: [MonitorController, CovetrusJobsController],
  providers: [SystemGuard],
})
export class SystemModule {}
