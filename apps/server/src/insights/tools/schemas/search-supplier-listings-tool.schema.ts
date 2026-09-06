import { z } from 'zod';
import { Supplier } from '@vetply/shared';

export const SEARCH_SUPPLIER_LISTINGS_TOOL_NAME =
  'search_supplier_listings' as const;

export const SEARCH_SUPPLIER_LISTINGS_ROW_CAP = 15;

const supplierEnumValues = Object.values(Supplier) as [Supplier, ...Supplier[]];

export const searchSupplierListingsToolArgsSchema = z.object({
  q: z.string().min(1).max(512),
  supplier: z.enum(supplierEnumValues).optional(),
  unmappedOnly: z.boolean().optional(),
});

export type SearchSupplierListingsToolArgs = z.infer<
  typeof searchSupplierListingsToolArgsSchema
>;

export const searchSupplierListingsToolParameters: Record<string, unknown> = {
  type: 'object',
  properties: {
    q: {
      type: 'string',
      description: 'Supplier listing name search text (ILIKE contains)',
      minLength: 1,
      maxLength: 512,
    },
    supplier: {
      type: 'string',
      enum: supplierEnumValues,
      description: 'Optional supplier filter (exact match)',
    },
    unmappedOnly: {
      type: 'boolean',
      description:
        'When true, only return listings not linked to a catalogue product',
    },
  },
  required: ['q'],
  additionalProperties: false,
};
