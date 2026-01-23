"use client"

import * as React from "react"
import Link from "next/link"
import { 
  FileText, 
  Edit, 
  Trash2, 
  Plus, 
  User, 
  MessageSquare, 
  Share2, 
  UserPlus, 
  CheckCircle2,
  Archive,
  RefreshCw,
  ChevronDown,
  Activity,
} from "lucide-react"
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ActivityFeedProps, ActivityItem, ActivityFeedConfig } from "./types"

// Default icons for actions
const DEFAULT_ACTION_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: FileText,
  comment: MessageSquare,
  share: Share2,
  assign: UserPlus,
  complete: CheckCircle2,
  archive: Archive,
}

// Default colors for actions
const DEFAULT_ACTION_COLORS: Record<string, { text: string; bg: string }> = {
  create: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  update: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  delete: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  view: { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900/30' },
  comment: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  share: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  assign: { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  complete: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  archive: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
}

// Default labels for actions
const DEFAULT_ACTION_LABELS: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  view: 'viewed',
  comment: 'commented on',
  share: 'shared',
  assign: 'assigned',
  complete: 'completed',
  archive: 'archived',
}

/**
 * ActivityFeed - Widget-compatible activity feed component
 * 
 * @example
 * ```tsx
 * <ActivityFeed
 *   data={activities}
 *   config={{
 *     showAvatars: true,
 *     showTimestamps: true,
 *     maxItems: 10,
 *   }}
 *   onItemClick={(item) => console.log(item)}
 * />
 * ```
 */
export function ActivityFeed({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  onItemClick,
  onLoadMore,
  hasMore,
  className,
}: ActivityFeedProps) {
  const {
    showAvatars = true,
    showTimestamps = true,
    timestampFormat = 'relative',
    showIcons = true,
    maxItems = 0,
    groupByDate = false,
    showLoadMore = true,
    actionIcons: customIcons,
    actionLabels: customLabels,
    actionColors: customColors,
  } = config || {}

  // Merge custom with defaults
  const actionIcons = { ...DEFAULT_ACTION_ICONS, ...customIcons }
  const actionLabels = { ...DEFAULT_ACTION_LABELS, ...customLabels }
  const actionColors = { ...DEFAULT_ACTION_COLORS, ...customColors }

  // Format timestamp
  const formatTimestamp = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    
    switch (timestampFormat) {
      case 'absolute':
        return format(date, 'MMM d, yyyy')
      case 'datetime':
        return format(date, 'MMM d, yyyy h:mm a')
      case 'relative':
      default:
        return formatDistanceToNow(date, { addSuffix: true })
    }
  }

  // Get date group label
  const getDateGroupLabel = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'MMMM d, yyyy')
  }

  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    if (!groupByDate || !data?.length) return null
    
    const groups: Record<string, ActivityItem[]> = {}
    
    data.forEach(activity => {
      const groupLabel = getDateGroupLabel(activity.timestamp)
      if (!groups[groupLabel]) {
        groups[groupLabel] = []
      }
      groups[groupLabel].push(activity)
    })
    
    return groups
  }, [data, groupByDate])

  // Limit items
  const displayData = maxItems > 0 ? data?.slice(0, maxItems) : data

  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
        <p className="text-destructive text-sm">Error loading activity</p>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            {showAvatars && <Skeleton className="h-8 w-8 rounded-full" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            {showIcons && <Skeleton className="h-6 w-6 rounded" />}
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (!displayData || displayData.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-2 text-muted-foreground", className)}>
        <Activity className="h-8 w-8" />
        <p className="text-sm">No recent activity</p>
      </div>
    )
  }

  // Render activity item
  const renderActivityItem = (activity: ActivityItem) => {
    const ActionIcon = actionIcons[activity.action as keyof typeof actionIcons] || FileText
    const colors = actionColors[activity.action as keyof typeof actionColors] || { text: 'text-slate-500', bg: 'bg-slate-100' }
    const actionLabel = actionLabels[activity.action as keyof typeof actionLabels] || 'interacted with'

    return (
      <div 
        key={activity.id} 
        className={cn(
          "flex items-start gap-3 p-2 rounded-lg transition-colors",
          onItemClick && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => onItemClick?.(activity)}
      >
        {/* Avatar */}
        {showAvatars && (
          <Avatar className="h-8 w-8">
            {activity.userAvatar && <AvatarImage src={activity.userAvatar} alt={activity.userName} />}
            <AvatarFallback className="text-xs">
              {activity.userName?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{activity.userName || 'Someone'}</span>
            {' '}
            <span className="text-muted-foreground">{actionLabel}</span>
            {' '}
            {activity.entityLink && activity.entityId ? (
              <Link
                href={activity.entityLink}
                className="font-medium text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {activity.entityName || activity.entityType?.replace('c_', '') || 'an item'}
              </Link>
            ) : (
              <span className="font-medium">
                {activity.entityName || 'an item'}
              </span>
            )}
          </p>
          
          {activity.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {activity.description}
            </p>
          )}
          
          {showTimestamps && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatTimestamp(activity.timestamp)}
            </p>
          )}
        </div>

        {/* Action icon */}
        {showIcons && (
          <div className={cn(
            "h-6 w-6 rounded flex items-center justify-center flex-shrink-0",
            colors.bg,
            colors.text
          )}>
            <ActionIcon className="h-3 w-3" />
          </div>
        )}
      </div>
    )
  }

  // Render grouped or flat list
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-1">
        {groupByDate && groupedActivities ? (
          Object.entries(groupedActivities).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div className="sticky top-0 bg-background/95 backdrop-blur py-2 px-2 text-xs font-medium text-muted-foreground">
                {groupLabel}
              </div>
              {items.map(renderActivityItem)}
            </div>
          ))
        ) : (
          displayData.map(renderActivityItem)
        )}

        {/* Load more button */}
        {showLoadMore && hasMore && onLoadMore && (
          <div className="pt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Load more
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}











