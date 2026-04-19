import { CatalogUnitType } from '@vetply/shared';
import type { CatalogUnitType as CatalogUnitTypeValue } from '@vetply/shared';
import { parseNvsUom, parseNvsVpp } from './nvs-csv-parsers';

export function parseVeenakPrice(raw: string): string | null {
  return parseNvsVpp(raw);
}

function formToUnitTypeForPlainCount(formLower: string): CatalogUnitTypeValue {
  if (formLower.includes('tablet')) {
    return CatalogUnitType.TAB;
  }
  if (formLower.includes('cap')) {
    return CatalogUnitType.CAP;
  }
  if (
    formLower.includes('device') ||
    formLower.includes('strip') ||
    formLower.includes('dressing') ||
    formLower.includes('tube') ||
    formLower.includes('sachet') ||
    formLower.includes('patch')
  ) {
    return CatalogUnitType.EA;
  }
  if (formLower.includes('vial')) {
    return CatalogUnitType.VIAL;
  }
  if (formLower.includes('amp')) {
    return CatalogUnitType.AMP;
  }
  if (formLower.includes('injection') || formLower.includes('infusion')) {
    return CatalogUnitType.VIAL;
  }
  if (
    formLower.includes('powder') ||
    formLower.includes('cream') ||
    formLower.includes('ointment') ||
    formLower.includes('gel')
  ) {
    return CatalogUnitType.G;
  }
  if (formLower.includes('drop')) {
    return CatalogUnitType.ML;
  }
  if (formLower.includes('syrup') || formLower.includes('liquid')) {
    return CatalogUnitType.ML;
  }
  return CatalogUnitType.EA;
}

function normalizePackForNvsUom(pack: string): string {
  const s = pack.trim();
  const compact = s.replace(/\s+/g, '').toUpperCase().replace(/GM$/i, 'G');
  const mlX = /^(\d+(?:\.\d+)?)ML[Xx](\d+)$/.exec(compact);
  if (mlX) {
    return `${mlX[2]}X${mlX[1]}ML`;
  }
  return compact;
}

export function parseVeenakPackAndForm(
  packSize: string,
  form: string,
): { unitType: CatalogUnitTypeValue; unitQuantity: string } {
  const pack = packSize.trim();
  const formLower = form.trim().toLowerCase();

  if (pack === '') {
    return { unitType: CatalogUnitType.EA, unitQuantity: '1.000000' };
  }

  const plainInt = /^(\d+)$/.exec(pack);
  if (plainInt) {
    const unitType = formToUnitTypeForPlainCount(formLower);
    return {
      unitType,
      unitQuantity: Number.parseInt(plainInt[1], 10).toFixed(6),
    };
  }

  const normalized = normalizePackForNvsUom(pack);
  return parseNvsUom(normalized);
}
