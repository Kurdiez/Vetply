import { z } from 'zod';
import { Environment, ServerType } from '../types';
import { databaseConfigSchema } from './database';

export const configSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    ENVIRONMENT: z.nativeEnum(Environment),
    APP_URL: z.string().url(),
    PORT: z.coerce.number().int().positive(),
    SYSTEM_SECRET: z.string().min(1),
    SENTRY_DSN: z.string().min(1),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: z.coerce.number().int().positive(),
    REDIS_USERNAME: z.string(),
    REDIS_PASSWORD: z.string().min(1),
    SERVER_TYPE: z.nativeEnum(ServerType),
    JWT_SECRET: z.string().min(1),
    COVETRUS_USERNAME: z.string().min(1),
    COVETRUS_PASSWORD: z.string().min(1),
    COVETRUS_LOGIN_URL: z.string().url(),
    COVETRUS_ORDER_DETAIL_URL: z.string().url(),
    COVETRUS_CHROME_PROFILE_DIR: z.string().min(1),
    MWIAH_STORE_URL: z.string().url(),
    MWIAH_USERNAME: z.string().min(1),
    MWIAH_PASSWORD: z.string().min(1),
    OPENAI_API_KEY: z.string().default(''),
    AI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  })
  .merge(databaseConfigSchema);

export type Config = z.infer<typeof configSchema>;

export { databaseConfigSchema };
