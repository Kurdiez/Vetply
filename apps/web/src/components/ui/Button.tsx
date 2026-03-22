import { forwardRef } from "react";

const variantClassNames = {
  primary:
    "items-center justify-center rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
  secondary:
    "items-center justify-center rounded-md bg-white/10 px-3 py-2 text-sm/6 font-semibold text-white ring-1 ring-inset ring-white/5 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/75",
} as const;

export type ButtonVariant = keyof typeof variantClassNames;

type ButtonBaseProps = {
  className?: string;
  children?: React.ReactNode;
  /** When true, the control spans the full width of its parent (e.g. form submit). */
  fullWidth?: boolean;
  variant?: ButtonVariant;
};

type ButtonAsAnchor = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
    href: string;
  };

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: undefined;
  };

export type ButtonProps = ButtonAsAnchor | ButtonAsButton;

export const Button = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      className,
      children,
      fullWidth = false,
      variant = "primary",
      ...rest
    } = props;

    const layout = fullWidth ? "flex w-full" : "inline-flex";
    const merged = [
      layout,
      variantClassNames[variant],
      "cursor-pointer disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if ("href" in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          {...anchorRest}
          className={merged}
        >
          {children}
        </a>
      );
    }

    const { type = "button", ...buttonRest } = rest as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        {...buttonRest}
        type={type}
        className={merged}
      >
        {children}
      </button>
    );
  },
);
