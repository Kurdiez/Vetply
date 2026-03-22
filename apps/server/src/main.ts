import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { json, Request } from 'express';
import { AppModule } from './app.module';
import { ConfigModule, ConfigService } from './config';
import { Environment } from './config/types';
import basicAuth = require('express-basic-auth');

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

function prependBullBoardAuth(
  _app: INestApplication,
  expressApp: unknown,
  configService: ConfigService,
) {
  const env = configService.get('ENVIRONMENT');
  const secret = configService.get('SYSTEM_SECRET');
  const requireAuth =
    env === Environment.Staging || env === Environment.Production;
  if (!requireAuth || !secret) return;

  const authMiddleware = basicAuth({
    challenge: true,
    users: { admin: secret },
    realm: 'Bull Board',
  });
  const Layer = require('express/lib/router/layer') as new (
    path: string,
    opts: { end?: boolean },
    fn: (req: Request, res: unknown, next: () => void) => void,
  ) => { handle: unknown; regexp: RegExp; match: (path: string) => boolean };
  const layer = new Layer('/jobs', { end: false }, authMiddleware);
  const router = (expressApp as { _router?: { stack: unknown[] } })._router;
  if (router?.stack) router.stack.unshift(layer);
}

async function setupServer(configService: ConfigService) {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  prependBullBoardAuth(app, expressApp, configService);

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
