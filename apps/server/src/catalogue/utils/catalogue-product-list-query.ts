import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  type CatalogueProductFilter,
  type CatalogueSort,
} from '@vetply/shared';
import type { CatalogueProductEntity } from '~/database/entities/catalogue/catalogue-product.entity';
import { Brackets, type Repository, type SelectQueryBuilder } from 'typeorm';

type NextParam = () => string;

type CatalogueProductSupplierFilter = {
  id?: string;
  kind: 'string';
  fieldId: typeof CatalogueFilterFieldId.Supplier;
  operator: CatalogueFilterOperator;
  value: string | string[];
};

function createParamCounter(): NextParam {
  let i = 0;
  return () => `f${i++}`;
}

function manufacturerNameColumnSql(): string {
  return 'manufacturer.name';
}

function supplierListingExists(conditionSql: string): string {
  return `EXISTS (
    SELECT 1 FROM catalogue_product_supplier_listings sup_l
    INNER JOIN catalogue_suppliers sup_s ON sup_s.id = sup_l.supplier_id
    WHERE sup_l.product_id = product.id AND (${conditionSql})
  )`;
}

function applySupplierFilter(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  filter: CatalogueProductSupplierFilter,
  next: NextParam,
): void {
  const op = filter.operator;
  const value = filter.value;
  const singleToken = (v: string | string[]): string =>
    Array.isArray(v) ? v[0] : v;
  const nameTrimLower = `LOWER(TRIM(sup_s.name::text))`;
  const nameLower = `LOWER(sup_s.name::text)`;

  if (op === CatalogueFilterOperator.IsExactly) {
    const k = next();
    qb.andWhere(
      supplierListingExists(`${nameTrimLower} = LOWER(TRIM(:${k}))`),
      {
        [k]: singleToken(value),
      },
    );
    return;
  }
  if (op === CatalogueFilterOperator.IsDistinctFrom) {
    const k = next();
    qb.andWhere(
      `NOT (${supplierListingExists(`${nameTrimLower} = LOWER(TRIM(:${k}))`)})`,
      { [k]: singleToken(value) },
    );
    return;
  }
  if (op === CatalogueFilterOperator.Contains) {
    const k = next();
    qb.andWhere(
      supplierListingExists(`STRPOS(${nameLower}, LOWER(:${k})) > 0`),
      { [k]: singleToken(value) },
    );
    return;
  }
  if (op === CatalogueFilterOperator.DoesNotContain) {
    const k = next();
    qb.andWhere(
      `NOT (${supplierListingExists(`STRPOS(${nameLower}, LOWER(:${k})) > 0`)})`,
      { [k]: singleToken(value) },
    );
    return;
  }
  if (op === CatalogueFilterOperator.ContainsAnyOf) {
    const tokens = Array.isArray(value) ? value : [value];
    qb.andWhere(
      new Brackets((outer) => {
        for (const t of tokens) {
          const k = next();
          outer.orWhere(
            supplierListingExists(`STRPOS(${nameLower}, LOWER(:${k})) > 0`),
            { [k]: t },
          );
        }
      }),
    );
    return;
  }
  if (op === CatalogueFilterOperator.DoesNotContainAnyOf) {
    const tokens = Array.isArray(value) ? value : [value];
    for (const t of tokens) {
      const k = next();
      qb.andWhere(
        `NOT (${supplierListingExists(`STRPOS(${nameLower}, LOWER(:${k})) > 0`)})`,
        { [k]: t },
      );
    }
  }
}

