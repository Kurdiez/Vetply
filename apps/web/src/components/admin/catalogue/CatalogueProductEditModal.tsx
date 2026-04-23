"use client";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import {
  fetchCatalogueManufacturers,
} from "@/utils/vetply-api/catalogue-api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  catalogueProductUpdateBodySchema,
  CatalogUnitType,
  LegalCategory,
  SalesCategory,
  type CatalogueManufacturerOption,
  type CatalogueProductUpdateBody,
} from "@vetply/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCatalogueProductDetail } from "./CatalogueProductDetailContext";

const salesOptions = Object.values(SalesCategory).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: "base" }),
);
const legalOptions = Object.values(LegalCategory).sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: "base" }),
);
const unitTypeOptions = Object.values(CatalogUnitType);

function fieldError(message?: string) {
  if (!message) {
    return null;
  }
  return <p className="mt-1 text-sm text-red-400">{message}</p>;
}

export function CatalogueProductEditModal() {
  const {
    detail,
    status,
    editModalOpen,
    closeEditModal,
    saveProduct,
  } = useCatalogueProductDetail();

  const [manufacturers, setManufacturers] = useState<
    CatalogueManufacturerOption[]
  >([]);
  const [mfgLoad, setMfgLoad] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

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
    setMfgLoad("loading");
    void fetchCatalogueManufacturers()
      .then((rows) => {
        if (!cancelled) {
          setManufacturers(rows);
          setMfgLoad("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMfgLoad("error");
          toast.error("Could not load manufacturers.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editModalOpen]);

  useEffect(() => {
    if (!editModalOpen || status !== "ready" || !detail) {
      return;
    }
    reset({
      name: detail.name,
      manufacturerId: detail.manufacturerId ?? "",
      salesCategory: detail.salesCategory ?? "",
      legalCategory: detail.legalCategory ?? "",
      pom:
        detail.pom === null || detail.pom === undefined
          ? ""
          : detail.pom
            ? "true"
            : "false",
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
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
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
    <Dialog open={editModalOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-200 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6 shadow-xl ring-1 ring-white/10 transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          <DialogTitle className="text-base font-semibold text-white">
            Edit product
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-400">
            Update catalogue fields. Image is not editable here yet.
          </p>

          <form
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
                  {...register("name")}
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
                  disabled={mfgLoad === "loading"}
                  {...register("manufacturerId")}
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
                <Select id="edit-product-sales" {...register("salesCategory")}>
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
                <Select id="edit-product-legal" {...register("legalCategory")}>
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
                <Select id="edit-product-pom" {...register("pom")}>
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
                  <Select id="edit-product-unit-type" {...register("unitType")}>
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
                    {...register("unitQuantity")}
                  />
                </div>
                {fieldError(errors.unitQuantity?.message)}
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
