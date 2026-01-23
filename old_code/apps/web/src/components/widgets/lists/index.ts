/**
 * List Widgets
 * 
 * Widget-compatible list and feed components.
 * 
 * @example
 * ```tsx
 * // Activity Feed
 * import { ActivityFeed } from '@/components/widgets/lists'
 * 
 * <ActivityFeed
 *   data={activities}
 *   config={{ showAvatars: true, groupByDate: true }}
 * />
 * 
 * // Generic List
 * import { GenericList } from '@/components/widgets/lists'
 * 
 * <GenericList
 *   data={items}
 *   config={{ selectable: true }}
 *   onItemClick={(item) => console.log(item)}
 * />
 * ```
 */

export { ActivityFeed } from './activity-feed'
export { GenericList } from './generic-list'

// Re-export types
export * from './types'











