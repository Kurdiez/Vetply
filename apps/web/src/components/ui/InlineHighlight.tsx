import type { ReactNode } from 'react';

export type InlineHighlightProps = {
  children: ReactNode;
  className?: string;
};

const baseClassName =
  'mx-0.5 inline-block rounded-md bg-orange-400/30 px-2 py-0.5 font-mono text-xs font-semibold text-orange-50 shadow-sm ring-1 ring-orange-400/45 ring-inset';

/** Orange-ish inline chip for column names, codes, or other emphasized tokens. */
export function InlineHighlight({ children, className }: InlineHighlightProps) {
  return (
    <span
      className={className ? `${baseClassName} ${className}` : baseClassName}
    >
      {children}
    </span>
  );
}
