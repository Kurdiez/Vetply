import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { forwardRef } from 'react';
import { adminSelectFieldClassName } from '@/components/ui/form-field-styles';

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'className'
> & {
  className?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, disabled, ...rest }, ref) {
    return (
      <div className={['relative w-full', className].filter(Boolean).join(' ')}>
        <select
          ref={ref}
          disabled={disabled}
          className={adminSelectFieldClassName}
          {...rest}
        />
        <ChevronDownIcon
          aria-hidden
          className={[
            'pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400',
            disabled ? 'opacity-50' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </div>
    );
  },
);
