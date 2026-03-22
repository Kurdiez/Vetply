import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { json } from 'express';
import { AppModule } from './app.module';
import { ConfigModule, ConfigService } from './config';
import { Environment } from './config/types';

function setupCors(app: INestApplication, configService: ConfigService) {
  const corsOrigins: (string | RegExp)[] = [configService.get('APP_URL')];
  if (configService.get('ENVIRONMENT') === Environment.Development) {
    corsOrigins.push(/^(http|https):\/\/localhost(:\d+)?$/);
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
}

declare module 'express' {
  interface Request {
    userId?: string;
  }
}

async function setupSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.ENVIRONMENT,
    tracesSampleRate: 0,
  });
}

async function setupServer(configService: ConfigService) {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  app.use(json({ limit: '10mb' }));

  setupCors(app, configService);

  const port = configService.get('PORT') ?? 8580;
  await app.listen(port, '::');
}

async function bootstrap() {
  const configModuleContext = await NestFactory.createApplicationContext(
    ConfigModule,
    { logger: ['log', 'error', 'warn'] },
  );
  const configService = configModuleContext.get(ConfigService);

  await setupSentry();
  await setupServer(configService);
}

bootstrap();
