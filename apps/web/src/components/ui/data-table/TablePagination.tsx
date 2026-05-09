import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import {
  buildPaginationWindow,
  type PaginationWindowEntry,
} from './pagination-window';

export type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

function windowKey(entry: PaginationWindowEntry, index: number): string {
  return entry === 'ellipsis' ? `e-${index}` : `p-${entry}`;
}

export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalCount);
  const windowItems = buildPaginationWindow(safePage, totalPages);

  return (
    <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          type="button"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="relative inline-flex cursor-pointer items-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="relative ml-3 inline-flex cursor-pointer items-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-300">
            Showing <span className="font-medium">{from}</span> to{' '}
            <span className="font-medium">{to}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div>
          <nav
            aria-label="Pagination"
            className="isolate inline-flex -space-x-px rounded-md"
          >
            <button
              type="button"
              disabled={disabled || safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className="relative inline-flex cursor-pointer items-center rounded-l-md px-2 py-2 text-gray-400 inset-ring inset-ring-gray-700 hover:bg-white/5 focus:z-20 focus:outline-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon aria-hidden className="size-5" />
            </button>
            {windowItems.map((entry, index) =>
              entry === 'ellipsis' ? (
                <span
                  key={windowKey(entry, index)}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-400 inset-ring inset-ring-gray-700 focus:outline-offset-0"
                >
                  …
                </span>
              ) : (
                <button
                  key={windowKey(entry, index)}
                  type="button"
                  disabled={disabled}
                  aria-current={entry === safePage ? 'page' : undefined}
                  onClick={() => onPageChange(entry)}
                  className={
                    entry === safePage
                      ? 'relative z-10 inline-flex cursor-pointer items-center bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-400 focus:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed'
                      : 'relative inline-flex cursor-pointer items-center px-4 py-2 text-sm font-semibold text-gray-200 inset-ring inset-ring-gray-700 hover:bg-white/5 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed'
                  }
                >
                  {entry}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={disabled || safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className="relative inline-flex cursor-pointer items-center rounded-r-md px-2 py-2 text-gray-400 inset-ring inset-ring-gray-700 hover:bg-white/5 focus:z-20 focus:outline-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon aria-hidden className="size-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
