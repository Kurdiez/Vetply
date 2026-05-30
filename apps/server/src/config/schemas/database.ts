import { z } from 'zod';

export const databaseConfigSchema = z.object({
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_HOST: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
});
