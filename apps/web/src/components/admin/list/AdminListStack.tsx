'use client';

import type { ReactNode } from 'react';

export function AdminListStack({ children }: { children: ReactNode }) {
  return <div className="mt-8 space-y-6">{children}</div>;
}
