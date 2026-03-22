import { forwardRef } from "react";

const primaryClassName =
  "inline-flex items-center justify-center rounded-md bg-primary-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500";

type ButtonBaseProps = {
  className?: string;
  children?: React.ReactNode;
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
    const merged = [primaryClassName, props.className].filter(Boolean).join(" ");

    if ("href" in props && props.href !== undefined) {
      const { href, children, ...rest } = props;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          {...rest}
          className={merged}
        >
          {children}
        </a>
      );
    }

    const { children, type = "button", ...rest } = props as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        {...rest}
        type={type}
        className={merged}
      >
        {children}
      </button>
    );
  },
);
