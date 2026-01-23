"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus, RefreshCw, MoreHorizontal } from "lucide-react"
import type { WidgetCompatibleProps } from "@/types/widget-compatible"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Stat card data structure
 */
export interface StatCardData {
  /** Main value to display */
  value: number | string
  /** Previous value for trend calculation */
  previousValue?: number
  /** Change amount (absolute) */
  change?: number
  /** Change percentage (if not calculating from previousValue) */
  changePercent?: number
}

/**
 * Stat card configuration
 */
export interface StatCardConfig {
  /** Card title */
  title: string
  /** Card description */
  description?: string
  /** Value format */
  format?: 'number' | 'currency' | 'percentage' | 'compact' | 'string'
  /** Currency code */
  currency?: string
  /** Decimal places */
  decimals?: number
  /** Icon to display */
  icon?: React.ComponentType<{ className?: string }>
  /** Icon color class */
  iconColorClass?: string
  /** Icon background color class */
  iconBgClass?: string
  /** Show trend indicator */
  showTrend?: boolean
  /** Invert trend colors (lower is better) */
  invertTrend?: boolean
  /** Trend label */
  trendLabel?: string
  /** Actions dropdown items */
  actions?: Array<{
    label: string
    onClick: () => void
    icon?: React.ComponentType<{ className?: string }>
  }>
}

/**
 * StatCard - Widget-compatible stat card with trend
 * 
 * @example
 * ```tsx
 * <StatCard
 *   data={{ value: 1234, previousValue: 1100 }}
 *   config={{
 *     title: "Total Users",
 *     format: 'compact',
 *     icon: Users,
 *     showTrend: true,
 *   }}
 * />
 * ```
 */
export function StatCard({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  className,
}: WidgetCompatibleProps<StatCardData, StatCardConfig>) {
  const {
    title = 'Stat',
    description,
    format = 'number',
    currency = 'USD',
    decimals = 0,
    icon: Icon,
    iconColorClass = 'text-primary',
    iconBgClass = 'bg-primary/10',
    showTrend = true,
    invertTrend = false,
    trendLabel = 'from last period',
    actions,
  } = config || {}

  const { value = 0, previousValue, change, changePercent } = data || {}

  // Calculate trend
  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  let trendPercent = changePercent ?? 0

  if (changePercent !== undefined) {
    trend = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral'
  } else if (typeof value === 'number' && previousValue !== undefined && previousValue !== 0) {
    trendPercent = ((value - previousValue) / Math.abs(previousValue)) * 100
    trend = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral'
  } else if (change !== undefined) {
    trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  }

  // Determine trend colors
  const isPositiveTrend = invertTrend ? trend === 'down' : trend === 'up'
  const isNegativeTrend = invertTrend ? trend === 'up' : trend === 'down'

  // Format value
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val)
      case 'percentage':
        return `${val.toFixed(decimals)}%`
      case 'compact':
        return new Intl.NumberFormat('en-US', {
          notation: 'compact',
          compactDisplay: 'short',
        }).format(val)
      case 'string':
        return String(val)
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val)
    }
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-12">
            <p className="text-destructive text-sm">Error loading data</p>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} className="ml-2">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && (
            <div className={cn("rounded-full p-2", iconBgClass)}>
              <Skeleton className="h-4 w-4" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
          {description && <Skeleton className="h-4 w-32 mt-1" />}
          {showTrend && <Skeleton className="h-4 w-20 mt-2" />}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn("rounded-full p-2", iconBgClass)}>
              <Icon className={cn("h-4 w-4", iconColorClass)} />
            </div>
          )}
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Main value */}
        <div className="text-2xl font-bold">{formatValue(value)}</div>

        {/* Trend indicator */}
        {showTrend && (previousValue !== undefined || changePercent !== undefined || change !== undefined) && (
          <div className="flex items-center gap-1 mt-1">
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs",
                isPositiveTrend && "text-green-600 dark:text-green-400",
                isNegativeTrend && "text-red-600 dark:text-red-400",
                trend === 'neutral' && "text-muted-foreground"
              )}
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
              <span>
                {trend !== 'neutral' && (trend === 'up' ? '+' : '')}
                {Math.abs(trendPercent).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}











