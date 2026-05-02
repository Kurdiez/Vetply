import { CatalogUnitType } from './enums';

const MULTI_CHAR_UNIT_VALUES = (
  Object.values(CatalogUnitType) as CatalogUnitType[]
).filter((u) => u !== CatalogUnitType.OTHER && u.length > 1);

const SINGLE_CHAR_UNIT_VALUES = (
  Object.values(CatalogUnitType) as CatalogUnitType[]
).filter((u) => u !== CatalogUnitType.OTHER && u.length === 1);

function escapeRegExpLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTrailingUnitQuantityPattern(): RegExp {
  const multi = [...MULTI_CHAR_UNIT_VALUES].sort((a, b) => b.length - a.length);
  const multiAlt = multi
    .map((u) => {
      const escaped = escapeRegExpLiteral(u);
      return `${escaped}s?`;
    })
    .join('|');

  const singleAlt = SINGLE_CHAR_UNIT_VALUES.map((u) =>
    escapeRegExpLiteral(u),
  ).join('|');

  return new RegExp(
    `\\s+\\d+(?:\\.\\d+)?\\s*(?:${multiAlt}|${singleAlt})\\s*$`,
    'i',
  );
}

const TRAILING_UNIT_QUANTITY_PATTERN = buildTrailingUnitQuantityPattern();

/** Removes trailing `{decimal} {catalog unit}` tails (iteratively). OTHER is excluded. */
export function stripTrailingCatalogUnitQuantityFromProductName(
  raw: string,
): string {
  let s = raw.normalize('NFKC').trim();
  if (s === '') {
    return '';
  }
  let next = s.replace(TRAILING_UNIT_QUANTITY_PATTERN, '').trimEnd();
  while (next !== s) {
    s = next;
    next = s.replace(TRAILING_UNIT_QUANTITY_PATTERN, '').trimEnd();
  }
  return s.trim();
}
