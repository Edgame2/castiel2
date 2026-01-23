/**
 * Web Vitals Reporting
 * Reports Core Web Vitals to analytics
 */

import { onCLS, onFCP, onFID, onLCP, onTTFB, type Metric } from 'web-vitals'
import { reportWebVitals as reportToMonitoring } from '@/lib/monitoring/performance'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

/**
 * Report Web Vitals to analytics and monitoring
 */
export function reportWebVitals(metric: Metric) {
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    })
  }

  // Send to monitoring service
  reportToMonitoring(metric as any)

  // Send to analytics (if available)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }

  // Send to custom endpoint (optional)
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        timestamp: Date.now(),
      }),
    }).catch((error) => {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 2) // Warning level - web vitals reporting failure is not critical
      trackTrace('Failed to send web vitals', 2, {
        errorMessage: errorObj.message,
        metricName: metric.name,
      })
    })
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this in your root layout or _app
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return

  onCLS(reportWebVitals)
  onFCP(reportWebVitals)
  onFID(reportWebVitals)
  onLCP(reportWebVitals)
  onTTFB(reportWebVitals)
}

/**
 * Get performance rating color
 */
export function getMetricColor(rating: 'good' | 'needs-improvement' | 'poor') {
  switch (rating) {
    case 'good':
      return 'text-green-600'
    case 'needs-improvement':
      return 'text-yellow-600'
    case 'poor':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

/**
 * Format metric value for display
 */
export function formatMetricValue(name: string, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3)
  }
  
  if (value < 1000) {
    return `${Math.round(value)}ms`
  }
  
  return `${(value / 1000).toFixed(2)}s`
}

// Type augmentation
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
