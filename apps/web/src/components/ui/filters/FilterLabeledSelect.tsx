import { Select } from '@/components/ui/Select';

export type FilterSelectOption = { value: string; label: string };

export type FilterLabeledSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  disabled?: boolean;
};

export function FilterLabeledSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: FilterLabeledSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-white">
        {label}
      </label>
      <div className="mt-2">
        <Select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
