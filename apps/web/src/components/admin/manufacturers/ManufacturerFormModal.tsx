'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextInput } from '@/components/ui/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  catalogueManufacturerCreateBodySchema,
  type CatalogueManufacturerCreateBody,
} from '@vetply/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

const MANUFACTURER_FORM_ID = 'manufacturer-form';

function fieldError(message?: string) {
  if (!message) {
    return null;
  }
  return <p className="mt-1 text-sm text-danger-400">{message}</p>;
}

export type ManufacturerFormModalProps = {
  open: boolean;
  title: string;
  initialName: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function ManufacturerFormModal({
  open,
  title,
  initialName,
  submitting,
  onClose,
  onSubmit,
}: ManufacturerFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogueManufacturerCreateBody>({
    resolver: zodResolver(catalogueManufacturerCreateBodySchema),
    defaultValues: { name: initialName },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    reset({ name: initialName });
  }, [open, initialName, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={MANUFACTURER_FORM_ID}
            disabled={submitting}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        id={MANUFACTURER_FORM_ID}
        onSubmit={(e) => {
          void handleSubmit(async (values) => {
            await onSubmit(values.name);
          })(e);
        }}
      >
        <label className="block text-sm font-medium text-gray-200">
          Name
          <TextInput
            className="mt-2 w-full"
            autoFocus
            disabled={submitting}
            {...register('name')}
          />
        </label>
        {fieldError(errors.name?.message)}
      </form>
    </Modal>
  );
}
