import { Injectable } from '@nestjs/common';
import { ConfigService as NestjsConfigService } from '@nestjs/config';
import { Config } from '../schemas';

@Injectable()
export class ConfigService {
  constructor(private configService: NestjsConfigService<Config, true>) {}

  get<T extends keyof Config>(key: T): Config[T] {
    return this.configService.get(key, { infer: true });
  }
}
