import { forwardRef, type ReactNode } from 'react';

const variantClassNames = {
  primary:
    'text-primary-400 hover:text-primary-300 focus-visible:outline-primary-400',
  red: 'text-danger-500 hover:text-danger-400 focus-visible:outline-danger-500',
  slate: 'text-gray-400 hover:text-gray-200 focus-visible:outline-gray-400',
} as const;

export type IconTextButtonVariant = keyof typeof variantClassNames;

type IconTextButtonBaseProps = {
  icon: ReactNode;
  children: ReactNode;
  variant: IconTextButtonVariant;
  className?: string;
};

type IconTextButtonAsButton = IconTextButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

export type IconTextButtonProps = IconTextButtonAsButton;

export const IconTextButton = forwardRef<
  HTMLButtonElement,
  IconTextButtonProps
>(function IconTextButton(props, ref) {
  const {
    icon,
    children,
    variant,
    className,
    type = 'button',
    ...rest
  } = props;

  const merged = [
    'inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variantClassNames[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} type={type} className={merged} {...rest}>
      <span className="inline-flex shrink-0 [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      {children}
    </button>
  );
});
