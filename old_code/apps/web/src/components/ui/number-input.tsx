"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Button } from "./button"
import { Slider } from "./slider"
import { Label } from "./label"

// ============================================================================
// Types
// ============================================================================

export interface SliderMark {
  value: number
  label: string
}

export interface NumberInputProps {
  /** Current value */
  value?: number | null
  /** Change handler */
  onChange?: (value: number | null) => void
  /** Input type: regular input or slider */
  inputType?: "input" | "slider"
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step value */
  step?: number
  /** Number of decimal places */
  decimalPlaces?: number
  /** Show +/- step buttons */
  showStepButtons?: boolean
  /** Marks for slider (labeled points) */
  sliderMarks?: SliderMark[]
  /** Show value label while dragging slider */
  showSliderValue?: boolean
  /** Prefix displayed before value */
  prefix?: string
  /** Suffix displayed after value (e.g., "items", "kg") */
  suffix?: string
  /** Use thousand separator (1,000 vs 1000) */
  thousandSeparator?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Read-only state */
  readOnly?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Additional class name */
  className?: string
  /** ID for accessibility */
  id?: string
  /** Label for the field */
  label?: string
  /** Blur handler */
  onBlur?: () => void
  /** Focus handler */
  onFocus?: () => void
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatNumber(
  value: number,
  options: {
    decimalPlaces?: number
    thousandSeparator?: boolean
    prefix?: string
    suffix?: string
  }
): string {
  const { decimalPlaces = 0, thousandSeparator = false, prefix = "", suffix = "" } = options

  let formatted = value.toFixed(decimalPlaces)

  if (thousandSeparator) {
    const parts = formatted.split("." as any)
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    formatted = parts.join(".")
  }

  return `${prefix}${formatted}${suffix}`
}

function parseNumber(
  value: string,
  options: {
    decimalPlaces?: number
    min?: number
    max?: number
  }
): number | null {
  // Remove non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^\d.\-]/g, "")

  if (cleaned === "" || cleaned === "-") {
    return null
  }

  let parsed = parseFloat(cleaned)

  if (isNaN(parsed)) {
    return null
  }

  // Apply decimal places
  if (options.decimalPlaces !== undefined) {
    parsed = parseFloat(parsed.toFixed(options.decimalPlaces))
  }

  // Apply min/max constraints
  if (options.min !== undefined && parsed < options.min) {
    parsed = options.min
  }
  if (options.max !== undefined && parsed > options.max) {
    parsed = options.max
  }

  return parsed
}

// ============================================================================
// Slider Display Component
// ============================================================================

interface NumberSliderProps extends Omit<NumberInputProps, "inputType" | "showStepButtons"> {
  sliderMarks?: SliderMark[]
  showSliderValue?: boolean
}

function NumberSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  sliderMarks,
  showSliderValue = true,
  prefix = "",
  suffix = "",
  decimalPlaces = 0,
  thousandSeparator = false,
  disabled = false,
  error,
  className,
  id,
  label,
}: NumberSliderProps) {
  const currentValue = value ?? min

  const handleChange = React.useCallback(
    (values: number[]) => {
      onChange?.(values[0])
    },
    [onChange]
  )

  const formattedValue = formatNumber(currentValue, {
    decimalPlaces,
    thousandSeparator,
    prefix,
    suffix,
  })

  return (
    <div className={cn("space-y-4", className)}>
      {/* Value display */}
      {showSliderValue && (
        <div className="flex items-center justify-between">
          {label && <Label htmlFor={id}>{label}</Label>}
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              error && "text-destructive"
            )}
          >
            {formattedValue}
          </span>
        </div>
      )}

      {/* Slider */}
      <div className="relative pt-1 pb-6">
        <Slider
          id={id}
          value={[currentValue]}
          onValueChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(error && "[&_[role=slider]]:border-destructive")}
        />

        {/* Marks */}
        {sliderMarks && sliderMarks.length > 0 && (
          <div className="absolute w-full top-7">
            {sliderMarks.map((mark) => {
              const position = ((mark.value - min) / (max - min)) * 100
              return (
                <div
                  key={mark.value}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  <div className="w-0.5 h-1.5 bg-border mx-auto mb-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {mark.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Min/Max labels (if no marks) */}
      {(!sliderMarks || sliderMarks.length === 0) && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {formatNumber(min, { decimalPlaces, thousandSeparator, prefix, suffix })}
          </span>
          <span>
            {formatNumber(max, { decimalPlaces, thousandSeparator, prefix, suffix })}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Input Display Component
// ============================================================================

interface NumberFieldInputProps extends Omit<NumberInputProps, "inputType" | "sliderMarks" | "showSliderValue"> {}

function NumberFieldInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimalPlaces = 0,
  showStepButtons = false,
  prefix = "",
  suffix = "",
  thousandSeparator = false,
  placeholder,
  disabled = false,
  readOnly = false,
  error = false,
  className,
  id,
  onBlur,
  onFocus,
}: NumberFieldInputProps) {
  const [inputValue, setInputValue] = React.useState<string>("")
  const [isFocused, setIsFocused] = React.useState(false)

  // Sync input value with prop value
  React.useEffect(() => {
    if (!isFocused && value !== null && value !== undefined) {
      setInputValue(
        formatNumber(value, {
          decimalPlaces,
          thousandSeparator,
        })
      )
    } else if (value === null || value === undefined) {
      setInputValue("")
    }
  }, [value, decimalPlaces, thousandSeparator, isFocused])

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      setInputValue(rawValue)

      const parsed = parseNumber(rawValue, { decimalPlaces, min, max })
      onChange?.(parsed)
    },
    [onChange, decimalPlaces, min, max]
  )

  const handleFocus = React.useCallback(() => {
    setIsFocused(true)
    // Show raw number for editing
    if (value !== null && value !== undefined) {
      setInputValue(value.toString())
    }
    onFocus?.()
  }, [value, onFocus])

  const handleBlur = React.useCallback(() => {
    setIsFocused(false)
    // Reformat on blur
    if (value !== null && value !== undefined) {
      setInputValue(
        formatNumber(value, {
          decimalPlaces,
          thousandSeparator,
        })
      )
    }
    onBlur?.()
  }, [value, decimalPlaces, thousandSeparator, onBlur])

  const handleStep = React.useCallback(
    (direction: "up" | "down") => {
      const currentValue = value ?? 0
      const newValue = direction === "up" ? currentValue + step : currentValue - step

      // Apply constraints
      let constrained = newValue
      if (min !== undefined && constrained < min) constrained = min
      if (max !== undefined && constrained > max) constrained = max

      // Apply decimal places
      constrained = parseFloat(constrained.toFixed(decimalPlaces))

      onChange?.(constrained)
    },
    [value, step, min, max, decimalPlaces, onChange]
  )

  const canStepDown = min === undefined || (value ?? 0) > min
  const canStepUp = max === undefined || (value ?? 0) < max

  return (
    <div className={cn("flex items-center", className)}>
      {/* Step down button */}
      {showStepButtons && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-r-none border-r-0"
          onClick={() => handleStep("down")}
          disabled={disabled || !canStepDown}
        >
          <Minus className="h-4 w-4" />
        </Button>
      )}

      {/* Input with prefix/suffix */}
      <div className="relative flex-1">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "text-right tabular-nums",
            prefix && "pl-8",
            suffix && "pr-8",
            showStepButtons && "rounded-none",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>

      {/* Step up button */}
      {showStepButtons && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-l-none border-l-0"
          onClick={() => handleStep("up")}
          disabled={disabled || !canStepUp}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      inputType = "input",
      sliderMarks,
      showSliderValue,
      errorMessage,
      ...props
    },
    ref
  ) => {
    return (
      <div className="space-y-1">
        {inputType === "slider" ? (
          <NumberSlider
            {...props}
            sliderMarks={sliderMarks}
            showSliderValue={showSliderValue}
          />
        ) : (
          <NumberFieldInput {...props} />
        )}

        {/* Error message */}
        {errorMessage && (
          <p className="text-xs text-destructive">{errorMessage}</p>
        )}
      </div>
    )
  }
)

NumberInput.displayName = "NumberInput"

// ============================================================================
// Specialized Variants
// ============================================================================

/**
 * Currency input with currency symbol
 */
export interface CurrencyInputProps extends Omit<NumberInputProps, "prefix" | "decimalPlaces"> {
  /** Currency code (USD, EUR, etc.) */
  currencyCode?: string
  /** Symbol position */
  symbolPosition?: "prefix" | "suffix"
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  INR: "₹",
  MXN: "MX$",
  BRL: "R$",
}

export function CurrencyInput({
  currencyCode = "USD",
  symbolPosition = "prefix",
  ...props
}: CurrencyInputProps) {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode

  return (
    <NumberInput
      {...props}
      prefix={symbolPosition === "prefix" ? symbol : undefined}
      suffix={symbolPosition === "suffix" ? symbol : undefined}
      decimalPlaces={2}
      thousandSeparator={true}
    />
  )
}

/**
 * Percentage input with % symbol
 */
export interface PercentageInputProps extends Omit<NumberInputProps, "suffix" | "min" | "max"> {
  /** Minimum percentage (default: 0) */
  min?: number
  /** Maximum percentage (default: 100) */
  max?: number
  /** Show % symbol (default: true) */
  showPercentSign?: boolean
}

export function PercentageInput({
  min = 0,
  max = 100,
  showPercentSign = true,
  decimalPlaces = 0,
  ...props
}: PercentageInputProps) {
  return (
    <NumberInput
      {...props}
      min={min}
      max={max}
      decimalPlaces={decimalPlaces}
      suffix={showPercentSign ? "%" : undefined}
    />
  )
}

export default NumberInput











