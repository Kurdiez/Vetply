import {
  SupplierListingFilterFieldId,
  SupplierListingPriceOperator,
  SupplierListingSortFieldId,
  SupplierListingStringOperator,
  SupplierListingSupplierOperator,
  type SupplierListingFilter,
  type SupplierListingSort,
} from '@vetply/shared';
import type { CatalogueProductSupplierListingEntity } from '~/database/entities/catalogue/catalogue-product-supplier-listing.entity';
import { Brackets, type Repository, type SelectQueryBuilder } from 'typeorm';

type NextParam = () => string;

function createParamCounter(): NextParam {
  let i = 0;
  return () => `slf${i++}`;
}

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function applySupplierListingNameSearch(
  qb: SelectQueryBuilder<CatalogueProductSupplierListingEntity>,
  nameSearch: string | undefined,
): void {
  const trimmed = nameSearch?.trim();
  if (!trimmed) {
    return;
  }
  const k = 'supplierListingNamePat';
  const escaped = escapeIlikePattern(trimmed);
  qb.andWhere(`listing.name ILIKE :${k} ESCAPE '\\'`, {
    [k]: `%${escaped}%`,
  });
}

function singleToken(v: string | string[]): string {
  return Array.isArray(v) ? v[0] : v;
}

function applyStringFilterOnColumn(
  qb: SelectQueryBuilder<CatalogueProductSupplierListingEntity>,
  columnSql: string,
  filter: Extract<SupplierListingFilter, { kind: 'string' }>,
  next: NextParam,
): void {
  const op = filter.operator;
  const value = filter.value;

  if (op === SupplierListingStringOperator.IsExactly) {
    const k = next();
    qb.andWhere(`LOWER(TRIM(${columnSql})) = LOWER(TRIM(:${k}))`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === SupplierListingStringOperator.IsDistinctFrom) {
    const k = next();
    qb.andWhere(`LOWER(TRIM(${columnSql})) <> LOWER(TRIM(:${k}))`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === SupplierListingStringOperator.Contains) {
    const k = next();
    qb.andWhere(`STRPOS(LOWER(${columnSql}), LOWER(:${k})) > 0`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === SupplierListingStringOperator.DoesNotContain) {
    const k = next();
    qb.andWhere(`STRPOS(LOWER(${columnSql}), LOWER(:${k})) = 0`, {
      [k]: singleToken(value),
    });
    return;
  }
  if (op === SupplierListingStringOperator.ContainsAnyOf) {
    const tokens = Array.isArray(value) ? value : [value];
    qb.andWhere(
      new Brackets((sub) => {
        for (const t of tokens) {
          const k = next();
          sub.orWhere(`STRPOS(LOWER(${columnSql}), LOWER(:${k})) > 0`, {
            [k]: t,
          });
        }
      }),
    );
    return;
  }
  if (op === SupplierListingStringOperator.DoesNotContainAnyOf) {
    const tokens = Array.isArray(value) ? value : [value];
    for (const t of tokens) {
      const k = next();
      qb.andWhere(`STRPOS(LOWER(${columnSql}), LOWER(:${k})) = 0`, {
        [k]: t,
      });
    }
  }
}

function applySupplierEnumFilter(
  qb: SelectQueryBuilder<CatalogueProductSupplierListingEntity>,
  filter: Extract<SupplierListingFilter, { kind: 'supplier' }>,
  next: NextParam,
): void {
  const col = 'supplier.name';
  const op = filter.operator;
  const v = filter.value;

  if (op === SupplierListingSupplierOperator.IsExactly) {
    const k = next();
    qb.andWhere(`${col}::text = :${k}`, { [k]: v });
    return;
  }
  if (op === SupplierListingSupplierOperator.IsDistinctFrom) {
    const k = next();
    qb.andWhere(`${col}::text <> :${k}`, { [k]: v });
  }
}

function applyPriceFilter(
  qb: SelectQueryBuilder<CatalogueProductSupplierListingEntity>,
  filter: Extract<SupplierListingFilter, { kind: 'decimal' }>,
  next: NextParam,
): void {
  const op = filter.operator;
  const raw = filter.value.trim();
  const k = next();

  qb.andWhere('listing.listed_price IS NOT NULL');

  const cmp =
    op === SupplierListingPriceOperator.Eq
      ? '='
      : op === SupplierListingPriceOperator.Gt
        ? '>'
        : op === SupplierListingPriceOperator.Lt
          ? '<'
          : op === SupplierListingPriceOperator.Gte
            ? '>='
            : op === SupplierListingPriceOperator.Lte
              ? '<='
              : '=';

  qb.andWhere(`listing.listed_price::numeric ${cmp} CAST(:${k} AS numeric)`, {
    [k]: raw,
  });
}

export function applySupplierListingFilters(
  qb: SelectQueryBuilder<CatalogueProductSupplierListingEntity>,
  filters: SupplierListingFilter[] | undefined,
): void {
  if (!filters?.length) {
    return;
  }
  const next = createParamCounter();
  for (const filter of filters) {
    switch (filter.kind) {
      case 'string':
        if (filter.fieldId === SupplierListingFilterFieldId.SupplierProductId) {
          applyStringFilterOnColumn(
            qb,
            'listing.supplier_product_id',
            filter,
            next,
          );
        } else {
          applyStringFilterOnColumn(qb, 'product.name', filter, next);
        }
        break;
      case 'catalogProductNotLinked':
        qb.andWhere('listing.product_id IS NULL');
        break;
      case 'supplier':
        applySupplierEnumFilter(qb, filter, next);
        break;
      case 'decimal':
        applyPriceFilter(qb, filter, next);
        break;
      default:
        break;
    }
  }
}

export function applySupplierListingSort(
  qb: SelectQueryBuilder<CatalogueProductSupplierListingEntity>,
  sort: SupplierListingSort | undefined,
): void {
  if (!sort) {
    qb.orderBy('listing.updatedAt', 'DESC');
    qb.addOrderBy('listing.id', 'ASC');
    return;
  }
  const dir = sort.direction.toUpperCase() as 'ASC' | 'DESC';
  switch (sort.fieldId) {
    case SupplierListingSortFieldId.ListingName:
      qb.orderBy('listing.name', dir);
      break;
    case SupplierListingSortFieldId.Supplier:
      qb.orderBy('supplier.name', dir);
      break;
    case SupplierListingSortFieldId.SupplierProductId:
      qb.orderBy('listing.supplier_product_id', dir);
      break;
    case SupplierListingSortFieldId.ListedPrice:
      qb.orderBy('listing.listed_price', dir, 'NULLS LAST');
      break;
    case SupplierListingSortFieldId.CatalogProductName:
      qb.orderBy('product.name', dir, 'NULLS LAST');
      break;
    default:
      qb.orderBy('listing.updatedAt', 'DESC');
  }
  qb.addOrderBy('listing.id', 'ASC');
}

export function createSupplierListingListQueryBuilder(
  listingRepository: Repository<CatalogueProductSupplierListingEntity>,
): SelectQueryBuilder<CatalogueProductSupplierListingEntity> {
  return listingRepository
    .createQueryBuilder('listing')
    .innerJoinAndSelect('listing.supplier', 'supplier')
    .leftJoinAndSelect('listing.product', 'product');
}
