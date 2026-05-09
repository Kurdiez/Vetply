import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { forwardRef } from 'react';

const selectFieldClassName =
  'block w-full cursor-pointer appearance-none rounded-md border-0 bg-white/5 py-2 pr-11 pl-3 text-sm text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60';

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
          className={selectFieldClassName}
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
