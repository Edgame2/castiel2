/**
 * Chart Widgets
 * 
 * Widget-compatible chart components using pure CSS/SVG.
 * No external charting library required.
 * 
 * @example
 * ```tsx
 * import { BarChart, LineChart, PieChart } from '@/components/widgets/charts'
 * 
 * // Bar Chart
 * <BarChart
 *   data={[
 *     { label: 'Jan', value: 100 },
 *     { label: 'Feb', value: 150 },
 *   ]}
 * />
 * 
 * // Pie/Donut Chart
 * <PieChart
 *   data={[
 *     { label: 'A', value: 30 },
 *     { label: 'B', value: 70 },
 *   ]}
 *   config={{ donut: true }}
 * />
 * 
 * // Line Chart
 * <LineChart
 *   data={[
 *     { label: 'Jan', value: 100 },
 *     { label: 'Feb', value: 150 },
 *   ]}
 *   config={{ showArea: true }}
 * />
 * ```
 */

export { BarChart } from './bar-chart'
export { PieChart } from './pie-chart'
export { LineChart } from './line-chart'

// Re-export types
export * from './types'











