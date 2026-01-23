"use client"

import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { format, isValid, parseISO, startOfDay, endOfDay, differenceInDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

// ============================================================================
// Types
// ============================================================================

export interface DateRangePreset {
  label: string
  value: {
    start: Date
    end: Date
  }
}

export interface DateRangeValue {
  from: Date | undefined
  to: Date | undefined
}

export interface DateRangePickerProps {
  /** Current date range value */
  value?: DateRangeValue
  /** Change handler */
  onChange?: (value: DateRangeValue | undefined) => void
  /** Minimum date */
  minDate?: Date
  /** Maximum date */
  maxDate?: Date
  /** Maximum span in days */
  maxRangeDays?: number
  /** Minimum span in days */
  minRangeDays?: number
  /** Allow start and end on same day */
  allowSameDay?: boolean
  /** Start date placeholder */
  startPlaceholder?: string
  /** End date placeholder */
  endPlaceholder?: string
  /** Quick selection presets */
  presets?: DateRangePreset[]
  /** Date format for display */
  dateFormat?: string
  /** Disabled state */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Number of months to display */
  numberOfMonths?: number
  /** Show week numbers */
  showWeekNumbers?: boolean
  /** Allow clearing the selection */
  clearable?: boolean
  /** Additional class name */
  className?: string
  /** ID for accessibility */
  id?: string
  /** Align popover */
  align?: "start" | "center" | "end"
}

// ============================================================================
// Helper Functions
// ============================================================================

function getPresetDateRanges(): DateRangePreset[] {
  const today = new Date()
  const todayStart = startOfDay(today)
  const todayEnd = endOfDay(today)

  return [
    {
      label: "Today",
      value: { start: todayStart, end: todayEnd },
    },
    {
      label: "Yesterday",
      value: {
        start: new Date(todayStart.getTime() - 24 * 60 * 60 * 1000),
        end: new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000),
      },
    },
    {
      label: "Last 7 days",
      value: {
        start: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
        end: todayEnd,
      },
    },
    {
      label: "Last 30 days",
      value: {
        start: new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000),
        end: todayEnd,
      },
    },
    {
      label: "This month",
      value: {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: todayEnd,
      },
    },
    {
      label: "Last month",
      value: {
        start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
        end: new Date(today.getFullYear(), today.getMonth(), 0),
      },
    },
    {
      label: "This year",
      value: {
        start: new Date(today.getFullYear(), 0, 1),
        end: todayEnd,
      },
    },
  ]
}

