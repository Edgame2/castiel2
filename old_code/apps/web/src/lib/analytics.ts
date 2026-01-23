/**
 * Analytics & Event Tracking
 * 
 * Tracks user interactions and feature usage for product insights.
 * Integrates with analytics providers (Google Analytics, Mixpanel, etc.)
 */

import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

/**
 * ShardType Analytics Events
 */
export enum ShardTypeEvent {
    // CRUD Operations
    SHARD_TYPE_VIEWED = 'shard_type_viewed',
    SHARD_TYPE_CREATED = 'shard_type_created',
    SHARD_TYPE_UPDATED = 'shard_type_updated',
    SHARD_TYPE_DELETED = 'shard_type_deleted',
    SHARD_TYPE_CLONED = 'shard_type_cloned',

    // Schema Builder
    SCHEMA_BUILDER_OPENED = 'schema_builder_opened',
    SCHEMA_BUILDER_MODE_SWITCHED = 'schema_builder_mode_switched',
    SCHEMA_FIELD_ADDED = 'schema_field_added',
    SCHEMA_FIELD_EDITED = 'schema_field_edited',
    SCHEMA_FIELD_DELETED = 'schema_field_deleted',
    SCHEMA_FIELD_REORDERED = 'schema_field_reordered',

    // Preview & Testing
    SCHEMA_PREVIEW_OPENED = 'schema_preview_opened',
    SAMPLE_DATA_GENERATED = 'sample_data_generated',
    SCHEMA_VALIDATED = 'schema_validated',

    // Inheritance
    PARENT_TYPE_SELECTED = 'parent_type_selected',
    INHERITANCE_TREE_VIEWED = 'inheritance_tree_viewed',

    // Search & Filter
    SHARD_TYPES_SEARCHED = 'shard_types_searched',
    SHARD_TYPES_FILTERED = 'shard_types_filtered',

    // Errors
    SHARD_TYPE_ERROR = 'shard_type_error',
    VALIDATION_ERROR = 'validation_error',
    API_ERROR = 'api_error',
}

/**
 * Event properties interface
 */
interface EventProperties {
    // Common properties
    timestamp?: number
    userId?: string
    tenantId?: string
    sessionId?: string

    // ShardType specific
    shardTypeId?: string
    shardTypeName?: string
    shardTypeCategory?: string
    isGlobal?: boolean

    // Schema builder
    builderMode?: 'visual' | 'code'
    fieldType?: string
    fieldCount?: number

    // Error tracking
    errorMessage?: string
    errorCode?: string

    // Performance
    duration?: number

    // Additional context
    [key: string]: any
}

/**
 * Analytics provider interface
 */
interface AnalyticsProvider {
    track(event: string, properties?: EventProperties): void
    identify(userId: string, traits?: Record<string, any>): void
    page(pageName: string, properties?: Record<string, any>): void
}

/**
 * Console logger for development
 */
class ConsoleAnalytics implements AnalyticsProvider {
    track(event: string, properties?: EventProperties): void {
        console.log('[Analytics]', event, properties)
    }

    identify(userId: string, traits?: Record<string, any>): void {
        console.log('[Analytics] Identify:', userId, traits)
    }

    page(pageName: string, properties?: Record<string, any>): void {
        console.log('[Analytics] Page:', pageName, properties)
    }
}

/**
 * Google Analytics 4 provider
 */
class GoogleAnalytics implements AnalyticsProvider {
    track(event: string, properties?: EventProperties): void {
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', event, properties)
        }
    }

    identify(userId: string, traits?: Record<string, any>): void {
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
                user_id: userId,
                ...traits,
            })
        }
    }

    page(pageName: string, properties?: Record<string, any>): void {
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'page_view', {
                page_title: pageName,
                ...properties,
            })
        }
    }
}

/**
 * Get analytics provider based on environment
 */
function getAnalyticsProvider(): AnalyticsProvider {
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (isDevelopment) {
        return new ConsoleAnalytics()
    }

    // Production: Use Google Analytics
    if (process.env.NEXT_PUBLIC_GA_ID) {
        return new GoogleAnalytics()
    }

    // Fallback to console
    return new ConsoleAnalytics()
}

const analytics = getAnalyticsProvider()

/**
 * Track an analytics event
 * 
 * @param event - Event name
 * @param properties - Event properties
 * 
 * @example
 * ```tsx
 * trackEvent(ShardTypeEvent.SHARD_TYPE_CREATED, {
 *   shardTypeId: 'uuid',
 *   shardTypeName: 'customer-record',
 *   category: 'DATA',
 *   isGlobal: false,
 *   fieldCount: 5
 * })
 * ```
 */
export function trackEvent(
    event: ShardTypeEvent | string,
    properties?: EventProperties
): void {
    try {
        analytics.track(event, {
            ...properties,
            timestamp: Date.now(),
        })
    } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to track event', 3, {
            errorMessage: errorObj.message,
            event,
        })
    }
}

/**
 * Identify a user for analytics
 * 
 * @param userId - User ID
 * @param traits - User traits
 */
