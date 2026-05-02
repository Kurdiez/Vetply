import { Module } from '@nestjs/common';

import { CovetrusSessionService } from './covetrus-session.service';

@Module({
  providers: [CovetrusSessionService],
  exports: [CovetrusSessionService],
})
export class CovetrusModule {}
