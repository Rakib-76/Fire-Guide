import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type?: "single" | "multiple";
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

interface AccordionProps {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  children: React.ReactNode;
  className?: string;
}

const Accordion = ({ type = "single", defaultValue, children, className }: AccordionProps) => {
  const [openItems, setOpenItems] = React.useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );

  const toggleItem = (value: string) => {
    if (type === "single") {
      setOpenItems(openItems.includes(value) ? [] : [value]);
    } else {
      setOpenItems(
        openItems.includes(value)
          ? openItems.filter((item) => item !== value)
          : [...openItems, value]
      );
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
};

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const AccordionItem = ({ value, children, className }: AccordionItemProps) => {
  return (
    <div className={cn("border-b border-gray-200", className)} data-value={value}>
      {children}
    </div>
  );
};

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    const value = (props as any)["data-value"] || "";
    const isOpen = context?.openItems.includes(value);

    // Get the value from the parent AccordionItem
    const getValueFromParent = (element: HTMLElement | null): string => {
      if (!element) return "";
      if (element.hasAttribute("data-value")) {
        return element.getAttribute("data-value") || "";
      }
      return getValueFromParent(element.parentElement);
    };

    return (
      <button
        ref={ref}
        className={cn(
          "flex flex-1 items-center justify-between py-4 transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
          className
        )}
        onClick={(e) => {
          const itemValue = getValueFromParent(e.currentTarget);
          context?.toggleItem(itemValue);
        }}
        {...props}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
    );
  }
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext);
    
    // Get the value from the parent AccordionItem
    const getValueFromParent = (element: HTMLElement | null): string => {
      if (!element) return "";
      if (element.hasAttribute("data-value")) {
        return element.getAttribute("data-value") || "";
      }
      return getValueFromParent(element.parentElement);
    };

    const [value, setValue] = React.useState("");
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (contentRef.current) {
        setValue(getValueFromParent(contentRef.current));
      }
    }, []);

    const isOpen = context?.openItems.includes(value);

    return (
      <div
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-all",
          isOpen ? "animate-accordion-down" : "hidden"
        )}
        {...props}
      >
        <div ref={ref} className={cn("pb-4 pt-0", className)}>
          {children}
        </div>
      </div>
    );
  }
);
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
