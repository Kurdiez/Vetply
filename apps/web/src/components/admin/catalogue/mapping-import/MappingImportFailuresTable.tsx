'use client';

import type { CatalogueCsvImportRowFailure } from '@vetply/shared';

export type MappingImportFailuresTableProps = {
  failures: CatalogueCsvImportRowFailure[];
};

export function MappingImportFailuresTable({
  failures,
}: MappingImportFailuresTableProps) {
  if (failures.length === 0) {
    return null;
  }
  const sorted = [...failures].sort((a, b) => a.rowNumber - b.rowNumber);
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-300">
        Row issues ({sorted.length})
      </p>
      <div className="mt-2 max-h-64 overflow-auto rounded-md ring-1 ring-white/10">
        <table className="min-w-full text-left text-xs text-gray-300">
          <thead className="sticky top-0 bg-gray-900/95 text-gray-400">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Column</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <tr
                key={`${f.rowNumber}-${f.column}-${i}`}
                className="border-t border-white/5"
              >
                <td className="whitespace-nowrap px-3 py-2">{f.rowNumber}</td>
                <td className="whitespace-nowrap px-3 py-2">{f.column}</td>
                <td
                  className="max-w-[140px] truncate px-3 py-2"
                  title={f.value}
                >
                  {f.value}
                </td>
                <td className="px-3 py-2">{f.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