// ============================================================================
// Main Component
// ============================================================================

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  maxRangeDays,
  minRangeDays,
  allowSameDay = true,
  startPlaceholder = "Start date",
  endPlaceholder = "End date",
  presets,
  dateFormat = "MMM d, yyyy",
  disabled = false,
  error = false,
  errorMessage,
  numberOfMonths = 2,
  showWeekNumbers = false,
  clearable = true,
  className,
  id,
  align = "start",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date>(value?.from ?? new Date())

  // Use default presets if none provided
  const displayPresets = presets ?? getPresetDateRanges()

  // Convert value to DateRange for Calendar
  const dateRange: DateRange | undefined = value
    ? { from: value.from, to: value.to }
    : undefined

  // Validation message
  const validationMessage = React.useMemo(() => {
    if (!value?.from || !value?.to) return null

    const days = differenceInDays(value.to, value.from)

    if (!allowSameDay && days === 0) {
      return "Start and end date cannot be the same"
    }

    if (minRangeDays && days < minRangeDays) {
      return `Minimum range is ${minRangeDays} day${minRangeDays > 1 ? "s" : ""}`
    }

    if (maxRangeDays && days > maxRangeDays) {
      return `Maximum range is ${maxRangeDays} day${maxRangeDays > 1 ? "s" : ""}`
    }

    return null
  }, [value, allowSameDay, minRangeDays, maxRangeDays])

  // Handle date selection
  const handleSelect = React.useCallback(
    (range: DateRange | undefined) => {
      if (!range) {
        onChange?.(undefined)
        return
      }

      const newValue: DateRangeValue = {
        from: range.from,
        to: range.to,
      }

      // Validate range
      if (newValue.from && newValue.to) {
        const days = differenceInDays(newValue.to, newValue.from)

        // Check same day
        if (!allowSameDay && days === 0) {
          return
        }

        // Check max range
        if (maxRangeDays && days > maxRangeDays) {
          // Adjust end date to max range
          newValue.to = new Date(
            newValue.from.getTime() + maxRangeDays * 24 * 60 * 60 * 1000
          )
        }
      }

      onChange?.(newValue)
    },
    [onChange, allowSameDay, maxRangeDays]
  )

  // Handle preset selection
  const handlePresetSelect = React.useCallback(
    (preset: DateRangePreset) => {
      onChange?.({
        from: preset.value.start,
        to: preset.value.end,
      })
      setMonth(preset.value.start)
      setOpen(false)
    },
    [onChange]
  )

  // Handle clear
  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange?.(undefined)
    },
    [onChange]
  )

  // Disabled dates
  const disabledDays = React.useMemo(() => {
    const disabled: { before?: Date; after?: Date }[] = []

    if (minDate) {
      disabled.push({ before: minDate })
    }

    if (maxDate) {
      disabled.push({ after: maxDate })
    }

    return disabled.length > 0 ? disabled : undefined
  }, [minDate, maxDate])

  // Format display text
  const displayText = React.useMemo(() => {
    if (!value?.from) {
      return `${startPlaceholder} - ${endPlaceholder}`
    }

    const fromText = format(value.from, dateFormat)

    if (!value.to) {
      return `${fromText} - ${endPlaceholder}`
    }

    const toText = format(value.to, dateFormat)
    return `${fromText} - ${toText}`
  }, [value, startPlaceholder, endPlaceholder, dateFormat])

  const hasValue = value?.from || value?.to

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !hasValue && "text-muted-foreground",
              error && "border-destructive focus:ring-destructive"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1 truncate">{displayText}</span>
            {clearable && hasValue && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 -mr-2 hover:bg-muted"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0"
          align={align}
          sideOffset={4}
        >
          <div className="flex">
            {/* Presets sidebar */}
            {displayPresets.length > 0 && (
              <div className="border-r p-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Quick select
                </p>
                {displayPresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-7"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelect}
                month={month}
                onMonthChange={setMonth}
                numberOfMonths={numberOfMonths}
                showWeekNumber={showWeekNumbers}
                disabled={disabledDays as any}
                initialFocus
              />

              {/* Selected range info */}
              {value?.from && value?.to && (
                <div className="border-t mt-3 pt-3 text-xs text-muted-foreground text-center">
                  {differenceInDays(value.to, value.from) + 1} day
                  {differenceInDays(value.to, value.from) + 1 !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Validation/error message */}
      {(errorMessage || validationMessage) && (
        <p
          className={cn(
            "text-xs",
            errorMessage ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {errorMessage || validationMessage}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Preset Generators (for custom presets)
// ============================================================================

/**
 * Generate fiscal year presets based on fiscal year start
 */
export function getFiscalYearPresets(
  fiscalYearStart: { month: number; day: number }
): DateRangePreset[] {
  const today = new Date()
  const currentYear = today.getFullYear()

  // Determine current fiscal year
  const fiscalYearStartDate = new Date(
    currentYear,
    fiscalYearStart.month - 1,
    fiscalYearStart.day
  )

  let currentFiscalYearStart: Date
  let currentFiscalYearEnd: Date

  if (today < fiscalYearStartDate) {
    // We're in the previous fiscal year
    currentFiscalYearStart = new Date(
      currentYear - 1,
      fiscalYearStart.month - 1,
      fiscalYearStart.day
    )
    currentFiscalYearEnd = new Date(fiscalYearStartDate.getTime() - 1)
  } else {
    currentFiscalYearStart = fiscalYearStartDate
    currentFiscalYearEnd = new Date(
      currentYear + 1,
      fiscalYearStart.month - 1,
      fiscalYearStart.day - 1
    )
  }

  const lastFiscalYearStart = new Date(currentFiscalYearStart)
  lastFiscalYearStart.setFullYear(lastFiscalYearStart.getFullYear() - 1)

  const lastFiscalYearEnd = new Date(currentFiscalYearStart.getTime() - 1)

  return [
    {
      label: "This fiscal year",
      value: {
        start: currentFiscalYearStart,
        end: endOfDay(today),
      },
    },
    {
      label: "Last fiscal year",
      value: {
        start: lastFiscalYearStart,
        end: lastFiscalYearEnd,
      },
    },
  ]
}

/**
 * Generate quarter presets
 */
export function getQuarterPresets(): DateRangePreset[] {
  const today = new Date()
  const currentQuarter = Math.floor(today.getMonth() / 3)
  const currentYear = today.getFullYear()

  const quarterStart = new Date(currentYear, currentQuarter * 3, 1)
  const quarterEnd = new Date(currentYear, currentQuarter * 3 + 3, 0)

  const lastQuarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1)
  const lastQuarterEnd = new Date(currentYear, currentQuarter * 3, 0)

  return [
    {
      label: "This quarter",
      value: {
        start: quarterStart,
        end: endOfDay(today),
      },
    },
    {
      label: "Last quarter",
      value: {
        start: lastQuarterStart,
        end: lastQuarterEnd,
      },
    },
  ]
}

export default DateRangePicker











