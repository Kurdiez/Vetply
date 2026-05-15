import { z } from 'zod';

export const exampleEchoReqSchema = z.object({
  message: z.string().min(1),
});

export type ExampleEchoReq = z.infer<typeof exampleEchoReqSchema>;

export const exampleEchoResSchema = z.object({
  message: z.string(),
  echoedAt: z.string().datetime(),
});

export type ExampleEchoRes = z.infer<typeof exampleEchoResSchema>;
