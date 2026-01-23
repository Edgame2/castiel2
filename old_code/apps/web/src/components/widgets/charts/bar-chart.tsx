"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import type { WidgetCompatibleProps } from "@/types/widget-compatible"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { ChartDataPoint, BarChartConfig } from "./types"
import { DEFAULT_CHART_COLORS, getChartColor } from "./types"

/**
 * BarChart - Widget-compatible bar chart component
 * 
 * Pure CSS/SVG implementation - no external charting library required.
 * 
 * @example
 * ```tsx
 * <BarChart
 *   data={[
 *     { label: 'Jan', value: 100 },
 *     { label: 'Feb', value: 150 },
 *     { label: 'Mar', value: 120 },
 *   ]}
 *   config={{
 *     showDataLabels: true,
 *     orientation: 'vertical',
 *   }}
 * />
 * ```
 */
export function BarChart({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  widgetContext,
  className,
}: WidgetCompatibleProps<ChartDataPoint[], BarChartConfig>) {
  const {
    orientation = 'vertical',
    showDataLabels = true,
    showLegend = false,
    showGrid = true,
    colors = DEFAULT_CHART_COLORS,
    borderRadius = 4,
    barGap = 4,
    valueFormatter = (v: number) => v.toLocaleString(),
    animate = true,
  } = config || {}

  // Error state
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full gap-2", className)}>
        <p className="text-destructive text-sm">Error loading chart data</p>
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
      <div className={cn("flex flex-col h-full gap-2", className)}>
        <div className="flex-1 flex items-end justify-around gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 max-w-[60px]">
              <Skeleton className="w-full" style={{ height: `${30 + Math.random() * 50}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-around">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-10" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        No data available
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)

  // Vertical bar chart
  if (orientation === 'vertical') {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        {/* Grid lines */}
        {showGrid && (
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-current" />
            ))}
          </div>
        )}
        
        {/* Bars */}
        <div className="flex-1 flex items-end justify-around gap-1 px-1 relative">
          {data.map((item, index) => {
            const height = (item.value / maxValue) * 100
            const barColor = item.color || getChartColor(index, colors)
            
            return (
              <div
                key={index}
                className="flex flex-col items-center gap-1 flex-1 max-w-[80px]"
              >
                {/* Data label */}
                {showDataLabels && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {valueFormatter(item.value)}
                  </span>
                )}
                
                {/* Bar */}
                <div
                  className={cn(
                    "w-full transition-all duration-500",
                    animate && "animate-in slide-in-from-bottom"
                  )}
                  style={{
                    height: `${height}%`,
                    backgroundColor: barColor,
                    borderRadius: `${borderRadius}px ${borderRadius}px 0 0`,
                    minHeight: '4px',
                    animationDelay: animate ? `${index * 50}ms` : undefined,
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Labels */}
        <div className="flex justify-around pt-2">
          {data.map((item, index) => (
            <span
              key={index}
              className="text-xs text-muted-foreground truncate max-w-[80px] text-center"
              title={item.label}
            >
              {item.label}
            </span>
          ))}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: item.color || getChartColor(index, colors) }}
                />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Horizontal bar chart
  return (
    <div className={cn("h-full flex flex-col gap-2 justify-center", className)}>
      {data.map((item, index) => {
        const width = (item.value / maxValue) * 100
        const barColor = item.color || getChartColor(index, colors)

        return (
          <div key={index} className="flex items-center gap-2">
            {/* Label */}
            <span
              className="text-xs text-muted-foreground w-20 truncate text-right"
              title={item.label}
            >
              {item.label}
            </span>

            {/* Bar */}
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  animate && "animate-in slide-in-from-left"
                )}
                style={{
                  width: `${width}%`,
                  backgroundColor: barColor,
                  borderRadius: `${borderRadius}px`,
                  animationDelay: animate ? `${index * 50}ms` : undefined,
                }}
              />
            </div>

            {/* Value */}
            {showDataLabels && (
              <span className="text-xs font-medium w-16">
                {valueFormatter(item.value)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}











