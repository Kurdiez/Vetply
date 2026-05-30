import { Module } from '@nestjs/common';

import { MwiahSessionService } from './mwiah-session.service';

@Module({
  providers: [MwiahSessionService],
  exports: [MwiahSessionService],
})
export class MwiahModule {}
