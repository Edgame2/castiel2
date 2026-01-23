"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown, Search, Loader2, Box, Plus, ExternalLink } from "lucide-react"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip"
import { useShards, useSearchShards } from "@/hooks/use-shards"
import { shardTypeApi } from "@/lib/api/shard-types"
import { useQuery } from "@tanstack/react-query"
import type { Shard, ShardType } from "@/types/api"

// ============================================================================
// Types
// ============================================================================

export interface ShardPickerProps {
  /** Selected shard ID(s) */
  value: string | string[] | null
  /** Change handler */
  onChange: (value: string | string[] | null) => void
  /** Target ShardType ID (required) */
  shardTypeId: string
  /** Alternative: allow multiple ShardTypes */
  shardTypeIds?: string[]
  /** Allow selecting multiple shards */
  multiple?: boolean
  /** Minimum required selections (for multiple) */
  minSelection?: number
  /** Maximum allowed selections (for multiple) */
  maxSelection?: number
  /** Filter shards by status */
  statusFilter?: string[]
  /** Custom filter conditions */
  customFilter?: Record<string, unknown>
  /** Placeholder text */
  placeholder?: string
  /** Field to display for selected shard (default: 'name') */
  displayField?: string
  /** Fields to search when filtering */
  searchFields?: string[]
  /** Show shard preview on hover */
  showPreview?: boolean
  /** Allow creating new shard inline */
  allowCreate?: boolean
  /** Callback when "Create new" is clicked */
  onCreateNew?: () => void
  /** Disabled state */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Additional class name */
  className?: string
  /** ID for accessibility */
  id?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function getShardDisplayValue(shard: Shard, displayField: string = "name"): string {
  if (displayField === "name") {
    return shard.name
  }

  // Try to get from metadata
  const metadataValue = shard.metadata?.[displayField]
  if (metadataValue !== undefined) {
    return String(metadataValue)
  }

  // Try to get from unstructuredData
  const unstructuredValue = shard.unstructuredData?.[displayField]
  if (unstructuredValue !== undefined) {
    return String(unstructuredValue)
  }

  // Fallback to name
  return shard.name
}

function generateShardColor(shardTypeId: string): string {
  // Generate a consistent color based on shard type ID
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-amber-500",
  ]

  let hash = 0
  for (let i = 0; i < shardTypeId.length; i++) {
    hash = ((hash << 5) - hash) + shardTypeId.charCodeAt(i)
    hash |= 0
  }

  return colors[Math.abs(hash) % colors.length]
}

// ============================================================================
// Shard Icon Component
// ============================================================================

interface ShardIconProps {
  shard: Shard
  shardType?: ShardType
  size?: "sm" | "md" | "lg"
  className?: string
}

function ShardIcon({ shard, shardType, size = "sm", className }: ShardIconProps) {
  const sizeClasses = {
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-xs",
    lg: "h-8 w-8 text-sm",
  }

  // Use shard type icon/color if available
  const iconClass = shardType?.icon || "📄"
  const bgColor = shardType?.color || generateShardColor(shard.shardTypeId)

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded",
        sizeClasses[size],
        !shardType?.color && bgColor,
        className
      )}
      style={shardType?.color ? { backgroundColor: shardType.color } : undefined}
    >
      {typeof iconClass === "string" && iconClass.length <= 2 ? (
        <span>{iconClass}</span>
      ) : (
        <Box className="h-3 w-3 text-white" />
      )}
    </div>
  )
}

// ============================================================================
// Shard Preview Component
// ============================================================================

interface ShardPreviewProps {
  shard: Shard
  shardType?: ShardType
}

