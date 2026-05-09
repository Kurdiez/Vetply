'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import type { ReactNode } from 'react';

const maxWidthClassNames = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

export type ModalVariant = 'normal' | 'danger';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Subtitle under the title (muted body text). */
  description?: ReactNode;
  /** Main content between title and optional footer. */
  children: ReactNode;
  /** Bottom actions; layout is a right-aligned flex row with gap (customize contents freely). */
  footer?: ReactNode;
  variant?: ModalVariant;
  maxWidth?: keyof typeof maxWidthClassNames;
  panelClassName?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'normal',
  maxWidth = 'md',
  panelClassName,
}: ModalProps) {
  const panelToneClasses =
    variant === 'danger'
      ? 'ring-2 ring-danger-500 ring-offset-0'
      : 'ring-1 ring-white/10';

  const titleToneClasses =
    variant === 'danger' ? 'text-danger-500' : 'text-white';

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/80 transition-opacity duration-200 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          transition
          className={[
            'flex max-h-[min(90vh,720px)] w-full flex-col rounded-lg bg-gray-800 p-6 shadow-xl transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0',
            maxWidthClassNames[maxWidth],
            panelToneClasses,
            panelClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <DialogTitle
            className={`text-base font-semibold ${titleToneClasses}`}
          >
            {title}
          </DialogTitle>
          {description != null && (
            <div className="mt-2 text-sm text-gray-400">{description}</div>
          )}
          <div
            className={
              footer != null
                ? 'min-h-0 flex-1 overflow-y-auto'
                : 'overflow-y-auto'
            }
          >
            {children}
          </div>
          {footer != null && (
            <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-3">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