function applyStringFilter(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  filter: Extract<CatalogueProductFilter, { kind: 'string' }> & {
    fieldId: typeof CatalogueFilterFieldId.ManufacturerName;
  },
  next: NextParam,
): void {
  const col = manufacturerNameColumnSql();
  const op = filter.operator;
  const value = filter.value;

  const singleToken = (v: string | string[]): string =>
    Array.isArray(v) ? v[0] : v;

  if (op === CatalogueFilterOperator.IsExactly) {
    const k = next();
    qb.andWhere(`LOWER(TRIM(${col})) = LOWER(TRIM(:${k}))`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === CatalogueFilterOperator.IsDistinctFrom) {
    const k = next();
    qb.andWhere(`LOWER(TRIM(${col})) <> LOWER(TRIM(:${k}))`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === CatalogueFilterOperator.Contains) {
    const k = next();
    qb.andWhere(`STRPOS(LOWER(${col}), LOWER(:${k})) > 0`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === CatalogueFilterOperator.DoesNotContain) {
    const k = next();
    qb.andWhere(`STRPOS(LOWER(${col}), LOWER(:${k})) = 0`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === CatalogueFilterOperator.ContainsAnyOf) {
    const tokens = Array.isArray(value) ? value : [value];
    qb.andWhere(
      new Brackets((sub) => {
        for (const t of tokens) {
          const k = next();
          sub.orWhere(`STRPOS(LOWER(${col}), LOWER(:${k})) > 0`, { [k]: t });
        }
      }),
    );
    return;
  }
  if (op === CatalogueFilterOperator.DoesNotContainAnyOf) {
    const tokens = Array.isArray(value) ? value : [value];
    for (const t of tokens) {
      const k = next();
      qb.andWhere(`STRPOS(LOWER(${col}), LOWER(:${k})) = 0`, { [k]: t });
    }
  }
}

function applySalesCategoryFilter(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  filter: Extract<
    CatalogueProductFilter,
    { kind: 'enum'; fieldId: typeof CatalogueFilterFieldId.SalesCategory }
  >,
  next: NextParam,
): void {
  const col = 'product.salesCategory';
  const op = filter.operator;
  const value = filter.value;

  if (op === CatalogueFilterOperator.IsExactly) {
    const k = next();
    const v = Array.isArray(value) ? value[0] : value;
    qb.andWhere(`${col} = :${k}`, { [k]: v });
    return;
  }
  if (op === CatalogueFilterOperator.IsDistinctFrom) {
    const k = next();
    const v = Array.isArray(value) ? value[0] : value;
    qb.andWhere(`${col} <> :${k}`, { [k]: v });
    return;
  }
  if (op === CatalogueFilterOperator.ContainsAnyOf) {
    const arr = Array.isArray(value) ? value : [value];
    const k = next();
    qb.andWhere(`${col} IN (:...${k})`, { [k]: arr });
    return;
  }
  if (op === CatalogueFilterOperator.DoesNotContainAnyOf) {
    const arr = Array.isArray(value) ? value : [value];
    const k = next();
    qb.andWhere(`${col} NOT IN (:...${k})`, { [k]: arr });
  }
}

function applyLegalCategoryFilter(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  filter: Extract<
    CatalogueProductFilter,
    { kind: 'enum'; fieldId: typeof CatalogueFilterFieldId.LegalCategory }
  >,
  next: NextParam,
): void {
  const col = 'product.legalCategory';
  const op = filter.operator;
  const value = filter.value;

  if (op === CatalogueFilterOperator.IsExactly) {
    const k = next();
    const v = Array.isArray(value) ? value[0] : value;
    qb.andWhere(`${col} = :${k}`, { [k]: v });
    return;
  }
  if (op === CatalogueFilterOperator.IsDistinctFrom) {
    const k = next();
    const v = Array.isArray(value) ? value[0] : value;
    qb.andWhere(`${col} <> :${k}`, { [k]: v });
    return;
  }
  if (op === CatalogueFilterOperator.ContainsAnyOf) {
    const arr = Array.isArray(value) ? value : [value];
    const k = next();
    qb.andWhere(`${col} IN (:...${k})`, { [k]: arr });
    return;
  }
  if (op === CatalogueFilterOperator.DoesNotContainAnyOf) {
    const arr = Array.isArray(value) ? value : [value];
    const k = next();
    qb.andWhere(`${col} NOT IN (:...${k})`, { [k]: arr });
  }
}

function applyPomFilter(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  filter: Extract<CatalogueProductFilter, { kind: 'boolean' }>,
  next: NextParam,
): void {
  const k = next();
  qb.andWhere(`product.pom = :${k}`, { [k]: filter.value });
}

/** Escape `%`, `_`, and `\\` for use in ILIKE ... ESCAPE '\\'. */
function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * AND with other filters: case-insensitive substring match on `product.name`.
 */
export function applyCatalogueProductNameSearch(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  nameSearch: string | undefined,
): void {
  const trimmed = nameSearch?.trim();
  if (!trimmed) {
    return;
  }
  const k = 'nameSearchPat';
  const escaped = escapeIlikePattern(trimmed);
  qb.andWhere(`product.name ILIKE :${k} ESCAPE '\\'`, {
    [k]: `%${escaped}%`,
  });
}

export function applyCatalogueProductFilters(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  filters: CatalogueProductFilter[] | undefined,
): void {
  if (!filters?.length) {
    return;
  }
  const next = createParamCounter();
  for (const filter of filters) {
    if (filter.kind === 'string') {
      if (filter.fieldId === CatalogueFilterFieldId.Supplier) {
        applySupplierFilter(qb, filter as CatalogueProductSupplierFilter, next);
      } else {
        applyStringFilter(
          qb,
          filter as Extract<CatalogueProductFilter, { kind: 'string' }> & {
            fieldId: typeof CatalogueFilterFieldId.ManufacturerName;
          },
          next,
        );
      }
    } else if (filter.fieldId === CatalogueFilterFieldId.SalesCategory) {
      applySalesCategoryFilter(qb, filter, next);
    } else if (filter.fieldId === CatalogueFilterFieldId.LegalCategory) {
      applyLegalCategoryFilter(qb, filter, next);
    } else if (filter.kind === 'boolean') {
      applyPomFilter(qb, filter, next);
    }
  }
}

export function applyCatalogueProductSort(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  sort: CatalogueSort | undefined,
): void {
  if (!sort) {
    qb.orderBy('product.updatedAt', 'DESC');
    qb.addOrderBy('product.id', 'ASC');
    return;
  }
  const dir = sort.direction.toUpperCase() as 'ASC' | 'DESC';
  switch (sort.fieldId) {
    case CatalogueFilterFieldId.Name:
      qb.orderBy('product.name', dir);
      break;
    case CatalogueFilterFieldId.ManufacturerName:
      qb.orderBy('manufacturer.name', dir);
      break;
    case CatalogueFilterFieldId.SalesCategory:
      qb.orderBy('product.salesCategory', dir);
      break;
    case CatalogueFilterFieldId.LegalCategory:
      qb.orderBy('product.legalCategory', dir);
      break;
    case CatalogueFilterFieldId.Pom:
      qb.orderBy('product.pom', dir);
      break;
    case CatalogueFilterFieldId.Supplier:
      qb.orderBy('product.updatedAt', 'DESC');
      break;
    default:
      qb.orderBy('product.updatedAt', 'DESC');
  }
  qb.addOrderBy('product.id', 'ASC');
}

export function createCatalogueProductListQueryBuilder(
  productRepository: Repository<CatalogueProductEntity>,
): SelectQueryBuilder<CatalogueProductEntity> {
  return productRepository
    .createQueryBuilder('product')
    .leftJoinAndSelect('product.manufacturer', 'manufacturer');
}
