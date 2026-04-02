export const SalesCategory = {
  Anaesthetics: 'Anaesthetics',
  AntiInflammatory: 'Anti-inflammatory',
  Antimicrobial: 'Antimicrobial',
  Cancer: 'Cancer',
  CardiacRespiratory: 'Cardiac/Respiratory',
  CombiEctoEndoSA: 'Combi Ecto/Endo - SA',
  Consumables: 'Consumables',
  Dental: 'Dental',
  Dermatology: 'Dermatology',
  Diagnostics: 'Diagnostics',
  Diets: 'Diets',
  EarEye: 'Ear/Eye',
  EctosEquine: 'Ectos - Equine',
  EctosLA: 'Ectos - LA',
  EctosSA: 'Ectos - SA',
  EndectosLA: 'Endectos - LA',
  Endocrine: 'Endocrine',
  EndosEquine: 'Endos - Equine',
  EndosLA: 'Endos - LA',
  EndosSA: 'Endos - SA',
  GSL: 'GSL',
  Gastro: 'Gastro',
  InstrumentsEquipment: 'Instruments/Equipment',
  Misc: 'Misc',
  Musculoskeletal: 'Musculoskeletal',
  NvsAdmin: 'NVS Admin',
  Neurology: 'Neurology',
  Nutrients: 'Nutrients',
  Obstetrics: 'Obstetrics',
  Reproduction: 'Reproduction',
  Urinary: 'Urinary',
  VaccinesEquine: 'Vaccines - Equine',
  VaccinesLA: 'Vaccines - LA',
  VaccinesSA: 'Vaccines - SA',
  VascularHaemorhage: 'Vascular/Haemorhage',
  WRS: 'WRS',
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
