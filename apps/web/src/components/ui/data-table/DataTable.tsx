import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode } from "react";

export type DataTableColumn = {
  id: string;
  header: string;
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn[];
  rows: T[];
  getRowKey: (row: T) => string;
  renderCell: (row: T, columnId: string) => ReactNode;
  /** Root wrapper classes; default adds top margin for standalone use. */
  className?: string;
  sortableColumnIds?: string[];
  sortColumnId?: string | null;
  sortDirection?: "asc" | "desc" | null;
  onSortColumnClick?: (columnId: string) => void;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  renderCell,
  className = "mt-8 flow-root",
  sortableColumnIds,
  sortColumnId = null,
  sortDirection = null,
  onSortColumnClick,
}: DataTableProps<T>) {
  return (
    <div className={className}>
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden outline-1 -outline-offset-1 outline-white/10 sm:rounded-lg">
            <table className="relative min-w-full divide-y divide-white/15">
              <thead className="bg-gray-800/75">
                <tr>
                  {columns.map((col, idx) => {
                    const sortable =
                      sortableColumnIds?.includes(col.id) && onSortColumnClick;
                    const activeSort =
                      sortColumnId === col.id && sortDirection !== null;
                    const thClass =
                      idx === 0
                        ? "py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-200 sm:pl-6"
                        : "px-3 py-3.5 text-left text-sm font-semibold text-gray-200";

                    const headerInner = sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortColumnClick(col.id)}
                        className="group inline-flex w-full cursor-pointer items-center gap-1 rounded text-left font-semibold text-gray-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                      >
                        <span>{col.header}</span>
                        {activeSort && sortDirection === "asc" ? (
                          <ChevronUpIcon
                            aria-hidden
                            className="size-4 shrink-0 text-primary-400"
                          />
                        ) : null}
                        {activeSort && sortDirection === "desc" ? (
                          <ChevronDownIcon
                            aria-hidden
                            className="size-4 shrink-0 text-primary-400"
                          />
                        ) : null}
                      </button>
                    ) : (
                      col.header
                    );

                    return (
                      <th
                        key={col.id}
                        scope="col"
                        className={thClass}
                        aria-sort={
                          sortable
                            ? sortColumnId === col.id && sortDirection === "asc"
                              ? "ascending"
                              : sortColumnId === col.id &&
                                  sortDirection === "desc"
                                ? "descending"
                                : "none"
                            : undefined
                        }
                      >
                        {headerInner}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-gray-800/50">
                {rows.map((row) => (
                  <tr key={getRowKey(row)}>
                    {columns.map((col, idx) => (
                      <td
                        key={col.id}
                        className={
                          idx === 0
                            ? "py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-white sm:pl-6"
                            : "px-3 py-4 text-sm whitespace-nowrap text-gray-400"
                        }
                      >
                        {renderCell(row, col.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
