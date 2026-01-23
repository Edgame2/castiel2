/**
 * Widget Components
 * 
 * Reusable, widget-compatible components that can be used both
 * as standalone components and as dashboard widgets.
 * 
 * All components implement the WidgetCompatibleProps interface
 * from @/types/widget-compatible.
 * 
 * @see docs/guides/component-standards.md
 * @see docs/features/dashboard/README.md
 */

// DataTable - Full-featured data table with sorting, filtering, pagination, export
export * from './data-table'

// Counters - Statistics and counter display components
export * from './counters'

// Charts - Data visualization components
export * from './charts'

// Lists - Activity feeds and generic lists
export * from './lists'

// Re-export common types
export type {
  WidgetCompatibleProps,
  WidgetContext,
  WidgetFormProps,
  WidgetListProps,
  WidgetChartProps,
} from '@/types/widget-compatible'



// Forms - Widget-compatible forms
export * from './project-create-widget'

// Opportunity widgets
export { OpportunityListWidget } from './opportunity-list-widget'
export { PipelineMetricsWidget } from './pipeline-metrics-widget'
export { OpportunitySummaryWidget } from './opportunity-summary-widget'
export * from './project-list-widget'







