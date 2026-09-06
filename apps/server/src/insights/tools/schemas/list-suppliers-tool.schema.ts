import { z } from 'zod';

export const LIST_SUPPLIERS_TOOL_NAME = 'list_suppliers' as const;

export const listSuppliersToolArgsSchema = z.object({});

export type ListSuppliersToolArgs = z.infer<typeof listSuppliersToolArgsSchema>;

export const listSuppliersToolParameters: Record<string, unknown> = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};