export function identifyUser(
    userId: string,
    traits?: {
        email?: string
        name?: string
        role?: string
        tenantId?: string
        [key: string]: any
    }
): void {
    try {
        analytics.identify(userId, traits)
    } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to identify user', 3, {
            errorMessage: errorObj.message,
            userId,
        })
    }
}

/**
 * Track page view
 * 
 * @param pageName - Page name
 * @param properties - Page properties
 */
export function trackPageView(
    pageName: string,
    properties?: Record<string, any>
): void {
    try {
        analytics.page(pageName, properties)
    } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to track page view', 3, {
            errorMessage: errorObj.message,
            pageName,
        })
    }
}

/**
 * Track ShardType CRUD operation with performance timing
 */
export function trackShardTypeOperation(
    operation: 'create' | 'update' | 'delete' | 'clone',
    shardType: {
        id: string
        name: string
        category: string
        isGlobal: boolean
    },
    metadata?: {
        duration?: number
        fieldCount?: number
        hasParent?: boolean
    }
): void {
    const eventMap = {
        create: ShardTypeEvent.SHARD_TYPE_CREATED,
        update: ShardTypeEvent.SHARD_TYPE_UPDATED,
        delete: ShardTypeEvent.SHARD_TYPE_DELETED,
        clone: ShardTypeEvent.SHARD_TYPE_CLONED,
    }

    trackEvent(eventMap[operation], {
        shardTypeId: shardType.id,
        shardTypeName: shardType.name,
        shardTypeCategory: shardType.category,
        isGlobal: shardType.isGlobal,
        ...metadata,
    })
}

/**
 * Track schema builder interaction
 */
export function trackSchemaBuilderEvent(
    action: 'open' | 'switch_mode' | 'add_field' | 'edit_field' | 'delete_field' | 'reorder',
    properties?: {
        mode?: 'visual' | 'code'
        fieldType?: string
        fieldCount?: number
    }
): void {
    const eventMap = {
        open: ShardTypeEvent.SCHEMA_BUILDER_OPENED,
        switch_mode: ShardTypeEvent.SCHEMA_BUILDER_MODE_SWITCHED,
        add_field: ShardTypeEvent.SCHEMA_FIELD_ADDED,
        edit_field: ShardTypeEvent.SCHEMA_FIELD_EDITED,
        delete_field: ShardTypeEvent.SCHEMA_FIELD_DELETED,
        reorder: ShardTypeEvent.SCHEMA_FIELD_REORDERED,
    }

    trackEvent(eventMap[action], properties)
}

/**
 * Track error with context
 */
export function trackError(
    errorType: 'validation' | 'api' | 'general',
    error: Error | string,
    context?: Record<string, any>
): void {
    const errorMessage = typeof error === 'string' ? error : error.message

    trackEvent(ShardTypeEvent.SHARD_TYPE_ERROR, {
        errorType,
        errorMessage,
        ...context,
    })
}

/**
 * React hook for tracking page views
 * 
 * @example
 * ```tsx
 * export default function ShardTypesPage() {
 *   usePageTracking('ShardTypes List')
 *   return <div>...</div>
 * }
 * ```
 */
export function usePageTracking(pageName: string, properties?: Record<string, any>) {
    if (typeof window !== 'undefined') {
        trackPageView(pageName, properties)
    }
}

/**
 * React hook for tracking component mount/unmount
 */
export function useComponentTracking(
    componentName: string,
    properties?: Record<string, any>
) {
    if (typeof window !== 'undefined') {
        const startTime = Date.now()

        // Track mount
        trackEvent(`${componentName}_mounted`, properties)

        // Track unmount and duration
        return () => {
            const duration = Date.now() - startTime
            trackEvent(`${componentName}_unmounted`, {
                ...properties,
                duration,
            })
        }
    }
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
    private startTime: number

    constructor(private eventName: string, private properties?: EventProperties) {
        this.startTime = Date.now()
    }

    end(additionalProperties?: EventProperties): void {
        const duration = Date.now() - this.startTime
        trackEvent(this.eventName, {
            ...this.properties,
            ...additionalProperties,
            duration,
        })
    }
}

/**
 * Track operation with automatic timing
 * 
 * @example
 * ```tsx
 * const timer = new PerformanceTimer('schema_validation')
 * // ... perform operation
 * timer.end({ success: true, fieldCount: 10 })
 * ```
 */
export function trackPerformance<T>(
    eventName: string,
    operation: () => T | Promise<T>,
    properties?: EventProperties
): T | Promise<T> {
    const timer = new PerformanceTimer(eventName, properties)

    try {
        const result = operation()

        if (result instanceof Promise) {
            return result
                .then((value) => {
                    timer.end({ success: true })
                    return value
                })
                .catch((error) => {
                    timer.end({ success: false, error: error.message })
                    throw error
                }) as Promise<T>
        }

        timer.end({ success: true })
        return result
    } catch (error) {
        timer.end({ success: false, error: (error as Error).message })
        throw error
    }
}
