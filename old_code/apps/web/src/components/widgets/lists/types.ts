/**
 * List Widget Types
 * 
 * Type definitions for list-based widget components.
 * @see docs/guides/component-standards.md
 */

import type { WidgetCompatibleProps } from '@/types/widget-compatible'
import type { LucideIcon } from 'lucide-react'

/**
 * Activity item for activity feed
 */
export interface ActivityItem {
  /** Unique identifier */
  id: string
  /** Action type */
  action: 'create' | 'update' | 'delete' | 'view' | 'comment' | 'share' | 'assign' | 'complete' | 'archive' | string
  /** Related entity ID */
  entityId?: string
  /** Related entity type */
  entityType?: string
  /** Related entity name */
  entityName?: string
  /** Link to entity */
  entityLink?: string
  /** User who performed the action */
  userId?: string
  /** User display name */
  userName?: string
  /** User avatar URL */
  userAvatar?: string
  /** Timestamp of the action */
  timestamp: string | Date
  /** Additional description */
  description?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Activity feed configuration
 */
export interface ActivityFeedConfig {
  /** Show user avatars */
  showAvatars?: boolean
  /** Show timestamps */
  showTimestamps?: boolean
  /** Timestamp format */
  timestampFormat?: 'relative' | 'absolute' | 'datetime'
  /** Show action icons */
  showIcons?: boolean
  /** Max items to display */
  maxItems?: number
  /** Group by date */
  groupByDate?: boolean
  /** Show "load more" button */
  showLoadMore?: boolean
  /** Custom action icons */
  actionIcons?: Record<string, LucideIcon>
  /** Custom action labels */
  actionLabels?: Record<string, string>
  /** Custom action colors */
  actionColors?: Record<string, { text: string; bg: string }>
}

/**
 * List item for generic lists
 */
export interface ListItem {
  /** Unique identifier */
  id: string
  /** Primary text */
  title: string
  /** Secondary text */
  subtitle?: string
  /** Description */
  description?: string
  /** Icon */
  icon?: LucideIcon
  /** Icon color class */
  iconColor?: string
  /** Avatar URL */
  avatar?: string
  /** Link URL */
  href?: string
  /** Badge text */
  badge?: string
  /** Badge variant */
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  /** Status */
  status?: 'active' | 'inactive' | 'pending' | 'error' | string
  /** Timestamp */
  timestamp?: string | Date
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Custom right element */
  rightElement?: React.ReactNode
}

/**
 * Generic list configuration
 */
export interface GenericListConfig {
  /** Show avatars/icons */
  showAvatars?: boolean
  /** Show timestamps */
  showTimestamps?: boolean
  /** Show badges */
  showBadges?: boolean
  /** Show dividers between items */
  showDividers?: boolean
  /** Compact mode */
  compact?: boolean
  /** Max items to display (0 = all) */
  maxItems?: number
  /** Empty state message */
  emptyMessage?: string
  /** Empty state icon */
  emptyIcon?: LucideIcon
  /** Enable item selection */
  selectable?: boolean
  /** Multi-select mode */
  multiSelect?: boolean
  /** Hover effect */
  hoverEffect?: boolean
}

/**
 * Activity feed props
 */
export interface ActivityFeedProps 
  extends WidgetCompatibleProps<ActivityItem[], ActivityFeedConfig> {
  /** Item click handler */
  onItemClick?: (item: ActivityItem) => void
  /** Load more handler */
  onLoadMore?: () => void
  /** Has more items to load */
  hasMore?: boolean
}

/**
 * Generic list props
 */
export interface GenericListProps<T extends ListItem = ListItem>
  extends WidgetCompatibleProps<T[], GenericListConfig> {
  /** Item click handler */
  onItemClick?: (item: T) => void
  /** Item selection change handler */
  onSelectionChange?: (items: T[]) => void
  /** Selected item IDs */
  selectedIds?: string[]
}











