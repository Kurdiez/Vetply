import { z } from 'zod';

export const userGetMeResSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  clinicId: z.string(),
  clinicName: z.string(),
});

export type UserGetMeRes = z.infer<typeof userGetMeResSchema>;
