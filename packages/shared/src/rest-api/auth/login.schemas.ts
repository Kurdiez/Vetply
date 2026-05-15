import { z } from 'zod';
import {
  createAccountReqSchema,
  createAccountResSchema,
} from './account-create.schemas';

export const loginReqSchema = createAccountReqSchema;
export type LoginReq = z.infer<typeof loginReqSchema>;

export const loginResSchema = createAccountResSchema;
export type LoginRes = z.infer<typeof loginResSchema>;
