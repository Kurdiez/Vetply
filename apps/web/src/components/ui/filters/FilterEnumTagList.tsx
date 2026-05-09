import { IconButton } from '@/components/ui/IconButton';
import { Select } from '@/components/ui/Select';
import { XMarkIcon } from '@heroicons/react/20/solid';
import type { FilterSelectOption } from './FilterLabeledSelect';

export type FilterEnumTagListProps = {
  id: string;
  label: string;
  selected: string[];
  options: FilterSelectOption[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  addControlId: string;
  disabled?: boolean;
};

export function FilterEnumTagList({
  id,
  label,
  selected,
  options,
  onAdd,
  onRemove,
  addControlId,
  disabled = false,
}: FilterEnumTagListProps) {
  const available = options.filter((o) => !selected.includes(o.value));

  return (
    <div>
      <p id={id} className="block text-sm/6 font-medium text-white">
        {label}
      </p>
      <div className="mt-2 space-y-2">
        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selected.map((value, index) => {
              const opt = options.find((o) => o.value === value);
              const display = opt?.label ?? value;
              return (
                <li
                  key={`${value}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-sm text-gray-200"
                >
                  <span>{display}</span>
                  <IconButton
                    type="button"
                    tone="subtle"
                    disabled={disabled}
                    aria-label={`Remove ${display}`}
                    onClick={() => onRemove(index)}
                    className="!p-1"
                  >
                    <XMarkIcon className="size-4" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
        <Select
          key={selected.join('|')}
          id={addControlId}
          value=""
          disabled={disabled || available.length === 0}
          onChange={(e) => {
            const v = e.target.value;
            if (v) {
              onAdd(v);
              e.target.value = '';
            }
          }}
        >
          <option value="">
            {available.length === 0 ? 'All values added' : 'Add value…'}
          </option>
          {available.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
