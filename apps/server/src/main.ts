import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { json } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from './config';
import { Environment } from './config/types';

function normalizeAppUrlForCors(url: string | undefined): string | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (trimmed === '') return undefined;
  return trimmed.replace(/\/$/, '');
}

function setupCors(app: INestApplication, configService: ConfigService) {
  const appUrl = normalizeAppUrlForCors(configService.get('APP_URL'));
  const corsOrigins: (string | RegExp)[] = [];
  if (appUrl) corsOrigins.push(appUrl);
  if (configService.get('ENVIRONMENT') === Environment.Development) {
    corsOrigins.push(/^(http|https):\/\/localhost(:\d+)?$/);
  }
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
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

async function setupServer() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const configService = app.get(ConfigService);

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  setupCors(app, configService);

  app.use(json({ limit: '10mb' }));

  const port = configService.get('PORT');
  await app.listen(port, '::');
}

async function bootstrap() {
  await setupSentry();
  await setupServer();
}

bootstrap();
