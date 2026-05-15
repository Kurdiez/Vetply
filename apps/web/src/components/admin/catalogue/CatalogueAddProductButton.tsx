'use client';

import { Button } from '@/components/ui/Button';
import { postCreateCatalogueProduct } from '@/utils/vetply-api/catalogue-api';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export type CatalogueAddProductButtonProps = {
  onNavigateToProduct: (productId: string) => void;
};

export function CatalogueAddProductButton({
  onNavigateToProduct,
}: CatalogueAddProductButtonProps) {
  const [pending, setPending] = useState(false);

  const onClick = useCallback(async () => {
    setPending(true);
    try {
      const created = await postCreateCatalogueProduct();
      onNavigateToProduct(created.id);
    } catch {
      toast.error('Could not create catalogue product.');
    } finally {
      setPending(false);
    }
  }, [onNavigateToProduct]);

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
