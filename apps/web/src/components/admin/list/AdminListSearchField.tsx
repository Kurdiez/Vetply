'use client';

import type { ChangeEvent } from 'react';

type AdminListSearchFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function AdminListSearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: AdminListSearchFieldProps) {
  return (
    <div className="max-w-md">
      <label htmlFor={id} className="block text-sm font-medium text-gray-200">
        {label}
      </label>
      <input
        id={id}
        type="search"
        name="q"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        className="mt-2 block w-full rounded-md border border-white/15 bg-gray-900/80 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
