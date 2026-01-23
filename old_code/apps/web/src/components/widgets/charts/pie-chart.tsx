"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import type { WidgetCompatibleProps } from "@/types/widget-compatible"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { ChartDataPoint, PieChartConfig } from "./types"
import { DEFAULT_CHART_COLORS, getChartColor } from "./types"

/**
 * PieChart - Widget-compatible pie/donut chart component
 * 
 * Pure SVG implementation - no external charting library required.
 * 
 * @example
 * ```tsx
 * <PieChart
 *   data={[
 *     { label: 'Category A', value: 30 },
 *     { label: 'Category B', value: 50 },
 *     { label: 'Category C', value: 20 },
 *   ]}
 *   config={{ donut: true, showCenterLabel: true }}
 * />
 * ```
 */
export function PieChart({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  className,
}: WidgetCompatibleProps<ChartDataPoint[], PieChartConfig>) {
  const {
    donut = false,
    innerRadius = 0.6,
    showLegend = true,
    showCenterLabel = true,
    centerLabel,
    showPercentages = true,
    colors = DEFAULT_CHART_COLORS,
    startAngle = -90,
    animate = true,
    valueFormatter = (v: number) => v.toLocaleString(),
  } = config || {}

  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)

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
      <div className={cn("flex items-center justify-center h-full gap-4", className)}>
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
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

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = 80
  const center = 100
  const actualInnerRadius = donut ? radius * innerRadius : 0
  const strokeWidth = donut ? radius - actualInnerRadius : 0

  // Calculate segments
  let currentAngle = startAngle
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0
    const angle = percentage * 360
    const start = currentAngle
    const end = currentAngle + angle
    currentAngle = end

    // Convert to radians
    const startRad = (start * Math.PI) / 180
    const endRad = (end * Math.PI) / 180

    // Calculate path points
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)

    // Inner points for donut
    const ix1 = center + actualInnerRadius * Math.cos(startRad)
    const iy1 = center + actualInnerRadius * Math.sin(startRad)
    const ix2 = center + actualInnerRadius * Math.cos(endRad)
    const iy2 = center + actualInnerRadius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    // Path for pie (full wedge) or donut (arc)
    let path: string
    if (donut) {
      path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
    } else {
      path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
    }

    // Calculate label position (middle of segment)
    const midAngle = ((start + end) / 2) * Math.PI / 180
    const labelRadius = donut ? (radius + actualInnerRadius) / 2 : radius * 0.65
    const labelX = center + labelRadius * Math.cos(midAngle)
    const labelY = center + labelRadius * Math.sin(midAngle)

    return {
      path,
      color: item.color || getChartColor(index, colors),
      label: item.label,
      value: item.value,
      percentage,
      labelX,
      labelY,
    }
  })

  return (
    <div className={cn("h-full flex items-center justify-center gap-4", className)}>
      {/* SVG Chart */}
      <div className="relative">
        <svg 
          viewBox="0 0 200 200" 
          className={cn(
            "h-full max-h-[180px] w-auto",
            animate && "animate-in fade-in zoom-in-75 duration-500"
          )}
        >
          {/* Segments */}
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={donut ? 'none' : segment.color}
              stroke={donut ? segment.color : 'white'}
              strokeWidth={donut ? strokeWidth : 1}
              className={cn(
                "transition-all duration-200 cursor-pointer",
                hoveredIndex === index && "opacity-80"
              )}
              style={{
                transform: hoveredIndex === index ? `scale(1.02)` : undefined,
                transformOrigin: 'center',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {/* Center label for donut */}
          {donut && showCenterLabel && (
            <g className="pointer-events-none">
              <text
                x={center}
                y={center - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-current text-2xl font-bold"
              >
                {centerLabel || valueFormatter(total)}
              </text>
              <text
                x={center}
                y={center + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
              >
                Total
              </text>
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-popover border rounded-lg shadow-lg p-2 z-10 text-xs whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded"
                style={{ backgroundColor: segments[hoveredIndex].color }}
              />
              <span className="font-medium">{segments[hoveredIndex].label}</span>
            </div>
            <div className="text-muted-foreground mt-1">
              {valueFormatter(segments[hoveredIndex].value)} ({(segments[hoveredIndex].percentage * 100).toFixed(1)}%)
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="space-y-1 min-w-[100px]">
          {data.map((item, index) => (
            <div 
              key={index} 
              className={cn(
                "flex items-center gap-2 text-xs cursor-pointer transition-opacity",
                hoveredIndex !== null && hoveredIndex !== index && "opacity-50"
              )}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="h-3 w-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color || getChartColor(index, colors) }}
              />
              <span className="text-muted-foreground truncate flex-1" title={item.label}>
                {item.label}
              </span>
              <span className="font-medium">
                {showPercentages 
                  ? `${((item.value / total) * 100).toFixed(0)}%`
                  : valueFormatter(item.value)
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}











