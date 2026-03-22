import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestjsConfigModule } from '@nestjs/config';
import { ConfigService } from './services/config.service';

@Global()
@Module({
  imports: [NestjsConfigModule],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
