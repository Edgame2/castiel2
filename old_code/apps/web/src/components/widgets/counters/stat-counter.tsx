"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"
import type { WidgetCompatibleProps } from "@/types/widget-compatible"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

/**
 * Counter data structure
 */
export interface CounterData {
  /** Current value */
  value: number
  /** Previous value (for trend calculation) */
  previousValue?: number
  /** Label to display */
  label?: string
  /** Description/subtitle */
  description?: string
}

/**
 * Counter configuration
 */
export interface CounterConfig {
  /** Value format */
  format?: 'number' | 'currency' | 'percentage' | 'compact'
  /** Currency code (for currency format) */
  currency?: string
  /** Decimal places */
  decimals?: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show trend indicator */
  showTrend?: boolean
  /** Color for positive trend */
  positiveColor?: string
  /** Color for negative trend */
  negativeColor?: string
  /** Invert trend colors (lower is better) */
  invertTrend?: boolean
  /** Icon to display */
  icon?: React.ComponentType<{ className?: string }>
  /** Icon color */
  iconColor?: string
  /** Prefix text */
  prefix?: string
  /** Suffix text */
  suffix?: string
  /** Animate value on change */
  animate?: boolean
}

/**
 * StatCounter - Widget-compatible counter/statistic display
 * 
 * @example
 * ```tsx
 * <StatCounter
 *   data={{ value: 1234, previousValue: 1100, label: "Total Users" }}
 *   config={{ format: 'number', showTrend: true }}
 * />
 * ```
 */
export function StatCounter({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  className,
}: WidgetCompatibleProps<CounterData, CounterConfig>) {
  const {
    format = 'number',
    currency = 'USD',
    decimals = 0,
    size = 'md',
    showTrend = true,
    positiveColor = 'text-green-600 dark:text-green-400',
    negativeColor = 'text-red-600 dark:text-red-400',
    invertTrend = false,
    icon: Icon,
    iconColor,
    prefix,
    suffix,
  } = config || {}

  const { value = 0, previousValue, label, description } = data || {}

  // Calculate trend
  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  let trendPercent = 0
  if (previousValue !== undefined && previousValue !== 0) {
    trendPercent = ((value - previousValue) / Math.abs(previousValue)) * 100
    trend = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral'
  }

  // Determine trend colors (can be inverted for metrics where lower is better)
  const isPositiveTrend = invertTrend ? trend === 'down' : trend === 'up'
  const isNegativeTrend = invertTrend ? trend === 'up' : trend === 'down'

  // Format the value
  const formatValue = (val: number): string => {
    if (prefix || suffix) {
      const num = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(val)
      return `${prefix || ''}${num}${suffix || ''}`
    }

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
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val)
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val)
    }
  }

  // Size classes
  const sizeClasses = {
    sm: {
      value: 'text-2xl',
      label: 'text-xs',
      icon: 'h-8 w-8',
      trend: 'text-xs',
    },
    md: {
      value: 'text-3xl',
      label: 'text-sm',
      icon: 'h-10 w-10',
      trend: 'text-sm',
    },
    lg: {
      value: 'text-4xl',
      label: 'text-base',
      icon: 'h-12 w-12',
      trend: 'text-sm',
    },
    xl: {
      value: 'text-5xl',
      label: 'text-lg',
      icon: 'h-14 w-14',
      trend: 'text-base',
    },
  }

  const sizes = sizeClasses[size]

  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
        <p className="text-destructive text-sm">Error loading data</p>
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
      <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
        {Icon && <Skeleton className={cn("rounded-full", sizes.icon)} />}
        <Skeleton className={cn("h-8 w-24", size === 'sm' && 'h-6 w-16')} />
        {label && <Skeleton className="h-4 w-20" />}
        {showTrend && previousValue !== undefined && <Skeleton className="h-4 w-16" />}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
      {/* Icon */}
      {Icon && (
        <div className={cn("rounded-full bg-muted p-2", iconColor)}>
          <Icon className={sizes.icon} />
        </div>
      )}

      {/* Value */}
      <div className={cn("font-bold tracking-tight", sizes.value)}>
        {formatValue(value)}
      </div>

      {/* Label */}
      {label && (
        <div className={cn("text-muted-foreground", sizes.label)}>{label}</div>
      )}

      {/* Description */}
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}

      {/* Trend indicator */}
      {showTrend && previousValue !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1",
            sizes.trend,
            isPositiveTrend && positiveColor,
            isNegativeTrend && negativeColor,
            trend === 'neutral' && "text-muted-foreground"
          )}
        >
          {trend === 'up' && <TrendingUp className="h-4 w-4" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4" />}
          {trend === 'neutral' && <Minus className="h-4 w-4" />}
          <span>{Math.abs(trendPercent).toFixed(1)}%</span>
          <span className="text-muted-foreground">vs previous</span>
        </div>
      )}
    </div>
  )
}











