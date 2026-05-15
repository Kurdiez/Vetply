'use client';

import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/20/solid';
import type { MappingCardViewModel } from './CatalogueMappingExportsImportsContext';

export type MappingExportCardsProps = {
  cards: readonly MappingCardViewModel[];
};

export function MappingExportCards({ cards }: MappingExportCardsProps) {
  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {cards.map((card) => (
        <li
          key={card.key}
          className="col-span-1 divide-y divide-white/10 rounded-lg bg-gray-800/50 outline -outline-offset-1 outline-white/10"
        >
          <input
            ref={card.setImportFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={card.onImportFileInputChange}
          />
          <div className="flex w-full items-center justify-between gap-4 p-6">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-white">
                {card.title}
              </h3>
            </div>
            <img
              src={card.logo.src}
              alt={card.logo.alt}
              className="h-10 w-auto max-w-[120px] shrink-0 object-contain"
            />
          </div>
          <div>
            <div className="-mt-px flex divide-x divide-white/10">
              <div className="flex w-0 flex-1">
                <button
                  type="button"
                  disabled={card.pageBusy}
                  aria-busy={card.isExportBusy}
                  onClick={card.onExport}
                  className="relative -mr-px inline-flex w-0 flex-1 cursor-pointer items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowDownTrayIcon
                    aria-hidden
                    className="size-5 text-gray-500"
                  />
                  {card.isExportBusy ? 'Exporting…' : 'Export'}
                </button>
              </div>
              <div className="-ml-px flex w-0 flex-1">
                <button
                  type="button"
                  disabled={card.pageBusy}
                  aria-busy={card.isImportBusy}
                  onClick={card.onImportPick}
                  className="relative inline-flex w-0 min-h-[52px] flex-1 cursor-pointer flex-col items-stretch justify-center gap-1 border border-transparent py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/5"
                >
                  <span className="inline-flex items-center justify-center gap-x-3">
                    <ArrowUpTrayIcon
                      aria-hidden
                      className="size-5 shrink-0 text-gray-500"
                    />
                    {card.isImportBusy ? 'Importing…' : 'Import'}
                  </span>
                  {card.isImportBusy && card.importProgressPct !== null ? (
                    <span
                      className="mx-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                      role="progressbar"
                      aria-valuenow={card.importProgressPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Import progress"
                    >
                      <span
                        className="block h-full rounded-full bg-primary-500 transition-[width] duration-200 ease-out"
                        style={{ width: `${card.importProgressPct}%` }}
                      />
                    </span>
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
