'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/monitoring/app-insights'

/**
 * Hook to track page views with Application Insights
 */
export function usePageTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      trackPageView(pathname, url)
    }
  }, [pathname, searchParams])
}
