export const Supplier = {
  NVS: 'NVS',
} as const;

export type Supplier = (typeof Supplier)[keyof typeof Supplier];
