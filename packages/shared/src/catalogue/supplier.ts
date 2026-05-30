export const Supplier = {
  NVS: 'NVS',
  VEENAK: 'VEENAK',
  COVETRUS: 'COVETRUS',
  MWIAH: 'MWIAH',
} as const;

export type Supplier = (typeof Supplier)[keyof typeof Supplier];
