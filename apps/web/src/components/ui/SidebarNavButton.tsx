import { forwardRef } from "react";

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export type SidebarNavButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "type"
> & {
  className?: string;
  active?: boolean;
};

export const SidebarNavButton = forwardRef<
  HTMLButtonElement,
  SidebarNavButtonProps
>(function SidebarNavButton({ active = false, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={classNames(
        "group flex w-full cursor-pointer items-center gap-x-3 rounded-md p-2 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "bg-white/5 text-white"
          : "text-gray-200 hover:bg-white/5 hover:text-white",
        className,
      )}
      {...rest}
    />
  );
});
