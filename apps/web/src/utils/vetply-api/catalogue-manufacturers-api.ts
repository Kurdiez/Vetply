import {
  catalogueManufacturerCreateBodySchema,
  catalogueManufacturerOptionSchema,
  catalogueManufacturerUpdateBodySchema,
  catalogueManufacturersListResSchema,
  type CatalogueManufacturerCreateBody,
  type CatalogueManufacturerOption,
  type CatalogueManufacturerUpdateBody,
} from '@vetply/shared';
import { vetplyApiClient } from './http-client';

export async function fetchCatalogueManufacturers(): Promise<
  CatalogueManufacturerOption[]
> {
  const { data } = await vetplyApiClient.get<unknown>(
    '/admin/catalogue/manufacturers',
  );
  return catalogueManufacturersListResSchema.parse(data);
}

export async function postCatalogueManufacturer(
  body: CatalogueManufacturerCreateBody,
): Promise<CatalogueManufacturerOption> {
  const parsedBody = catalogueManufacturerCreateBodySchema.parse(body);
  const { data } = await vetplyApiClient.post<unknown>(
    '/admin/catalogue/manufacturers',
    parsedBody,
  );
  return catalogueManufacturerOptionSchema.parse(data);
}

export async function patchCatalogueManufacturer(
  id: string,
  body: CatalogueManufacturerUpdateBody,
): Promise<CatalogueManufacturerOption> {
  const parsedBody = catalogueManufacturerUpdateBodySchema.parse(body);
  const { data } = await vetplyApiClient.patch<unknown>(
    `/admin/catalogue/manufacturers/${id}`,
    parsedBody,
  );
  return catalogueManufacturerOptionSchema.parse(data);
}
