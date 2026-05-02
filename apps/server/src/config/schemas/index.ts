import { z } from 'zod';
import { Environment, ServerType } from '../types';
import { databaseConfigSchema } from './database';

export const configSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    ENVIRONMENT: z.nativeEnum(Environment).default(Environment.Development),
    APP_URL: z.string().optional().default('http://localhost:3000'),
    PORT: z.coerce.number().int().positive().default(8580),
    SYSTEM_SECRET: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),
    REDIS_USERNAME: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    SERVER_TYPE: z.nativeEnum(ServerType).default(ServerType.API),
    JWT_SECRET: z
      .string()
      .min(1)
      .default('dev-jwt-secret-change-in-production'),
    COVETRUS_USERNAME: z.string().optional(),
    COVETRUS_PASSWORD: z.string().optional(),
    COVETRUS_LOGIN_URL: z.preprocess(
      (v) =>
        v === undefined || v === ''
          ? 'https://connect.covetrus.co.uk/login'
          : v,
      z.string().url(),
    ),
    COVETRUS_ORDER_DETAIL_URL: z.preprocess(
      (v) =>
        v === undefined || v === ''
          ? 'https://connect.covetrus.co.uk/orders-detail-page/1402746'
          : v,
      z.string().url(),
    ),
    /** Ignored: scrape workers always use an isolated temp Chromium profile per session. */
    COVETRUS_CHROME_PROFILE_DIR: z.string().optional(),
  })
  .merge(databaseConfigSchema)
  .refine(
    (data) => {
      if (data.ENVIRONMENT !== Environment.Production) {
        return true;
      }
      return !!(
        data.APP_URL &&
        data.SYSTEM_SECRET &&
        data.SENTRY_DSN &&
        data.DATABASE_HOST &&
        data.DATABASE_USER &&
        data.DATABASE_PASSWORD &&
        data.DATABASE_NAME &&
        data.REDIS_HOST &&
        data.REDIS_PORT &&
        data.REDIS_PASSWORD
      );
    },
    {
      message:
        'Production requires APP_URL, SYSTEM_SECRET, SENTRY_DSN, full database config, and Redis host/port/password',
    },
  );

export type Config = z.infer<typeof configSchema>;

export { databaseConfigSchema };
