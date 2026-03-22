import { z } from 'zod';

export const databaseConfigSchema = z.object({
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_HOST: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string().default('postgres'),
});
