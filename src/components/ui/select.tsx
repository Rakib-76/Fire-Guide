import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
}

const Select = ({ value: controlledValue, onValueChange, defaultValue, children }: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen, triggerRef }}>
      <div ref={triggerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          className
        )}
        onClick={() => context?.setOpen(!context.open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

type SelectValueProps = {
  placeholder?: string;
  /** When the Select `value` is an id, pass the human-readable label here so the trigger does not show the raw id. */
  label?: string;
  /** Label stays narrow so the chevron sits close (header filters). */
  compact?: boolean;
};

const SelectValue = ({ placeholder, label, compact }: SelectValueProps) => {
  const context = React.useContext(SelectContext);
  const raw = context?.value ?? "";
  const valueClass = cn("block min-w-0 truncate text-left", compact ? "shrink-0" : "flex-1");
  if (label !== undefined) {
    const hasSelection = raw !== "";
    return (
      <span className={cn(valueClass, !hasSelection && "text-gray-500")}>
        {!hasSelection ? (placeholder ?? "") : label.trim() ? label : "—"}
      </span>
    );
  }
  if (!raw) {
    return <span className={cn(valueClass, "text-gray-500")}>{placeholder ?? ""}</span>;
  }
  return <span className={valueClass}>{raw}</span>;
};

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });

    React.useLayoutEffect(() => {
      if (context?.open && context.triggerRef.current) {
        const rect = context.triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }, [context?.open]);

    React.useEffect(() => {
      if (!context?.open) return;
      const updatePosition = () => {
        if (context.triggerRef.current) {
          const rect = context.triggerRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }, [context?.open]);

    if (!context?.open) return null;
    if (!context.triggerRef.current) return null;

    const rect = context.triggerRef.current.getBoundingClientRect();
    const pos = position.width > 0 ? position : {
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    };

    const content = (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => context.setOpen(false)}
        />
        <div
          ref={ref}
          className={cn(
            "fixed z-50 rounded-md border border-gray-200 bg-white shadow-lg py-1",
            className
          )}
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: "min(280px, 60vh)",
            overflowY: "auto",
            overflowX: "hidden",
          }}
          {...props}
        >
          {children}
        </div>
      </>
    );

    return createPortal(content, document.body);
  }
);
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isSelected = context?.value === value;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100",
          isSelected && "bg-gray-100",
          className
        )}
        onClick={() => context?.onValueChange(value)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
