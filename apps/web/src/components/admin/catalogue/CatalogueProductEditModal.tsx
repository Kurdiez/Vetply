'use client';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { fetchCatalogueManufacturers } from '@/utils/vetply-api/catalogue-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import {
  catalogueProductUpdateBodySchema,
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  type CatalogueManufacturerOption,
  type CatalogueProductUpdateBody,
} from '@vetply/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCatalogueProductDetail } from './CatalogueProductDetailContext';

const salesOptions = Object.values(SalesCategory).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' }),
);
const legalOptions = Object.values(LegalCategory).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' }),
);
const unitTypeOptions = Object.values(CatalogUnitType);

const EDIT_PRODUCT_FORM_ID = 'catalogue-product-edit-form';

function fieldError(message?: string) {
  if (!message) {
    return null;
  }
  return <p className="mt-1 text-sm text-danger-400">{message}</p>;
}

export function CatalogueProductEditModal() {
  const { detail, status, editModalOpen, closeEditModal, saveProduct } =
    useCatalogueProductDetail();

  const [manufacturers, setManufacturers] = useState<
    CatalogueManufacturerOption[]
  >([]);
  const [mfgLoad, setMfgLoad] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(catalogueProductUpdateBodySchema),
  });

  useEffect(() => {
    if (!editModalOpen) {
      return;
    }
    let cancelled = false;
    setMfgLoad('loading');
    void fetchCatalogueManufacturers()
      .then((rows) => {
        if (!cancelled) {
          setManufacturers(rows);
          setMfgLoad('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMfgLoad('error');
          toast.error('Could not load manufacturers.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editModalOpen]);

  useEffect(() => {
    if (!editModalOpen || status !== 'ready' || !detail) {
      return;
    }
    reset({
      name: detail.name,
      manufacturerId: detail.manufacturerId ?? '',
      salesCategory: detail.salesCategory ?? '',
      legalCategory: detail.legalCategory ?? '',
      pom:
        detail.pom === null || detail.pom === undefined
          ? ''
          : detail.pom
            ? 'true'
            : 'false',
      unitType: detail.unitType,
      unitQuantity: detail.unitQuantity,
    });
  }, [editModalOpen, detail, status, reset]);

  const manufacturerOptions = useMemo(() => {
    const byId = new Map(manufacturers.map((m) => [m.id, m]));
    if (
      detail?.manufacturerId &&
      detail.manufacturerName &&
      !byId.has(detail.manufacturerId)
    ) {
      byId.set(detail.manufacturerId, {
        id: detail.manufacturerId,
        name: detail.manufacturerName,
      });
    }
    return [...byId.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [manufacturers, detail]);

  const onSubmit = useCallback(
    async (data: CatalogueProductUpdateBody) => {
      await saveProduct(data);
    },
    [saveProduct],
  );

  const handleClose = useCallback(() => {
    closeEditModal();
  }, [closeEditModal]);

  return (
    <Modal
      open={editModalOpen}
      onClose={handleClose}
      variant="normal"
      maxWidth="lg"
      title="Edit product"
      description="Update catalogue fields. Image is not editable here yet."
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={EDIT_PRODUCT_FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form
        id={EDIT_PRODUCT_FORM_ID}
        className="mt-6 space-y-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          <label
            htmlFor="edit-product-name"
            className="block text-sm/6 font-medium text-white"
          >
            Product title
          </label>
          <div className="mt-2">
            <TextInput
              id="edit-product-name"
              autoComplete="off"
              {...register('name')}
            />
          </div>
          {fieldError(errors.name?.message)}
        </div>

        <div>
          <label
            htmlFor="edit-product-manufacturer"
            className="block text-sm/6 font-medium text-white"
          >
            Manufacturer
          </label>
          <div className="mt-2">
            <Select
              id="edit-product-manufacturer"
              disabled={mfgLoad === 'loading'}
              {...register('manufacturerId')}
            >
              <option value="">No manufacturer</option>
              {manufacturerOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          {fieldError(errors.manufacturerId?.message)}
        </div>

        <div>
          <label
            htmlFor="edit-product-sales"
            className="block text-sm/6 font-medium text-white"
          >
            Sales category
          </label>
          <div className="mt-2">
            <Select id="edit-product-sales" {...register('salesCategory')}>
              <option value="">None</option>
              {salesOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          {fieldError(errors.salesCategory?.message)}
        </div>

        <div>
          <label
            htmlFor="edit-product-legal"
            className="block text-sm/6 font-medium text-white"
          >
            Legal category
          </label>
          <div className="mt-2">
            <Select id="edit-product-legal" {...register('legalCategory')}>
              <option value="">None</option>
              {legalOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          {fieldError(errors.legalCategory?.message)}
        </div>

        <div>
          <label
            htmlFor="edit-product-pom"
            className="block text-sm/6 font-medium text-white"
          >
            POM
          </label>
          <div className="mt-2">
            <Select id="edit-product-pom" {...register('pom')}>
              <option value="">Unspecified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
          </div>
          {fieldError(errors.pom?.message)}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="edit-product-unit-type"
              className="block text-sm/6 font-medium text-white"
            >
              Unit type
            </label>
            <div className="mt-2">
              <Select id="edit-product-unit-type" {...register('unitType')}>
                {unitTypeOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            {fieldError(errors.unitType?.message)}
          </div>
          <div>
            <label
              htmlFor="edit-product-unit-qty"
              className="block text-sm/6 font-medium text-white"
            >
              Unit quantity
            </label>
            <div className="mt-2">
              <TextInput
                id="edit-product-unit-qty"
                inputMode="decimal"
                autoComplete="off"
                {...register('unitQuantity')}
              />
            </div>
            {fieldError(errors.unitQuantity?.message)}
          </div>
        </div>
      </form>
    </Modal>
  );
}
