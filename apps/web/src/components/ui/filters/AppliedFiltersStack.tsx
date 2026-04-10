import { IconButton } from "@/components/ui/IconButton";
import { TrashIcon } from "@heroicons/react/20/solid";

export type AppliedFilterSegmentClassNames = {
  field?: string;
  operator?: string;
  operands?: string;
};

export type AppliedFilterRow = {
  id: string;
  field: string;
  operator: string;
  operands: string;
  segmentClassNames?: AppliedFilterSegmentClassNames;
};

const DEFAULT_FIELD_CLASS = "text-primary-400";
const DEFAULT_OPERATOR_CLASS = "text-amber-300/95";
const DEFAULT_OPERANDS_CLASS = "text-gray-100";

export type AppliedFiltersStackProps = {
  rows: AppliedFilterRow[];
  onRemove: (id: string) => void;
  emptyMessage?: string;
};

export function AppliedFiltersStack({
  rows,
  onRemove,
  emptyMessage = "No filters applied.",
}: AppliedFiltersStackProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">{emptyMessage}</p>
    );
  }

  return (
    <ul className="divide-y divide-white/10" aria-label="Applied filters">
      {rows.map((row, index) => (
        <li key={row.id} className="flex items-center gap-3 py-3">
          {index > 0 ? (
            <span className="w-10 shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-primary-400">
              And
            </span>
          ) : null}
          <p className="min-w-0 flex-1 text-sm">
            <span
              className={
                row.segmentClassNames?.field ?? DEFAULT_FIELD_CLASS
              }
            >
              {row.field}
            </span>
            <span className="text-gray-500"> </span>
            <span
              className={
                row.segmentClassNames?.operator ?? DEFAULT_OPERATOR_CLASS
              }
            >
              {row.operator}
            </span>
            <span className="text-gray-500"> </span>
            <span
              className={
                row.segmentClassNames?.operands ?? DEFAULT_OPERANDS_CLASS
              }
            >
              {row.operands}
            </span>
          </p>
          <IconButton
            type="button"
            tone="subtle"
            aria-label="Remove filter"
            onClick={() => onRemove(row.id)}
            className="shrink-0 self-center !p-1.5 !text-danger-500 hover:bg-white/5 hover:!text-danger-400 focus-visible:!text-danger-400"
          >
            <TrashIcon className="size-5" aria-hidden />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
