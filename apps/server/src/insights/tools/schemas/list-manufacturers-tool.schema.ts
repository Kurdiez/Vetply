import { z } from 'zod';

export const LIST_MANUFACTURERS_TOOL_NAME = 'list_manufacturers' as const;

export const LIST_MANUFACTURERS_ROW_CAP = 50;

export const listManufacturersToolArgsSchema = z.object({
  q: z.string().min(1).max(256).optional(),
});

export type ListManufacturersToolArgs = z.infer<
  typeof listManufacturersToolArgsSchema
>;

export const listManufacturersToolParameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    q: {
      type: 'string',
      description:
        'Optional manufacturer name filter (case-insensitive contains)',
      minLength: 1,
      maxLength: 256,
    },
  },
  additionalProperties: false,
};
