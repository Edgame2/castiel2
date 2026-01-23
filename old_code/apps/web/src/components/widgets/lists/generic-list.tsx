"use client"

import * as React from "react"
import Link from "next/link"
import { RefreshCw, Inbox, ChevronRight } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorDisplay } from "@/components/ui/error-display"
import { formatDistanceToNow, format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { GenericListProps, ListItem, GenericListConfig } from "./types"

/**
 * GenericList - Widget-compatible generic list component
 * 
 * Displays a list of items with support for avatars, badges, timestamps,
 * selection, and custom right elements.
 * 
 * @example
 * ```tsx
 * <GenericList
 *   data={items}
 *   config={{
 *     showAvatars: true,
 *     selectable: true,
 *     compact: false,
 *   }}
 *   onItemClick={(item) => console.log(item)}
 * />
 * ```
 */
export function GenericList<T extends ListItem = ListItem>({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  onItemClick,
  onSelectionChange,
  selectedIds = [],
  className,
}: GenericListProps<T>) {
  const {
    showAvatars = true,
    showTimestamps = false,
    showBadges = true,
    showDividers = false,
    compact = false,
    maxItems = 0,
    emptyMessage = "No items",
    emptyIcon: EmptyIcon = Inbox,
    selectable = false,
    multiSelect = false,
    hoverEffect = true,
  } = config || {}

  const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>(selectedIds)

  // Sync internal selection with prop
  React.useEffect(() => {
    setInternalSelectedIds(selectedIds)
  }, [selectedIds])

  // Handle selection
  const handleSelect = (item: T, event: React.MouseEvent) => {
    if (!selectable) return
    
    event.stopPropagation()
    
    let newSelection: string[]
    
    if (multiSelect) {
      if (internalSelectedIds.includes(item.id)) {
        newSelection = internalSelectedIds.filter(id => id !== item.id)
      } else {
        newSelection = [...internalSelectedIds, item.id]
      }
    } else {
      newSelection = internalSelectedIds.includes(item.id) ? [] : [item.id]
    }
    
    setInternalSelectedIds(newSelection)
    
    const selectedItems = data?.filter(d => newSelection.includes(d.id)) || []
    onSelectionChange?.(selectedItems)
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    return formatDistanceToNow(date, { addSuffix: true })
  }

  // Get badge variant
  const getBadgeVariant = (variant?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (variant === 'destructive') return 'destructive'
    if (variant === 'outline') return 'outline'
    if (variant === 'secondary') return 'secondary'
    return 'default'
  }

  // Limit items
  const displayData = maxItems > 0 ? data?.slice(0, maxItems) : data

  // Error state
  // Show error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={onRefresh}
        title="Failed to Load Items"
        variant="compact"
        className={className}
      />
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {selectable && <Skeleton className="h-4 w-4 rounded" />}
            {showAvatars && <Skeleton className="h-10 w-10 rounded-full" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (!displayData || displayData.length === 0) {
    return (
      <EmptyState
        type="no_items"
        title={emptyMessage}
        icon={<EmptyIcon />}
        compact={compact}
        className={className}
      />
    )
  }

  // Render list item
  const renderItem = (item: T, index: number) => {
    const isSelected = internalSelectedIds.includes(item.id)
    const IconComponent = item.icon
    
    const content = (
      <div
        className={cn(
          "flex items-center gap-3",
          compact ? "py-2" : "py-3",
          hoverEffect && "hover:bg-muted/50 rounded-lg transition-colors",
          onItemClick && "cursor-pointer",
          isSelected && "bg-muted",
          "px-2"
        )}
        onClick={() => onItemClick?.(item)}
      >
        {/* Selection checkbox */}
        {selectable && (
          <Checkbox
            checked={isSelected}
            onClick={(e) => handleSelect(item, e as unknown as React.MouseEvent)}
            className="flex-shrink-0"
          />
        )}

        {/* Avatar/Icon */}
        {showAvatars && (
          <>
            {item.avatar ? (
              <Avatar className={cn(compact ? "h-8 w-8" : "h-10 w-10")}>
                <AvatarImage src={item.avatar} alt={item.title} />
                <AvatarFallback className="text-xs">
                  {item.title.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : IconComponent ? (
              <div className={cn(
                "flex items-center justify-center rounded-full",
                compact ? "h-8 w-8" : "h-10 w-10",
                item.iconColor || "bg-muted"
              )}>
                <IconComponent className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
              </div>
            ) : null}
          </>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "font-medium truncate",
              compact ? "text-sm" : "text-base"
            )}>
              {item.title}
            </p>
            {showBadges && item.badge && (
              <Badge variant={getBadgeVariant(item.badgeVariant)} className="flex-shrink-0">
                {item.badge}
              </Badge>
            )}
          </div>
          
          {item.subtitle && (
            <p className={cn(
              "text-muted-foreground truncate",
              compact ? "text-xs" : "text-sm"
            )}>
              {item.subtitle}
            </p>
          )}
          
          {!compact && item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {item.description}
            </p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showTimestamps && item.timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(item.timestamp)}
            </span>
          )}
          
          {item.rightElement}
          
          {item.href && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    )

    // Wrap with Link if href is provided
    if (item.href) {
      return (
        <React.Fragment key={item.id}>
          <Link href={item.href} className="block">
            {content}
          </Link>
          {showDividers && index < displayData.length - 1 && (
            <Separator className="my-1" />
          )}
        </React.Fragment>
      )
    }

    return (
      <React.Fragment key={item.id}>
        {content}
        {showDividers && index < displayData.length - 1 && (
          <Separator className="my-1" />
        )}
      </React.Fragment>
    )
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-1">
        {displayData.map((item, index) => renderItem(item, index))}
      </div>
    </ScrollArea>
  )
}











