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
          className="block w-full rounded-md border-0 bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-500 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </div>
  );
}
