'use client'

import { useEffect, ReactNode } from 'react'
import { initializeAppInsights } from '@/lib/monitoring/app-insights'
import { usePageTracking } from '@/hooks/use-page-tracking'

export function MonitoringProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Application Insights on mount
    initializeAppInsights()
  }, [])

  // Track page views
  usePageTracking()

  return <>{children}</>
}
