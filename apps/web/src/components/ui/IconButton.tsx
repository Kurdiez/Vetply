import { forwardRef } from 'react';

const toneClassNames = {
  default:
    '-m-2.5 cursor-pointer rounded-md p-2.5 text-gray-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
  subtle:
    '-m-2.5 cursor-pointer rounded-md p-2.5 text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
} as const;

export type IconButtonTone = keyof typeof toneClassNames;

export type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> & {
  className?: string;
  tone?: IconButtonTone;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { tone = 'default', className, type = 'button', ...rest },
    ref,
  ) {
    const merged = [
      'inline-flex shrink-0 items-center justify-center disabled:pointer-events-none disabled:opacity-60',
      toneClassNames[tone],
      className,
    ]
      .filter(Boolean)
      .join(' ');
    return <button ref={ref} type={type} className={merged} {...rest} />;
  },
);
