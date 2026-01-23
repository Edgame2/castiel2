// Application Insights configuration and initialization
import { ApplicationInsights } from '@microsoft/applicationinsights-web'
import { env } from '@/lib/env'

let appInsights: ApplicationInsights | null = null

/**
 * Initialize Application Insights
 * Only initializes if connection string is provided
 */
export function initializeAppInsights(): ApplicationInsights | null {
  // Skip if already initialized
  if (appInsights) {
    return appInsights
  }

  // Skip if no connection string provided
  const connectionString = env.NEXT_PUBLIC_APP_INSIGHTS_CONNECTION_STRING
  if (!connectionString) {
    console.warn('Application Insights connection string not provided. Monitoring disabled.')
    return null
  }

  try {
    appInsights = new ApplicationInsights({
      config: {
        connectionString,
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        disableFetchTracking: false,
        disableAjaxTracking: false,
        maxBatchInterval: 15000,
        maxBatchSizeInBytes: 10000,
      },
    })

    appInsights.loadAppInsights()

    // Set common properties
    appInsights.addTelemetryInitializer((envelope) => {
      if (envelope.tags) {
        envelope.tags['ai.cloud.role'] = 'castiel-frontend'
        envelope.tags['ai.cloud.roleInstance'] = 'web'
      }
    })

    console.log('Application Insights initialized')
    return appInsights
  } catch (error) {
    console.error('Failed to initialize Application Insights:', error)
    return null
  }
}

/**
 * Get Application Insights instance
 */
export function getAppInsights(): ApplicationInsights | null {
  return appInsights
}

/**
 * Track custom event
 */
export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (appInsights) {
    appInsights.trackEvent({ name }, properties)
  }
}

/**
 * Track page view
 */
export function trackPageView(name: string, url?: string) {
  if (appInsights) {
    appInsights.trackPageView({ name, uri: url })
  }
}

/**
 * Track exception
 */
export function trackException(error: Error, severityLevel?: number) {
  if (appInsights) {
    appInsights.trackException({ exception: error, severityLevel })
  }
}

/**
 * Track metric
 */
export function trackMetric(name: string, average: number, properties?: Record<string, unknown>) {
  if (appInsights) {
    appInsights.trackMetric({ name, average }, properties)
  }
}

/**
 * Track trace/log message
 */
export function trackTrace(message: string, severityLevel?: number, properties?: Record<string, unknown>) {
  if (appInsights) {
    appInsights.trackTrace({ message, severityLevel }, properties)
  }
}

/**
 * Flush telemetry data
 */
export function flushTelemetry() {
  if (appInsights) {
    appInsights.flush()
  }
}
