export const Supplier = {
  NVS: 'NVS',
  VEENAK: 'VEENAK',
} as const;

export type Supplier = (typeof Supplier)[keyof typeof Supplier];