function ShardPreview({ shard, shardType }: ShardPreviewProps) {
  return (
    <div className="p-3 max-w-xs">
      <div className="flex items-start gap-2 mb-2">
        <ShardIcon shard={shard} shardType={shardType} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{shard.name}</p>
          {shardType && (
            <p className="text-xs text-muted-foreground">{shardType.displayName}</p>
          )}
        </div>
      </div>

      {shard.description && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
          {shard.description}
        </p>
      )}

      {shard.tags && shard.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shard.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {shard.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{shard.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Updated {new Date(shard.updatedAt).toLocaleDateString()}
      </p>
    </div>
  )
}

// ============================================================================
// Selected Shards Display
// ============================================================================

interface SelectedShardsProps {
  shards: Shard[]
  shardTypes: Map<string, ShardType>
  displayField: string
  showPreview: boolean
  onRemove: (shardId: string) => void
  disabled?: boolean
  maxDisplay?: number
}

function SelectedShards({
  shards,
  shardTypes,
  displayField,
  showPreview,
  onRemove,
  disabled,
  maxDisplay = 3,
}: SelectedShardsProps) {
  if (shards.length === 0) return null

  const displayItems = shards.slice(0, maxDisplay)
  const remainingCount = shards.length - maxDisplay

  const renderShard = (shard: Shard) => {
    const shardType = shardTypes.get(shard.shardTypeId)
    const badge = (
      <Badge
        key={shard.id}
        variant="secondary"
        className="rounded-sm px-1.5 py-0 h-6 gap-1"
      >
        <ShardIcon shard={shard} shardType={shardType} size="sm" className="h-4 w-4" />
        <span className="truncate max-w-[120px]">
          {getShardDisplayValue(shard, displayField)}
        </span>
        {!disabled && (
          <button
            type="button"
            className="ml-1 hover:bg-muted rounded-sm p-0.5 -mr-1"
            onClick={(e) => {
              e.stopPropagation()
              onRemove(shard.id)
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </Badge>
    )

    if (showPreview) {
      return (
        <Tooltip key={shard.id}>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" align="start" className="p-0">
            <ShardPreview shard={shard} shardType={shardType} />
          </TooltipContent>
        </Tooltip>
      )
    }

    return badge
  }

  return (
    <div className="flex flex-wrap gap-1">
      {displayItems.map(renderShard)}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="rounded-sm px-1.5 py-0 h-6">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  )
}

// ============================================================================
// Single Shard Display
// ============================================================================

interface SingleShardDisplayProps {
  shard: Shard
  shardType?: ShardType
  displayField: string
  showPreview: boolean
}

function SingleShardDisplay({
  shard,
  shardType,
  displayField,
  showPreview,
}: SingleShardDisplayProps) {
  const content = (
    <div className="flex items-center gap-2">
      <ShardIcon shard={shard} shardType={shardType} size="sm" />
      <span className="truncate">{getShardDisplayValue(shard, displayField)}</span>
    </div>
  )

  if (showPreview) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{content}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="p-0">
          <ShardPreview shard={shard} shardType={shardType} />
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

// ============================================================================
// Main Component
// ============================================================================

export const ShardPicker = React.forwardRef<HTMLButtonElement, ShardPickerProps>(
  (
    {
      value,
      onChange,
      shardTypeId,
      shardTypeIds,
      multiple = false,
      minSelection,
      maxSelection,
      statusFilter,
      customFilter,
      placeholder = "Select shard...",
      displayField = "name",
      searchFields,
      showPreview = false,
      allowCreate = false,
      onCreateNew,
      disabled = false,
      error = false,
      errorMessage,
      className,
      id,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Get all allowed shard type IDs
    const allowedShardTypeIds = React.useMemo(() => {
      if (shardTypeIds && shardTypeIds.length > 0) {
        return shardTypeIds
      }
      return [shardTypeId]
    }, [shardTypeId, shardTypeIds])

    // Convert value to array for internal handling
    const selectedIds = React.useMemo(() => {
      if (!value) return []
      return Array.isArray(value) ? value : [value]
    }, [value])

    // Fetch shards for each allowed shard type
    const { data: shardsData, isLoading: shardsLoading } = useShards({
      shardTypeId: allowedShardTypeIds[0], // Primary shard type
      search: searchQuery || undefined,
      limit: 50,
    })

    // Fetch shards via search for better results
    const { data: searchResults, isLoading: searchLoading } = useSearchShards(
      searchQuery,
      { enabled: searchQuery.length > 0 }
    )

    // Combine and deduplicate shards
    const shards = React.useMemo(() => {
      const allShards = searchQuery && searchResults
        ? searchResults
        : shardsData?.shards || []

      // Filter by allowed shard types
      return allShards.filter((shard) =>
        allowedShardTypeIds.includes(shard.shardTypeId)
      )
    }, [shardsData, searchResults, searchQuery, allowedShardTypeIds])

    const isLoading = shardsLoading || searchLoading

    // Fetch shard types for display
    const { data: shardTypesData } = useQuery({
      queryKey: ["shardTypes", "picker", allowedShardTypeIds],
      queryFn: async () => {
        const types: ShardType[] = []
        for (const typeId of allowedShardTypeIds) {
          try {
            const type = await shardTypeApi.get(typeId)
            types.push(type)
          } catch {
            // Ignore errors for individual shard types
          }
        }
        return types
      },
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    })

    // Create a map of shard type ID to shard type
    const shardTypesMap = React.useMemo(() => {
      const map = new Map<string, ShardType>()
      shardTypesData?.forEach((type) => map.set(type.id, type))
      return map
    }, [shardTypesData])

    // Get selected shards as full objects
    const selectedShards = React.useMemo(
      () => shards.filter((shard) => selectedIds.includes(shard.id)),
      [shards, selectedIds]
    )

    // Group shards by type if multiple types are allowed
    const groupedShards = React.useMemo(() => {
      if (allowedShardTypeIds.length <= 1) {
        return new Map([["", shards]])
      }

      const groups = new Map<string, Shard[]>()
      for (const shard of shards) {
        const type = shardTypesMap.get(shard.shardTypeId)
        const groupKey = type?.displayName || shard.shardTypeId
        if (!groups.has(groupKey)) {
          groups.set(groupKey, [])
        }
        groups.get(groupKey)!.push(shard)
      }
      return groups
    }, [shards, allowedShardTypeIds, shardTypesMap])

    // Handle selection
    const handleSelect = React.useCallback(
      (shardId: string) => {
        if (multiple) {
          const isSelected = selectedIds.includes(shardId)

          if (isSelected) {
            // Check min selection
            if (minSelection && selectedIds.length <= minSelection) {
              return
            }
            const newValue = selectedIds.filter((id) => id !== shardId)
            onChange(newValue.length > 0 ? newValue : null)
          } else {
            // Check max selection
            if (maxSelection && selectedIds.length >= maxSelection) {
              return
            }
            onChange([...selectedIds, shardId])
          }
        } else {
          // Single selection
          const isSelected = selectedIds.includes(shardId)
          if (isSelected) {
            onChange(null)
          } else {
            onChange(shardId)
            setOpen(false)
          }
        }
      },
      [selectedIds, onChange, multiple, minSelection, maxSelection]
    )

    // Handle remove
    const handleRemove = React.useCallback(
      (shardId: string) => {
        if (minSelection && selectedIds.length <= minSelection) {
          return
        }
        const newValue = selectedIds.filter((id) => id !== shardId)
        onChange(multiple ? (newValue.length > 0 ? newValue : null) : null)
      },
      [selectedIds, onChange, minSelection, multiple]
    )

    // Clear all
    const handleClearAll = React.useCallback(() => {
      if (minSelection) {
        onChange(multiple ? selectedIds.slice(0, minSelection) : null)
      } else {
        onChange(null)
      }
    }, [selectedIds, minSelection, onChange, multiple])

    // Handle create new
    const handleCreateNew = React.useCallback(() => {
      setOpen(false)
      onCreateNew?.()
    }, [onCreateNew])

    // Validation message
    const validationMessage = React.useMemo(() => {
      if (multiple) {
        if (minSelection && selectedIds.length < minSelection) {
          return `Select at least ${minSelection} shard${minSelection > 1 ? "s" : ""}`
        }
        if (maxSelection && selectedIds.length >= maxSelection) {
          return `Maximum ${maxSelection} shard${maxSelection > 1 ? "s" : ""} reached`
        }
      }
      return null
    }, [selectedIds.length, minSelection, maxSelection, multiple])

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
                !selectedIds.length && "text-muted-foreground"
              )}
            >
              <div className="flex flex-1 flex-wrap gap-1 items-center">
                {selectedShards.length > 0 ? (
                  multiple ? (
                    <SelectedShards
                      shards={selectedShards}
                      shardTypes={shardTypesMap}
                      displayField={displayField}
                      showPreview={showPreview}
                      onRemove={handleRemove}
                      disabled={disabled}
                    />
                  ) : (
                    <SingleShardDisplay
                      shard={selectedShards[0]}
                      shardType={shardTypesMap.get(selectedShards[0].shardTypeId)}
                      displayField={displayField}
                      showPreview={showPreview}
                    />
                  )
                ) : (
                  <span className="flex items-center gap-2">
                    <Box className="h-4 w-4 opacity-50" />
                    {placeholder}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              {/* Search input */}
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search shards..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-0 focus:ring-0"
                />
              </div>

              {/* Quick actions */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b">
                <span className="text-xs text-muted-foreground">
                  {multiple ? `${selectedIds.length} selected` : ""}
                </span>
                <div className="flex gap-1">
                  {multiple && selectedIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={handleClearAll}
                      disabled={minSelection ? selectedIds.length <= minSelection : false}
                    >
                      Clear
                    </Button>
                  )}
                  {allowCreate && onCreateNew && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1"
                      onClick={handleCreateNew}
                    >
                      <Plus className="h-3 w-3" />
                      Create new
                    </Button>
                  )}
                </div>
              </div>

              <CommandList className="max-h-64">
                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading shards...</span>
                  </div>
                )}

                {/* Empty state */}
                {!isLoading && shards.length === 0 && (
                  <CommandEmpty>
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Box className="h-8 w-8 text-muted-foreground" />
                      <p>No shards found.</p>
                      {allowCreate && onCreateNew && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={handleCreateNew}
                        >
                          <Plus className="h-4 w-4" />
                          Create new shard
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                )}

                {/* Render grouped shards */}
                {!isLoading &&
                  Array.from(groupedShards.entries()).map(([group, groupShards], groupIndex) => (
                    <React.Fragment key={group || "ungrouped"}>
                      {groupIndex > 0 && <CommandSeparator />}
                      <CommandGroup heading={group || undefined}>
                        {groupShards.map((shard) => {
                          const isSelected = selectedIds.includes(shard.id)
                          const isDisabled =
                            !isSelected && maxSelection && selectedIds.length >= maxSelection
                          const shardType = shardTypesMap.get(shard.shardTypeId)

                          const item = (
                            <CommandItem
                              key={shard.id}
                              value={shard.id}
                              onSelect={() => handleSelect(shard.id)}
                              disabled={!!isDisabled}
                              className={cn(
                                "flex items-center gap-2",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {/* Checkbox indicator for multiple */}
                              {multiple && (
                                <div
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-sm border shrink-0",
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-input"
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                              )}

                              {/* Radio indicator for single */}
                              {!multiple && (
                                <div
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                                    isSelected
                                      ? "border-primary"
                                      : "border-input"
                                  )}
                                >
                                  {isSelected && (
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                  )}
                                </div>
                              )}

                              {/* Shard icon */}
                              <ShardIcon shard={shard} shardType={shardType} size="sm" />

                              {/* Shard info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-medium">
                                    {getShardDisplayValue(shard, displayField)}
                                  </span>
                                  {shard.isPublic && (
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                                {shard.description && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {shard.description}
                                  </p>
                                )}
                              </div>

                              {/* Tags */}
                              {shard.tags && shard.tags.length > 0 && (
                                <div className="flex gap-1 shrink-0">
                                  {shard.tags.slice(0, 1).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs px-1 py-0"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {shard.tags.length > 1 && (
                                    <Badge variant="secondary" className="text-xs px-1 py-0">
                                      +{shard.tags.length - 1}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </CommandItem>
                          )

                          // Wrap with tooltip for preview
                          if (showPreview) {
                            return (
                              <Tooltip key={shard.id}>
                                <TooltipTrigger asChild>{item}</TooltipTrigger>
                                <TooltipContent side="right" className="p-0">
                                  <ShardPreview shard={shard} shardType={shardType} />
                                </TooltipContent>
                              </Tooltip>
                            )
                          }

                          return item
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

ShardPicker.displayName = "ShardPicker"

export default ShardPicker











