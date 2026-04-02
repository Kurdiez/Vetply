import { CatalogUnitType, LegalCategory, SalesCategory } from '@vetply/shared';
import type { CatalogUnitType as CatalogUnitTypeValue } from '@vetply/shared';

const SALES_VALUES = new Set<string>(Object.values(SalesCategory));
const LEGAL_VALUES = new Set<string>(Object.values(LegalCategory));

export function resolveSalesCategory(raw: string): SalesCategory | null {
  const t = raw.trim();
  return SALES_VALUES.has(t) ? (t as SalesCategory) : null;
}

export function resolveLegalCategory(raw: string): LegalCategory | null {
  const t = raw.trim();
  return LEGAL_VALUES.has(t) ? (t as LegalCategory) : null;
}

export function parsePom(raw: string): boolean | null {
  const t = raw.trim().toLowerCase();
  if (t === 'yes') {
    return true;
  }
  if (t === 'no') {
    return false;
  }
  return null;
}

export function parseNvsVpp(raw: string): string | null {
  const stripped = raw.replace(/£/g, '').replace(/,/g, '').trim();
  if (stripped === '' || stripped === '-') {
    return null;
  }
  const n = Number.parseFloat(stripped);
  if (Number.isNaN(n)) {
    return null;
  }
  return n.toFixed(4);
}

function isUnitToken(s: string): s is CatalogUnitTypeValue {
  return (Object.values(CatalogUnitType) as string[]).includes(s);
}

export function parseNvsUom(raw: string): {
  unitType: CatalogUnitTypeValue;
  unitQuantity: string;
} | null {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (compact === '') {
    return null;
  }

  const pkMatch = /^PK(\d+(?:\.\d+)?)$/.exec(compact);
  if (pkMatch) {
    return {
      unitType: CatalogUnitType.PK,
      unitQuantity: Number.parseFloat(pkMatch[1]).toFixed(6),
    };
  }

  const multMatch = /^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)(ML|L|G|MG|MCG|IU)$/.exec(
    compact,
  );
  if (multMatch) {
    const a = Number.parseFloat(multMatch[1]);
    const b = Number.parseFloat(multMatch[2]);
    const unit = multMatch[3];
    if (!isUnitToken(unit)) {
      return { unitType: CatalogUnitType.OTHER, unitQuantity: '1.000000' };
    }
    return {
      unitType: unit,
      unitQuantity: (a * b).toFixed(6),
    };
  }

  const suffixMatch =
    /^(\d+(?:\.\d+)?)(ML|L|G|MG|MCG|IU|EA|TAB|CAP|VIAL|AMP|BTL|SET)$/.exec(
      compact,
    );
  if (suffixMatch) {
    const qty = Number.parseFloat(suffixMatch[1]);
    const unit = suffixMatch[2];
    if (!isUnitToken(unit)) {
      return { unitType: CatalogUnitType.OTHER, unitQuantity: '1.000000' };
    }
    return {
      unitType: unit,
      unitQuantity: qty.toFixed(6),
    };
  }

  if (compact === 'EA') {
    return { unitType: CatalogUnitType.EA, unitQuantity: '1.000000' };
  }

  if (isUnitToken(compact)) {
    return {
      unitType: compact,
      unitQuantity: '1.000000',
    };
  }

  return { unitType: CatalogUnitType.OTHER, unitQuantity: '1.000000' };
}
