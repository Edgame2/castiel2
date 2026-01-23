/**
 * Reusable Empty State Component
 * Provides consistent empty states across list views and data displays
 */

'use client'

import { Inbox, Search, FileX, Database, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type EmptyStateType = 
  | 'no_data'
  | 'no_results'
  | 'no_items'
  | 'error'
  | 'loading'
  | 'custom'

export interface EmptyStateProps {
  type?: EmptyStateType
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
  className?: string
  compact?: boolean
}

/**
 * Get default icon for empty state type
 */
function getDefaultIcon(type: EmptyStateType): React.ReactNode {
  switch (type) {
    case 'no_data':
      return <Database className="h-12 w-12 text-muted-foreground" />
    case 'no_results':
      return <Search className="h-12 w-12 text-muted-foreground" />
    case 'no_items':
      return <Inbox className="h-12 w-12 text-muted-foreground" />
    case 'error':
      return <AlertCircle className="h-12 w-12 text-destructive" />
    default:
      return <FileX className="h-12 w-12 text-muted-foreground" />
  }
}

/**
 * Get default title for empty state type
 */
function getDefaultTitle(type: EmptyStateType): string {
  switch (type) {
    case 'no_data':
      return 'No Data Available'
    case 'no_results':
      return 'No Results Found'
    case 'no_items':
      return 'No Items'
    case 'error':
      return 'Unable to Load Data'
    default:
      return 'Empty'
  }
}

/**
 * Get default description for empty state type
 */
function getDefaultDescription(type: EmptyStateType): string {
  switch (type) {
    case 'no_data':
      return 'There is no data to display at this time.'
    case 'no_results':
      return 'Try adjusting your search or filters to find what you\'re looking for.'
    case 'no_items':
      return 'Get started by creating your first item.'
    case 'error':
      return 'Something went wrong while loading the data. Please try again.'
    default:
      return ''
  }
}

/**
 * Reusable Empty State Component
 */
export function EmptyState({
  type = 'no_data',
  title,
  description,
  icon,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const displayIcon = icon || getDefaultIcon(type)
  const displayTitle = title || getDefaultTitle(type)
  const displayDescription = description || getDefaultDescription(type)

  if (compact) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <div className="mb-3">{displayIcon}</div>
        <h3 className="text-sm font-medium text-foreground mb-1">{displayTitle}</h3>
        {displayDescription && (
          <p className="text-xs text-muted-foreground mb-3">{displayDescription}</p>
        )}
        {action && (
          <Button
            size="sm"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4">{displayIcon}</div>
        <CardTitle className="mb-2">{displayTitle}</CardTitle>
        {displayDescription && (
          <CardDescription className="max-w-sm">
            {displayDescription}
          </CardDescription>
        )}
        {action && (
          <Button
            className="mt-4"
            variant={action.variant || 'default'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
