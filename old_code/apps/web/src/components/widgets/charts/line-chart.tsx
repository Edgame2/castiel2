"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import type { WidgetCompatibleProps } from "@/types/widget-compatible"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { ChartDataPoint, LineChartConfig } from "./types"
import { DEFAULT_CHART_COLORS, getChartColor } from "./types"

/**
 * LineChart - Widget-compatible line/area chart component
 * 
 * Pure SVG implementation - no external charting library required.
 * 
 * @example
 * ```tsx
 * <LineChart
 *   data={[
 *     { label: 'Jan', value: 100 },
 *     { label: 'Feb', value: 150 },
 *     { label: 'Mar', value: 120 },
 *   ]}
 *   config={{ curved: true, showArea: true }}
 * />
 * ```
 */
export function LineChart({
  data,
  config,
  isLoading,
  error,
  onRefresh,
  className,
}: WidgetCompatibleProps<ChartDataPoint[], LineChartConfig>) {
  const {
    curved = true,
    showArea = true,
    areaOpacity = 0.2,
    showPoints = true,
    pointRadius = 4,
    lineWidth = 2,
    showGrid = true,
    showLegend = false,
    colors = DEFAULT_CHART_COLORS,
    animate = true,
    valueFormatter = (v: number) => v.toLocaleString(),
  } = config || {}

  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)

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
      <div className={cn("flex flex-col h-full", className)}>
        <Skeleton className="flex-1 rounded" />
        <div className="flex justify-around mt-2">
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

  // Calculate dimensions
  const width = 300
  const height = 150
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  // Calculate points
  const points = data.map((item, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth
    const y = padding.top + chartHeight - ((item.value - minValue) / range) * chartHeight
    return { x, y, ...item }
  })

  // Generate path
  const generatePath = (pts: typeof points, close: boolean = false): string => {
    if (pts.length < 2) return ''

    if (curved) {
      // Catmull-Rom spline for smooth curves
      let path = `M ${pts[0].x} ${pts[0].y}`
      
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(i + 2, pts.length - 1)]
        
        // Control points
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      
      if (close) {
        path += ` L ${pts[pts.length - 1].x} ${padding.top + chartHeight} L ${pts[0].x} ${padding.top + chartHeight} Z`
      }
      
      return path
    } else {
      const pathData = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
      if (close) {
        return `${pathData} L ${pts[pts.length - 1].x} ${padding.top + chartHeight} L ${pts[0].x} ${padding.top + chartHeight} Z`
      }
      return pathData
    }
  }

  const linePath = generatePath(points)
  const areaPath = generatePath(points, true)
  const lineColor = getChartColor(0, colors)

  // Y-axis ticks
  const yTicks = 5
  const yTickValues = Array.from({ length: yTicks }, (_, i) => 
    minValue + (range * i) / (yTicks - 1)
  ).reverse()

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`} 
        className={cn(
          "flex-1 w-full",
          animate && "animate-in fade-in duration-500"
        )}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={areaOpacity} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g className="text-muted-foreground/20">
            {/* Horizontal grid lines */}
            {yTickValues.map((_, i) => {
              const y = padding.top + (chartHeight * i) / (yTicks - 1)
              return (
                <line
                  key={`h-${i}`}
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="2,2"
                />
              )
            })}
            {/* Vertical grid lines */}
            {points.map((p, i) => (
              <line
                key={`v-${i}`}
                x1={p.x}
                y1={padding.top}
                x2={p.x}
                y2={padding.top + chartHeight}
                stroke="currentColor"
                strokeDasharray="2,2"
              />
            ))}
          </g>
        )}

        {/* Y-axis labels */}
        {yTickValues.map((value, i) => {
          const y = padding.top + (chartHeight * i) / (yTicks - 1)
          return (
            <text
              key={`y-${i}`}
              x={padding.left - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[8px]"
            >
              {valueFormatter(value)}
            </text>
          )
        })}

        {/* Area fill */}
        {showArea && (
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            clipPath="url(#chartClip)"
            className={animate ? "animate-in fade-in duration-700" : ""}
          />
        )}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#chartClip)"
          className={animate ? "animate-in fade-in duration-500" : ""}
        />

        {/* Data points */}
        {showPoints && points.map((point, index) => (
          <g key={index}>
            {/* Larger invisible hit area */}
            <circle
              cx={point.x}
              cy={point.y}
              r={pointRadius * 3}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            {/* Visible point */}
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? pointRadius * 1.5 : pointRadius}
              fill={lineColor}
              stroke="white"
              strokeWidth={2}
              className="transition-all duration-200"
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => (
          <text
            key={`x-${index}`}
            x={point.x}
            y={padding.top + chartHeight + 15}
            textAnchor="middle"
            className="fill-muted-foreground text-[8px]"
          >
            {point.label}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div 
          className="absolute bg-popover border rounded-lg shadow-lg p-2 z-10 text-xs pointer-events-none"
          style={{
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium">{points[hoveredIndex].label}</div>
          <div className="text-muted-foreground">
            {valueFormatter(points[hoveredIndex].value)}
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-4 rounded"
              style={{ backgroundColor: lineColor }}
            />
            <span className="text-muted-foreground">Value</span>
          </div>
        </div>
      )}
    </div>
  )
}











