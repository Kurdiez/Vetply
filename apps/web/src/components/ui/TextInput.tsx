import { forwardRef } from 'react';

const inputClassName =
  'block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary-500 sm:text-sm/6';

export type TextInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className'
> & {
  className?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={[inputClassName, className].filter(Boolean).join(' ')}
        {...rest}
      />
    );
  },
);
