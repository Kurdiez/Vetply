import {
  CatalogueFilterFieldId,
  CatalogueFilterOperator,
  CatalogueListSortFieldId,
  type CatalogueProductFilter,
  type CatalogueSort,
  type CatalogueProductPickerQuery,
  Supplier,
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

export function applyCatalogueProductPickerFilters(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  query: Pick<
    CatalogueProductPickerQuery,
    'legalCategory' | 'unitType' | 'unitQuantity'
  >,
): void {
  if (query.legalCategory !== undefined) {
    qb.andWhere('product.legalCategory = :pickerLegalCategory', {
      pickerLegalCategory: query.legalCategory,
    });
  }
  if (query.unitType !== undefined) {
    qb.andWhere('product.unitType = :pickerUnitType', {
      pickerUnitType: query.unitType,
    });
  }
  if (query.unitQuantity !== undefined) {
    qb.andWhere(
      'CAST("product"."unit_quantity" AS numeric) = CAST(:pickerUnitQuantity AS numeric)',
      { pickerUnitQuantity: query.unitQuantity },
    );
  }
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
  }
}

function minListedPriceScalarSql(supplierName: Supplier): string {
  return `(SELECT MIN(l.listed_price::numeric) FROM catalogue_product_supplier_listings l INNER JOIN catalogue_suppliers s ON s.id = l.supplier_id WHERE l.product_id = product.id AND s.name = '${supplierName}' AND l.listed_price IS NOT NULL)`;
}

function minSupplierNameScalarSql(): string {
  return `(SELECT MIN(s.name::text) FROM catalogue_product_supplier_listings l INNER JOIN catalogue_suppliers s ON s.id = l.supplier_id WHERE l.product_id = product.id)`;
}

function orderBySelectAlias(
  qb: SelectQueryBuilder<CatalogueProductEntity>,
  scalarExpression: string,
  selectAlias: string,
  dir: 'ASC' | 'DESC',
): void {
  qb.addSelect(scalarExpression, selectAlias);
  qb.orderBy(selectAlias, dir, 'NULLS LAST');
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
    case CatalogueListSortFieldId.Name:
      qb.orderBy('product.name', dir);
      break;
    case CatalogueListSortFieldId.ManufacturerName:
      qb.orderBy('manufacturer.name', dir);
      break;
    case CatalogueListSortFieldId.Supplier:
      orderBySelectAlias(
        qb,
        minSupplierNameScalarSql(),
        'catalogue_sort_supplier',
        dir,
      );
      break;
    case CatalogueListSortFieldId.CovetrusPrice:
      orderBySelectAlias(
        qb,
        minListedPriceScalarSql(Supplier.COVETRUS),
        'catalogue_sort_covetrus',
        dir,
      );
      break;
    case CatalogueListSortFieldId.NvsPrice:
      orderBySelectAlias(
        qb,
        minListedPriceScalarSql(Supplier.NVS),
        'catalogue_sort_nvs',
        dir,
      );
      break;
    case CatalogueListSortFieldId.VeenakPrice:
      orderBySelectAlias(
        qb,
        minListedPriceScalarSql(Supplier.VEENAK),
        'catalogue_sort_veenak',
        dir,
      );
      break;
    case CatalogueListSortFieldId.MwiahPrice:
      orderBySelectAlias(
        qb,
        minListedPriceScalarSql(Supplier.MWIAH),
        'catalogue_sort_mwiah',
        dir,
      );
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
