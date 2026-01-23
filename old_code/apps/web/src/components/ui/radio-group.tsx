"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, defaultValue, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "");
    const currentValue = value ?? internalValue;
    
    const handleChange = (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <RadioGroupContext.Provider value={{ value: currentValue, onValueChange: handleChange }}>
        <div
          ref={ref}
          className={cn("grid gap-2", className)}
          role="radiogroup"
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const checked = context.value === value;
    
    const handleChange = () => {
      context.onValueChange?.(value);
    };

    return (
      <input
        ref={ref}
        type="radio"
        id={id}
        value={value}
        checked={checked}
        onChange={handleChange}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem }







