/**
 * Error Tracking & Monitoring Setup
 * 
 * Integrates with Sentry for error tracking and performance monitoring.
 * Includes custom error boundaries and reporting utilities.
 */

import * as Sentry from '@sentry/nextjs'
import { browserTracingIntegration, replayIntegration } from '@sentry/nextjs'

/**
 * Initialize Sentry error tracking
 */
export function initErrorTracking(): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',

            // Performance monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

            // Session replay
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,

            // Integrations
            integrations: [
                browserTracingIntegration(),
                replayIntegration({
                    maskAllText: false,
                    blockAllMedia: false,
                }),
            ],

            // Filter out known errors
            beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
                const error = hint?.originalException

                // Ignore network errors in development
                if (process.env.NODE_ENV === 'development' &&
                    error instanceof Error &&
                    error.message.includes('Network')) {
                    return null
                }

                return event
            },
        })
    }
}

/**
 * Report error to monitoring service
 */
export function reportError(
    error: Error,
    context?: {
        component?: string
        action?: string
        userId?: string
        extra?: Record<string, any>
    }
): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.withScope((scope) => {
            if (context?.component) {
                scope.setTag('component', context.component)
            }
            if (context?.action) {
                scope.setTag('action', context.action)
            }
            if (context?.userId) {
                scope.setUser({ id: context.userId })
            }
            if (context?.extra) {
                scope.setContext('additional', context.extra)
            }

            Sentry.captureException(error)
        })
    } else {
        // Fallback to console in development
        console.error('[Error]', error, context)
    }
}

/**
 * Report warning (non-error issue)
 */
export function reportWarning(
    message: string,
    context?: Record<string, any>
): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureMessage(message, {
            level: 'warning',
            extra: context,
        })
    } else {
        console.warn('[Warning]', message, context)
    }
}

/**
 * Set user context for error tracking
 */
export function setErrorTrackingUser(user: {
    id: string
    email?: string
    username?: string
    role?: string
}): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
        })

        if (user.role) {
            Sentry.setTag('user_role', user.role)
        }
    }
}

/**
 * Clear user context (on logout)
 */
export function clearErrorTrackingUser(): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.setUser(null)
    }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
    message: string,
    category?: string,
    data?: Record<string, any>
): void {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.addBreadcrumb({
            message,
            category: category || 'user-action',
            data,
            level: 'info',
        })
    }
}

/**
 * React Error Boundary with Sentry integration
 */
import React from 'react'

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        reportError(error, {
            component: 'ErrorBoundary',
            extra: {
                componentStack: errorInfo.componentStack,
            },
        })

        this.props.onError?.(error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex min-h-screen items-center justify-center p-4">
                    <div className="max-w-md text-center">
                        <h2 className="mb-4 text-2xl font-bold">Something went wrong</h2>
                        <p className="mb-4 text-muted-foreground">
                            We've been notified of the issue and will look into it.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
                        >
                            Reload page
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        )
    }
}
