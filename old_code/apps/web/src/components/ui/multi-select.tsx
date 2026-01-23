"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

// ============================================================================
// Types
// ============================================================================

export interface SelectOption {
  /** Stored value */
  value: string
  /** Display text */
  label: string
  /** Optional description shown in dropdown */
  description?: string
  /** Icon (string for emoji/icon name, or ReactNode) */
  icon?: string | React.ReactNode
  /** Badge/tag color (hex or CSS color) */
  color?: string
  /** Whether option is disabled */
  disabled?: boolean
  /** Group name for grouped options */
  group?: string
}

export interface MultiSelectProps {
  /** Available options */
  options: SelectOption[]
  /** Selected values */
  value: string[]
  /** Change handler */
  onChange: (value: string[]) => void
  /** Enable search */
  searchable?: boolean
  /** Auto-enable search above this threshold (default: 10) */
  searchThreshold?: number
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Minimum required selections */
  minSelection?: number
  /** Maximum allowed selections */
  maxSelection?: number
  /** Placeholder when nothing selected */
  placeholder?: string
  /** How to display selected items */
  displayAs?: "tags" | "chips" | "count"
  /** Tag color variant */
  tagColor?: "auto" | "primary" | "secondary" | "outline"
  /** Disabled state */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Loading state (for async options) */
  loading?: boolean
  /** Search callback for async filtering */
  onSearch?: (query: string) => void
  /** Additional class name */
  className?: string
  /** ID for accessibility */
  id?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupOptions(options: SelectOption[]): Map<string | undefined, SelectOption[]> {
  const groups = new Map<string | undefined, SelectOption[]>()
  
  for (const option of options) {
    const groupKey = option.group
    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(option)
  }
  
  return groups
}

// ============================================================================
// Selected Tags Display
// ============================================================================

interface SelectedTagsProps {
  selected: SelectOption[]
  displayAs: "tags" | "chips" | "count"
  tagColor: "auto" | "primary" | "secondary" | "outline"
  onRemove: (value: string) => void
  disabled?: boolean
  maxDisplay?: number
}

function SelectedTags({
  selected,
  displayAs,
  tagColor,
  onRemove,
  disabled,
  maxDisplay = 3,
}: SelectedTagsProps) {
  if (selected.length === 0) return null

  // Count display mode
  if (displayAs === "count") {
    return (
      <Badge variant="secondary" className="rounded-sm">
        {selected.length} selected
      </Badge>
    )
  }

  // Tags/Chips display mode
  const displayItems = selected.slice(0, maxDisplay)
  const remainingCount = selected.length - maxDisplay

  return (
    <div className="flex flex-wrap gap-1">
      {displayItems.map((option) => {
            const variant = tagColor === "auto" && option.color 
          ? "outline" 
          : tagColor === "auto" 
          ? "secondary"
          : tagColor === "primary"
          ? "default"
          : tagColor

        return (
          <Badge
            key={option.value}
            variant={variant}
            className={cn(
              "rounded-sm px-1.5 py-0 h-6 gap-1",
              displayAs === "chips" && "rounded-full px-2"
            )}
            style={
              tagColor === "auto" && option.color
                ? { borderColor: option.color, color: option.color }
                : undefined
            }
          >
            {option.icon && (
              <span className="text-xs">
                {typeof option.icon === "string" ? option.icon : option.icon}
              </span>
            )}
            <span className="truncate max-w-[100px]">{option.label}</span>
            {!disabled && (
              <button
                type="button"
                className="ml-1 hover:bg-muted rounded-sm p-0.5 -mr-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(option.value)
                }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        )
      })}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="rounded-sm px-1.5 py-0 h-6">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      value,
      onChange,
      searchable,
      searchThreshold = 10,
      searchPlaceholder = "Search...",
      minSelection,
      maxSelection,
      placeholder = "Select options...",
      displayAs = "tags",
      tagColor = "secondary",
      disabled = false,
      error = false,
      errorMessage,
      loading = false,
      onSearch,
      className,
      id,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Determine if search should be enabled
    const isSearchable = searchable ?? options.length > searchThreshold

    // Get selected options as full objects
    const selectedOptions = React.useMemo(
      () => options.filter((opt) => value.includes(opt.value)),
      [options, value]
    )

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options
      const query = searchQuery.toLowerCase()
      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          opt.description?.toLowerCase().includes(query) ||
          opt.value.toLowerCase().includes(query)
      )
    }, [options, searchQuery])

    // Group filtered options
    const groupedOptions = React.useMemo(
      () => groupOptions(filteredOptions),
      [filteredOptions]
    )

