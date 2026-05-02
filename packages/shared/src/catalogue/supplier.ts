export const Supplier = {
  NVS: 'NVS',
  VEENAK: 'VEENAK',
  COVETRUS: 'COVETRUS',
} as const;

export type Supplier = (typeof Supplier)[keyof typeof Supplier];
