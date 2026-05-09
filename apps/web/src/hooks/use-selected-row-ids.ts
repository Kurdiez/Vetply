import { useCallback, useMemo, useState } from 'react';

export type UseSelectedRowIdsResult = {
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  toggleSelected: (id: string) => void;
  setSelected: (id: string, selected: boolean) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
};

export function useSelectedRowIds(): UseSelectedRowIdsResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setSelected = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  return useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.size,
      toggleSelected,
      setSelected,
      clearSelection,
      isSelected,
    }),
    [selectedIds, toggleSelected, setSelected, clearSelection, isSelected],
  );
}
