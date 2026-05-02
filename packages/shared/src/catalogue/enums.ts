export const SalesCategory = {
  Consumables: 'Consumables',
  Retail: 'Retail',
  Petfood: 'Petfood',
  Equipment: 'Equipment',
  Pharmaceutical: 'Pharmaceutical',
  Instruments: 'Instruments',
} as const;

export type SalesCategory = (typeof SalesCategory)[keyof typeof SalesCategory];

export const LegalCategory = {
  AVM_GSL: 'AVM-GSL',
  Consumables: 'Consumables',
  GSL_GeneralSalesList: 'GSL (General Sales List)',
  InstrumentsEquip: 'Instruments/Equip',
  NFA_VPS: 'NFA-VPS',
  POM_V: 'POM-V',
  POM_VPS: 'POM-VPS',
  UVP_UnlicensedVetProducts: 'UVP (Unlicensed Vet Products)',
  VeterinaryDiets: 'Veterinary Diets',
  WRS_WaitingRoomSales: 'WRS (Waiting Room Sales)',
} as const;

export type LegalCategory = (typeof LegalCategory)[keyof typeof LegalCategory];

export const CatalogUnitType = {
  ML: 'ML',
  L: 'L',
  G: 'G',
  MG: 'MG',
  MCG: 'MCG',
  IU: 'IU',
  EA: 'EA',
  PK: 'PK',
  TAB: 'TAB',
  CAP: 'CAP',
  VIAL: 'VIAL',
  AMP: 'AMP',
  BTL: 'BTL',
  SET: 'SET',
  OTHER: 'OTHER',
} as const;

export type CatalogUnitType =
  (typeof CatalogUnitType)[keyof typeof CatalogUnitType];
