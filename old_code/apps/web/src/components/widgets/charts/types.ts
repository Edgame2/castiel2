/**
 * Chart Widget Types
 * 
 * Type definitions for widget-compatible chart components.
 * @see docs/guides/component-standards.md
 */

import type { WidgetCompatibleProps } from '@/types/widget-compatible'

/**
 * Chart data point
 */
export interface ChartDataPoint {
  /** Label for the data point */
  label: string
  /** Primary value */
  value: number
  /** Secondary value (for multi-series charts) */
  value2?: number
  /** Color override */
  color?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Chart series (for multi-series charts)
 */
export interface ChartSeries {
  /** Series identifier */
  id: string
  /** Series label */
  label: string
  /** Data points */
  data: ChartDataPoint[]
  /** Series color */
  color?: string
}

/**
 * Base chart configuration
 */
export interface BaseChartConfig {
  /** Show legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** Show tooltips */
  showTooltips?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Color palette */
  colors?: string[]
  /** Animation enabled */
  animate?: boolean
  /** Responsive sizing */
  responsive?: boolean
  /** Value formatter */
  valueFormatter?: (value: number) => string
  /** Label formatter */
  labelFormatter?: (label: string) => string
}

/**
 * Bar chart configuration
 */
export interface BarChartConfig extends BaseChartConfig {
  /** Bar orientation */
  orientation?: 'vertical' | 'horizontal'
  /** Stacked bars */
  stacked?: boolean
  /** Show data labels */
  showDataLabels?: boolean
  /** Bar border radius */
  borderRadius?: number
  /** Bar gap */
  barGap?: number
  /** Category gap */
  categoryGap?: number
}

/**
 * Line chart configuration
 */
export interface LineChartConfig extends BaseChartConfig {
  /** Curved lines */
  curved?: boolean
  /** Show area fill */
  showArea?: boolean
  /** Area opacity */
  areaOpacity?: number
  /** Show data points */
  showPoints?: boolean
  /** Point radius */
  pointRadius?: number
  /** Line width */
  lineWidth?: number
}

/**
 * Pie/Donut chart configuration
 */
export interface PieChartConfig extends BaseChartConfig {
  /** Donut chart (hollow center) */
  donut?: boolean
  /** Donut inner radius (0-1) */
  innerRadius?: number
  /** Show center label (for donut) */
  showCenterLabel?: boolean
  /** Center label */
  centerLabel?: string
  /** Show percentages */
  showPercentages?: boolean
  /** Start angle (degrees) */
  startAngle?: number
  /** Pad angle between segments */
  padAngle?: number
}

/**
 * Gauge chart configuration
 */
export interface GaugeChartConfig extends BaseChartConfig {
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Threshold ranges with colors */
  thresholds?: Array<{
    value: number
    color: string
    label?: string
  }>
  /** Show percentage */
  showPercentage?: boolean
  /** Gauge arc width */
  arcWidth?: number
}

/**
 * Chart type union
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'gauge'

/**
 * Chart configuration union
 */
export type ChartConfig = 
  | ({ type: 'bar' } & BarChartConfig)
  | ({ type: 'line' } & LineChartConfig)
  | ({ type: 'area' } & LineChartConfig)
  | ({ type: 'pie' } & PieChartConfig)
  | ({ type: 'donut' } & PieChartConfig)
  | ({ type: 'gauge' } & GaugeChartConfig)

/**
 * Generic chart props
 */
export interface ChartWidgetProps<TData = ChartDataPoint[]> 
  extends WidgetCompatibleProps<TData, ChartConfig> {
  /** Chart height */
  height?: number | string
  /** Chart width */
  width?: number | string
  /** Click handler */
  onClick?: (point: ChartDataPoint) => void
}

/**
 * Default color palette
 */
export const DEFAULT_CHART_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#f97316', // orange
  '#06b6d4', // cyan
]

/**
 * Get color from palette by index
 */
export function getChartColor(index: number, colors: string[] = DEFAULT_CHART_COLORS): string {
  return colors[index % colors.length]
}