    // Handle selection
    const handleSelect = React.useCallback(
      (optionValue: string) => {
        const isSelected = value.includes(optionValue)

        if (isSelected) {
          // Check min selection
          if (minSelection && value.length <= minSelection) {
            return
          }
          onChange(value.filter((v) => v !== optionValue))
        } else {
          // Check max selection
          if (maxSelection && value.length >= maxSelection) {
            return
          }
          onChange([...value, optionValue])
        }
      },
      [value, onChange, minSelection, maxSelection]
    )

    // Handle remove tag
    const handleRemove = React.useCallback(
      (optionValue: string) => {
        if (minSelection && value.length <= minSelection) {
          return
        }
        onChange(value.filter((v) => v !== optionValue))
      },
      [value, onChange, minSelection]
    )

    // Handle search change
    const handleSearchChange = React.useCallback(
      (query: string) => {
        setSearchQuery(query)
        onSearch?.(query)
      },
      [onSearch]
    )

    // Handle select all / clear all
    const handleSelectAll = React.useCallback(() => {
      const allValues = filteredOptions
        .filter((opt) => !opt.disabled)
        .map((opt) => opt.value)

      if (maxSelection) {
        onChange(allValues.slice(0, maxSelection))
      } else {
        onChange(allValues)
      }
    }, [filteredOptions, maxSelection, onChange])

    const handleClearAll = React.useCallback(() => {
      if (minSelection) {
        // Keep minimum required
        onChange(value.slice(0, minSelection))
      } else {
        onChange([])
      }
    }, [value, minSelection, onChange])

    // Validation message
    const validationMessage = React.useMemo(() => {
      if (minSelection && value.length < minSelection) {
        return `Select at least ${minSelection} option${minSelection > 1 ? "s" : ""}`
      }
      if (maxSelection && value.length >= maxSelection) {
        return `Maximum ${maxSelection} option${maxSelection > 1 ? "s" : ""} reached`
      }
      return null
    }, [value.length, minSelection, maxSelection])

    return (
      <div className={cn("space-y-1", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal min-h-10 h-auto",
                error && "border-destructive focus:ring-destructive",
                !value.length && "text-muted-foreground"
              )}
            >
              <div className="flex flex-1 flex-wrap gap-1 items-center">
                {selectedOptions.length > 0 ? (
                  <SelectedTags
                    selected={selectedOptions}
                    displayAs={displayAs}
                    tagColor={tagColor}
                    onRemove={handleRemove}
                    disabled={disabled}
                  />
                ) : (
                  <span>{placeholder}</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              {/* Search input */}
              {isSearchable && (
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <CommandInput
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onValueChange={handleSearchChange}
                    className="border-0 focus:ring-0"
                  />
                </div>
              )}

              {/* Quick actions */}
              {filteredOptions.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1.5 border-b">
                  <span className="text-xs text-muted-foreground">
                    {value.length} of {options.length} selected
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleSelectAll}
                      disabled={maxSelection ? value.length >= maxSelection : false}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleClearAll}
                      disabled={minSelection ? value.length <= minSelection : value.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <CommandList className="max-h-64">
                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                )}

                {/* Empty state */}
                {!loading && filteredOptions.length === 0 && (
                  <CommandEmpty>No options found.</CommandEmpty>
                )}

                {/* Render grouped options */}
                {!loading &&
                  Array.from(groupedOptions.entries()).map(([group, groupOptions], groupIndex) => (
                    <React.Fragment key={group ?? "ungrouped"}>
                      {groupIndex > 0 && <CommandSeparator />}
                      <CommandGroup heading={group}>
                        {groupOptions.map((option) => {
                          const isSelected = value.includes(option.value)
                          const isDisabled =
                            option.disabled ||
                            (!isSelected && maxSelection && value.length >= maxSelection)

                          return (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={() => handleSelect(option.value)}
                              disabled={!!isDisabled}
                              className={cn(
                                "flex items-center gap-2",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {/* Checkbox indicator */}
                              <div
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-sm border",
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-input"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>

                              {/* Option content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {/* Icon */}
                                  {option.icon && (
                                    <span className="text-sm shrink-0">
                                      {typeof option.icon === "string"
                                        ? option.icon
                                        : option.icon}
                                    </span>
                                  )}

                                  {/* Label with optional color badge */}
                                  <span className="truncate">{option.label}</span>

                                  {/* Color indicator */}
                                  {option.color && (
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{ backgroundColor: option.color }}
                                    />
                                  )}
                                </div>

                                {/* Description */}
                                {option.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {option.description}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </React.Fragment>
                  ))}
              </CommandList>
            </Command>
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
)

MultiSelect.displayName = "MultiSelect"

export default MultiSelect











