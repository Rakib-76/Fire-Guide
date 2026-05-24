import * as React from "react";
import { cn } from "./utils";

interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value: controlledValue, defaultValue, onValueChange, max = 100, min = 0, step = 1, disabled, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || [min]);
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleValueChange = (newValue: number[]) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const updateValue = (clientX: number) => {
      if (!sliderRef.current || disabled) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percentage * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      handleValueChange([clampedValue]);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      setIsDragging(true);
      updateValue(e.clientX);
    };

    React.useEffect(() => {
      if (!isDragging) return;

      const handleMouseMove = (e: MouseEvent) => {
        updateValue(e.clientX);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isDragging]);

    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <div
          ref={sliderRef}
          className={cn(
            "relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onMouseDown={handleMouseDown}
        >
          <div
            className="absolute h-full bg-red-600"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className={cn(
            "absolute h-5 w-5 rounded-full border-2 border-red-600 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            disabled && "cursor-not-allowed"
          )}
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
