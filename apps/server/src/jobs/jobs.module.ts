import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { config } from 'dotenv';
import { ConfigModule, ConfigService } from '~/config';
import { Environment, ServerType } from '~/config/types';
import { CovetrusScrapeConsumer } from './consumers/covetrus-scrape.consumer';
import { MwiahScrapeConsumer } from './consumers/mwiah-scrape.consumer';
import { CovetrusModule } from './covetrus/covetrus.module';
import { MwiahModule } from './mwiah/mwiah.module';
import { PRODUCER_OPTIONS, QUEUES } from './const';
import basicAuth = require('express-basic-auth');

config();
if (process.env.SERVER_TYPE == null) {
  throw new Error('SERVER_TYPE env variable is not set');
}

const QUEUE_CONFIGS = QUEUES.map((name) => ({ name }));

function getBullMQImports(): DynamicModule[] {
  return [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: Number(configService.get('REDIS_PORT')),
          password: configService.get('REDIS_PASSWORD'),
          username: configService.get('REDIS_USERNAME'),
          family: 0,
        },
        defaultJobOptions: {
          ...PRODUCER_OPTIONS,
        },
      }),
      inject: [ConfigService],
    }),
    ...QUEUE_CONFIGS.map((queueConfig) =>
      BullModule.registerQueue(queueConfig),
    ),
  ];
}

function getBullBoardImports(): DynamicModule[] {
  if (process.env.SERVER_TYPE !== ServerType.API) {
    return [];
  }

  return [
    BullBoardModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const env = configService.get('ENVIRONMENT');
        const secret = configService.get('SYSTEM_SECRET');
        const useAuth =
          env === Environment.Staging || env === Environment.Production;
        return {
          route: '/jobs',
          adapter: ExpressAdapter,
          middleware: useAuth
            ? basicAuth({
                challenge: true,
                users: { admin: secret },
                realm: 'Bull Board',
              })
            : (_req: unknown, _res: unknown, next: () => void) => next(),
        };
      },
      inject: [ConfigService],
    }),
    ...QUEUE_CONFIGS.map((queueConfig) =>
      BullBoardModule.forFeature({
        name: queueConfig.name,
        adapter: BullMQAdapter,
      }),
    ),
  ];
}

function getConsumers(): Provider[] {
  if (process.env.SERVER_TYPE === ServerType.WORKER) {
    return [CovetrusScrapeConsumer, MwiahScrapeConsumer];
  }
  return [];
}

@Module({
  imports: [
    ...getBullMQImports(),
    ...getBullBoardImports(),
    CovetrusModule,
    MwiahModule,
  ],
  providers: [...getConsumers()],
  exports: [
    CovetrusModule,
    MwiahModule,
    ...QUEUE_CONFIGS.map((queueConfig) =>
      BullModule.registerQueue(queueConfig),
    ),
  ],
})
export class JobsModule {}
