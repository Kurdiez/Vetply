import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { config } from 'dotenv';
import { ConfigModule, ConfigService } from '~/config';
import { Environment, ServerType } from '~/config/types';
import { QUEUES } from './const';
import { ExampleQueueConsumer } from './consumers/example-queue.consumer';
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
          removeOnComplete: false,
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
        const requireAuth =
          env === Environment.Staging || env === Environment.Production;
        if (requireAuth && !secret) {
          throw new Error(
            'SYSTEM_SECRET is required for Bull Board dashboard in staging and production. Set it in env.',
          );
        }
        const useAuth = Boolean(secret);
        return {
          route: '/jobs',
          adapter: ExpressAdapter,
          middleware:
            useAuth && secret
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
    return [ExampleQueueConsumer];
  }
  return [];
}

@Module({
  imports: [...getBullMQImports(), ...getBullBoardImports()],
  providers: [...getConsumers()],
  exports: [
    ...QUEUE_CONFIGS.map((queueConfig) =>
      BullModule.registerQueue(queueConfig),
    ),
  ],
})
export class JobsModule {}
