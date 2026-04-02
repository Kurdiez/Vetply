import { forwardRef } from "react";

const fileInputClassName =
  "block w-full text-sm text-gray-300 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-400";

export type FileInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & {
  className?: string;
};

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="file"
        className={[fileInputClassName, className].filter(Boolean).join(" ")}
        {...rest}
      />
    );
  },
);
