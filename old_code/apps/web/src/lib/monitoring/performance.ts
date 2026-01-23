/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and provides performance insights
 */

export interface PerformanceMetrics {
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
}

export interface PerformanceThresholds {
  lcp: number // Target: 2.5s
  fid: number // Target: 100ms
  cls: number // Target: 0.1
  fcp: number // Target: 1.8s
  ttfb: number // Target: 800ms
}

// Performance thresholds based on Core Web Vitals
export const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  lcp: 2500, // 2.5 seconds
  fid: 100, // 100 milliseconds
  cls: 0.1, // 0.1 score
  fcp: 1800, // 1.8 seconds
  ttfb: 800, // 800 milliseconds
}

/**
 * Report Web Vitals to analytics
 */
export function reportWebVitals(metric: PerformanceMetrics) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${JSON.stringify(metric, null, 2)}`)
  }

  // Send to analytics endpoint
  if (typeof window !== 'undefined' && window.gtag) {
    const { name, value, id } = metric as any
    window.gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    })
  }
}

/**
 * Get performance rating based on thresholds
 */
export function getPerformanceRating(
  metricName: keyof PerformanceThresholds,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = PERFORMANCE_THRESHOLDS[metricName]

  // CLS has different thresholds
  if (metricName === 'cls') {
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
  }

  // Other metrics use percentage-based thresholds
  if (value <= threshold) return 'good'
  if (value <= threshold * 1.5) return 'needs-improvement'
  return 'poor'
}

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string) {
  if (typeof window === 'undefined') return

  const startMark = `${componentName}-start`
  const endMark = `${componentName}-end`
  const measureName = `${componentName}-render`

  performance.mark(startMark)

  return () => {
    performance.mark(endMark)
    performance.measure(measureName, startMark, endMark)

    const measure = performance.getEntriesByName(measureName)[0]
    if (measure && process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} rendered in ${measure.duration.toFixed(2)}ms`)
    }

    // Cleanup marks
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(measureName)
  }
}

/**
 * Get current performance metrics
 */
export function getCurrentMetrics(): PerformanceMetrics {
  if (typeof window === 'undefined') return {}

  const metrics: PerformanceMetrics = {}

  // Get navigation timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (navigation) {
    metrics.ttfb = navigation.responseStart - navigation.requestStart
  }

  // Get paint timing
  const paintEntries = performance.getEntriesByType('paint')
  const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
  if (fcp) {
    metrics.fcp = fcp.startTime
  }

  return metrics
}

/**
 * Monitor long tasks (tasks > 50ms)
 */
export function monitorLongTasks(callback: (duration: number) => void) {
  if (typeof window === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          callback(entry.duration)
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`)
          }
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })

    return () => observer.disconnect()
  } catch (error) {
    // PerformanceObserver not supported
    console.warn('[Performance] PerformanceObserver not supported')
  }
}

/**
 * Prefetch a route for faster navigation
 */
export function prefetchRoute(href: string) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link' as any)
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

/**
 * Preload a critical resource
 */
export function preloadResource(href: string, as: string) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link' as any)
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

/**
 * Get resource timing for a specific resource
 */
export function getResourceTiming(resourceUrl: string) {
  if (typeof window === 'undefined') return null

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  return resources.find((resource) => resource.name.includes(resourceUrl))
}

/**
 * Calculate bundle size from resource timings
 */
export function calculateBundleSize(): number {
  if (typeof window === 'undefined') return 0

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const jsResources = resources.filter((resource) => resource.name.endsWith('.js'))

  return jsResources.reduce((total, resource) => {
    return total + (resource.transferSize || 0)
  }, 0)
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Monitor memory usage (if available)
 */
export function getMemoryUsage() {
  if (typeof window === 'undefined') return null

  const memory = (performance as any).memory
  if (!memory) return null

  return {
    usedJSHeapSize: formatBytes(memory.usedJSHeapSize),
    totalJSHeapSize: formatBytes(memory.totalJSHeapSize),
    jsHeapSizeLimit: formatBytes(memory.jsHeapSizeLimit),
  }
}

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      eventName: string,
      params: {
        event_category: string
        value: number
        event_label: string
        non_interaction: boolean
      }
    ) => void
  }
}
