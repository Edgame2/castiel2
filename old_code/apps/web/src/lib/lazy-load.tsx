/**
 * Lazy loading utilities for code splitting
 * Provides consistent patterns for lazy loading heavy components
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Default loading component for lazy-loaded components
 */
export function DefaultLoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

/**
 * Create a lazy-loaded component with a loading skeleton
 */
export function createLazyComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType
    ssr?: boolean
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || DefaultLoadingSkeleton,
    ssr: options?.ssr ?? false,
  })
}

/**
 * Lazy load Monaco Editor (heavy code editor)
 */
export const LazyMonacoEditor = createLazyComponent(
  () => import('@monaco-editor/react').then(mod => ({ default: mod.default })),
  { ssr: false }
)

/**
 * Lazy load Recharts components (heavy charting library)
 */
export const LazyRecharts = {
  LineChart: createLazyComponent(
    () => import('recharts').then(mod => ({ default: mod.LineChart })),
    { ssr: false }
  ),
  BarChart: createLazyComponent(
    () => import('recharts').then(mod => ({ default: mod.BarChart })),
    { ssr: false }
  ),
  PieChart: createLazyComponent(
    () => import('recharts').then(mod => ({ default: mod.PieChart })),
    { ssr: false }
  ),
  AreaChart: createLazyComponent(
    () => import('recharts').then(mod => ({ default: mod.AreaChart })),
    { ssr: false }
  ),
  ComposedChart: createLazyComponent(
    () => import('recharts').then(mod => ({ default: mod.ComposedChart })),
    { ssr: false }
  ),
  // Re-export chart components that are lightweight
  XAxis: dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false }),
  YAxis: dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false }),
  CartesianGrid: dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false }),
  Tooltip: dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false }),
  Legend: dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false }),
  Bar: dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false }),
  Line: dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false }),
  Area: dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false }),
  Pie: dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false }),
  Cell: dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false }),
}

/**
 * Lazy load TipTap editor (heavy rich text editor)
 */
export const LazyTipTapEditor = createLazyComponent(
  () => import('@/components/editor/tiptap-editor-with-placeholders').then(mod => ({ 
    default: mod.TipTapEditorWithPlaceholders 
  })),
  { ssr: false }
)
