import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import compression from 'compression';
import { json } from 'express';
import type { Request, Response } from 'express';
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

  app.use(
    compression({
      filter: shouldCompressHttpResponse,
    }),
  );
  // inflate: true (default) accepts gzip/deflate request bodies from the web client.
  app.use(json({ limit: '10mb', inflate: true }));

  const port = configService.get('PORT');
  await app.listen(port, '::');
}

function shouldCompressHttpResponse(req: Request, res: Response): boolean {
  const contentType = res.getHeader('Content-Type');
  if (
    typeof contentType === 'string' &&
    contentType.includes('text/event-stream')
  ) {
    return false;
  }
  return compression.filter(req, res);
}

async function bootstrap() {
  await setupSentry();
  await setupServer();
}

bootstrap();
