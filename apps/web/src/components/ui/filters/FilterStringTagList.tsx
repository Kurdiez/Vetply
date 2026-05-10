import { adminFilterTextInputClassName } from '@/components/ui/form-field-styles';
import { useCallback, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { XMarkIcon } from '@heroicons/react/20/solid';

export type FilterStringTagListProps = {
  id: string;
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function FilterStringTagList({
  id,
  label,
  tags,
  onAdd,
  onRemove,
  placeholder = 'Type and press Enter',
  disabled = false,
}: FilterStringTagListProps) {
  const [input, setInput] = useState('');

  const commit = useCallback(() => {
    const t = input.trim();
    if (t.length > 0) {
      onAdd(t);
      setInput('');
    }
  }, [input, onAdd]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-white">
        {label}
      </label>
      <div className="mt-2 space-y-2">
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <li
                key={`${tag}-${index}`}
                className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-sm text-gray-200"
              >
                <span>{tag}</span>
                <IconButton
                  type="button"
                  tone="subtle"
                  disabled={disabled}
                  aria-label={`Remove ${tag}`}
                  onClick={() => onRemove(index)}
                  className="!p-1"
                >
                  <XMarkIcon className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        <input
          id={id}
          type="text"
          value={input}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          className={adminFilterTextInputClassName}
        />
      </div>
    </div>
  );
}
