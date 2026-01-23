"use client"

import { useMemo } from "react"
import type { Widget } from "@/types/dashboard"
import { cn } from "@/lib/utils"

interface ChartWidgetProps {
  widget: Widget
  data: unknown
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'donut'
  xAxis?: string
  yAxis?: string
  colors?: string[]
}

interface ChartDataItem {
  label: string
  value: number
  color?: string
}

const DEFAULT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
]

export function ChartWidget({ widget, data }: ChartWidgetProps) {
  const config = widget.config as unknown as unknown as ChartConfig
  const chartType = config?.type || 'bar'
  const colors = config?.colors || DEFAULT_COLORS

  const chartData: ChartDataItem[] = useMemo(() => {
    if (!data) return []
    
    if (Array.isArray(data)) {
      return data.map((item, index) => ({
        label: item.label || item.name || item.type || `Item ${index + 1}`,
        value: item.value || item.count || 0,
        color: item.color || colors[index % colors.length],
      }))
    }

    return []
  }, [data, colors])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  switch (chartType) {
    case 'bar':
      return <BarChart data={chartData} />
    case 'pie':
    case 'donut':
      return <PieChart data={chartData} isDonut={chartType === 'donut'} />
    case 'line':
      return <LineChart data={chartData} />
    default:
      return <BarChart data={chartData} />
  }
}

// Simple Bar Chart (CSS-based)
function BarChart({ data }: { data: ChartDataItem[] }) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className="h-full flex flex-col justify-end gap-2">
      <div className="flex-1 flex items-end justify-around gap-2">
        {data.map((item, index) => {
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div
              key={index}
              className="flex flex-col items-center gap-1 flex-1 max-w-[60px]"
            >
              <span className="text-xs font-medium">{item.value}</span>
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${height}%`,
                  backgroundColor: item.color,
                  minHeight: '4px',
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-around">
        {data.map((item, index) => (
          <span
            key={index}
            className="text-xs text-muted-foreground truncate max-w-[60px] text-center"
            title={item.label}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Simple Pie/Donut Chart (SVG-based)
function PieChart({ data, isDonut }: { data: ChartDataItem[]; isDonut: boolean }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = 80
  const center = 100
  const strokeWidth = isDonut ? 30 : radius

  // Calculate pie segments
  let currentAngle = -90 // Start from top

  const segments = data.map((item) => {
    const percentage = total > 0 ? item.value / total : 0
    const angle = percentage * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    // Calculate path
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    const path = isDonut
      ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
      : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return {
      path,
      color: item.color,
      label: item.label,
      percentage,
    }
  })

  return (
    <div className="h-full flex items-center justify-center gap-4">
      <svg viewBox="0 0 200 200" className="h-full max-h-[180px] max-w-[180px]">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill={isDonut ? 'none' : segment.color}
            stroke={isDonut ? segment.color : 'white'}
            strokeWidth={isDonut ? strokeWidth : 1}
            className="transition-all duration-300 hover:opacity-80"
          />
        ))}
        {isDonut && (
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-2xl font-bold"
          >
            {total}
          </text>
        )}
      </svg>
      <div className="space-y-1">
        {data.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="h-3 w-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground truncate max-w-[80px]">
              {item.label}
            </span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple Line Chart (SVG-based)
function LineChart({ data }: { data: ChartDataItem[] }) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  
  const width = 300
  const height = 150
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Generate path
  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((item.value - minValue) / range) * chartHeight
    return `${x},${y}`
  })

  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`

  return (
    <div className="h-full flex flex-col">
      <svg viewBox={`0 0 ${width} ${height}`} className="flex-1">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => {
          const y = padding + (chartHeight * (100 - percent)) / 100
          return (
            <line
              key={percent}
              x1={padding}
              y1={y}
              x2={padding + chartWidth}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
          )
        })}
        
        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#lineGradient)"
          opacity={0.3}
        />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Points */}
        {data.map((item, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth
          const y = padding + chartHeight - ((item.value - minValue) / range) * chartHeight
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={4}
              fill="#6366f1"
              className="transition-all hover:r-6"
            />
          )
        })}

        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between px-2 text-xs text-muted-foreground">
        {data.map((item, index) => (
          <span key={index} className="truncate max-w-[50px]" title={item.label}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}











