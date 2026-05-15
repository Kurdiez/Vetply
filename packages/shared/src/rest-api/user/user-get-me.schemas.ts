import { z } from 'zod';
import { UserType } from '../../user/user-type';

export const userGetMeResSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  clinicId: z.string(),
  clinicName: z.string(),
  userType: z.enum([UserType.Member, UserType.Admin, UserType.Super]),
});

export type UserGetMeRes = z.infer<typeof userGetMeResSchema>;
