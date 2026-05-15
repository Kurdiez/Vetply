import { z } from 'zod';

export const createAccountFailReasonSchema = z.enum([
  'ACCOUNT_EXISTS_VETPLY',
  'ACCOUNT_EXISTS_GOOGLE',
]);

export type CreateAccountFailReason = z.infer<
  typeof createAccountFailReasonSchema
>;

export const createAccountBusinessErrorBodySchema = z
  .object({
    failReason: createAccountFailReasonSchema,
  })
  .passthrough();

export type CreateAccountBusinessErrorBody = z.infer<
  typeof createAccountBusinessErrorBodySchema
>;

export const createAccountReqSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
});

export type CreateAccountReq = z.infer<typeof createAccountReqSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const createAccountResSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});

export type CreateAccountRes = z.infer<typeof createAccountResSchema>;
