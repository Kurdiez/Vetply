'use client';

import { Button } from '@/components/ui/Button';
import { postCreateCatalogueProduct } from '@/utils/vetply-api/catalogue-api';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCatalogueView } from './CatalogueViewContext';

export function CatalogueAddProductButton() {
  const { navigateToProduct } = useCatalogueView();
  const [pending, setPending] = useState(false);

  const onClick = useCallback(async () => {
    setPending(true);
    try {
      const created = await postCreateCatalogueProduct();
      navigateToProduct(created.id);
    } catch {
      toast.error('Could not create catalogue product.');
    } finally {
      setPending(false);
    }
  }, [navigateToProduct]);

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      className="block text-center sm:inline-flex"
      onClick={() => void onClick()}
    >
      Add Catalogue Product
    </Button>
  );
}
