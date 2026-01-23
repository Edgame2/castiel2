/**
 * Counter/Statistics Widgets
 * 
 * Widget-compatible components for displaying numerical values and trends.
 * 
 * @example
 * ```tsx
 * // Simple counter
 * import { StatCounter } from '@/components/widgets/counters'
 * 
 * <StatCounter
 *   data={{ value: 1234, previousValue: 1100, label: "Users" }}
 *   config={{ format: 'compact', showTrend: true }}
 * />
 * 
 * // Card-style stat
 * import { StatCard } from '@/components/widgets/counters'
 * 
 * <StatCard
 *   data={{ value: 1234, previousValue: 1100 }}
 *   config={{ title: "Total Users", icon: Users }}
 * />
 * ```
 */

export { StatCounter, type CounterData, type CounterConfig } from './stat-counter'
export { StatCard, type StatCardData, type StatCardConfig } from './stat-card'











