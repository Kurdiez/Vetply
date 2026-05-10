import { adminFilterTextInputClassName } from '@/components/ui/form-field-styles';

export type FilterTextInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function FilterTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: FilterTextInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-white">
        {label}
      </label>
      <div className="mt-2">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={adminFilterTextInputClassName}
        />
      </div>
    </div>
  );
}
