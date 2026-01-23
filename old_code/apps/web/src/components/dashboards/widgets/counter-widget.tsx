"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { Widget } from "@/types/dashboard"
import { cn } from "@/lib/utils"

interface CounterWidgetProps {
  widget: Widget
  data: unknown
}

interface CounterData {
  value: number
  previousValue?: number
  label?: string
  format?: 'number' | 'currency' | 'percentage'
  currency?: string
  decimals?: number
}

export function CounterWidget({ widget, data }: CounterWidgetProps) {
  const counterData = data as CounterData | undefined
  const config = widget.config as Partial<CounterData>

  const value = counterData?.value ?? 0
  const previousValue = counterData?.previousValue
  const label = counterData?.label || config?.label
  const format = counterData?.format || config?.format || 'number'
  const currency = counterData?.currency || config?.currency || 'USD'
  const decimals = counterData?.decimals ?? config?.decimals ?? 0

  // Calculate trend
  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  let trendValue = 0
  if (previousValue !== undefined && previousValue !== 0) {
    trendValue = ((value - previousValue) / previousValue) * 100
    trend = trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral'
  }

  // Format value
  const formatValue = (val: number): string => {
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
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(val)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <div className="text-4xl font-bold tracking-tight">
        {formatValue(value)}
      </div>
      {label && (
        <div className="text-sm text-muted-foreground">{label}</div>
      )}
      {previousValue !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-sm",
            trend === 'up' && "text-green-600",
            trend === 'down' && "text-red-600",
            trend === 'neutral' && "text-muted-foreground"
          )}
        >
          {trend === 'up' && <TrendingUp className="h-4 w-4" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4" />}
          {trend === 'neutral' && <Minus className="h-4 w-4" />}
          <span>{Math.abs(trendValue).toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}











