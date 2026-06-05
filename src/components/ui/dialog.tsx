import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const DialogContext = React.createContext<{ onOpenChange?: (open: boolean) => void } | null>(null);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  onClick?: () => void;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** @default true */
  showCloseButton?: boolean;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  const dialog = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 z-[100] bg-black/50 transition-opacity duration-300 ease-in-out"
        style={{ animation: 'fadeIn 0.2s ease-in-out' }}
        onClick={() => onOpenChange?.(false)}
        aria-hidden
      />
      <DialogContext.Provider value={{ onOpenChange }}>
        <div
          className="absolute left-1/2 z-[101] flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-center transition-all duration-300 ease-in-out"
          style={{
            top: 'calc(56px + (100vh - 56px) / 2)',
            maxHeight: 'calc(100vh - 56px - 2rem)',
            transform: 'translate(-50%, -50%)',
            animation: 'slideUp 0.3s ease-in-out',
          }}
        >
          {children}
        </div>
      </DialogContext.Provider>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 20px)) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(dialog, document.body);
}

export function DialogTrigger({ children, className = "", onClick }: DialogTriggerProps) {
  return (
    <div className={`cursor-pointer ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "", style, showCloseButton = true }: DialogContentProps) {
  const ctx = React.useContext(DialogContext);
  const handleClose = () => ctx?.onOpenChange?.(false);
  const showX = showCloseButton && ctx?.onOpenChange != null;

  // Check if className contains a max-w class or custom class, if so don't apply default max-w-lg and w-full
  const hasMaxWidth = className.includes('max-w-') || className.includes('booking-details-modal');
  const defaultMaxWidth = hasMaxWidth ? '' : 'max-w-lg';
  const defaultWidth = hasMaxWidth ? '' : 'w-full';
  const hasZeroPadding = /\bp-0\b/.test(className);
  const defaultPadding = hasZeroPadding ? '' : 'px-6 pb-6';

  // Merge inline styles with any existing styles
  const mergedStyle = style || {};
  
  return (
    <div className={`relative bg-white rounded-xl shadow-2xl ${defaultPadding} ${defaultMaxWidth} ${defaultWidth} mx-4 ${className}`} style={mergedStyle}>
      {showX && (
        <button
          type="button"
          onClick={handleClose}
          className={`absolute z-10 rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 ${
            hasZeroPadding ? "right-4 top-4 sm:right-6 sm:top-6" : "right-3 top-3"
          }`}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div className={`pl-6 pr-12 pt-6 pb-4 ${className}`}>
      {children}
    </div>
  );
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div className={`px-6 pb-6 flex justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold ${className}`}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className = "" }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 mt-2 ${className}`}>
      {children}
    </p>
  );
}