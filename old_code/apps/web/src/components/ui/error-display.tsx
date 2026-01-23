/**
 * Reusable Error Display Component
 * Provides consistent error messaging across the application
 */

'use client'

import { AlertCircle, RefreshCw, Shield, AlertTriangle, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AxiosError } from 'axios'
import { cn } from '@/lib/utils'

export type ErrorType = 
  | 'network'
  | 'server'
  | 'permission'
  | 'validation'
  | 'not_found'
  | 'rate_limit'
  | 'timeout'
  | 'unknown'

export interface ErrorDisplayProps {
  error: unknown
  title?: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  variant?: 'default' | 'compact'
}

/**
 * Extract user-friendly error message from error object
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object') {
    // Axios error
    if ('isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as AxiosError
      if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
        const data = axiosError.response.data as { message?: string; error?: string }
        return data.message || data.error || axiosError.message
      }
      return axiosError.message || 'An error occurred'
    }

    // Error with message property
    if ('message' in error && typeof error.message === 'string') {
      return error.message
    }
  }

  return 'An unexpected error occurred'
}

/**
 * Determine error type from error object
 */
function getErrorType(error: unknown): ErrorType {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError
    const status = axiosError.response?.status

    if (status === 403) return 'permission'
    if (status === 404) return 'not_found'
    if (status === 400 || status === 422) return 'validation'
    if (status === 429) return 'rate_limit'
    if (status === 408 || status === 504) return 'timeout'
    if (status && status >= 500) return 'server'
    if (status && status >= 400) return 'network'
  }

  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'network'
    }
    if (error.message.includes('timeout')) {
      return 'timeout'
    }
  }

  return 'unknown'
}

/**
 * Get error icon based on type
 */
function getErrorIcon(type: ErrorType) {
  switch (type) {
    case 'permission':
      return <Shield className="h-5 w-5" />
    case 'server':
      return <XCircle className="h-5 w-5" />
    case 'validation':
      return <AlertTriangle className="h-5 w-5" />
    default:
      return <AlertCircle className="h-5 w-5" />
  }
}

/**
 * Get error title based on type
 */
function getErrorTitle(type: ErrorType, customTitle?: string): string {
  if (customTitle) return customTitle

  switch (type) {
    case 'permission':
      return 'Permission Denied'
    case 'server':
      return 'Server Error'
    case 'validation':
      return 'Validation Error'
    case 'not_found':
      return 'Not Found'
    case 'rate_limit':
      return 'Rate Limit Exceeded'
    case 'timeout':
      return 'Request Timeout'
    case 'network':
      return 'Network Error'
    default:
      return 'Error'
  }
}

/**
 * Get user-friendly error message based on type
 */
function getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
  switch (type) {
    case 'permission':
      return 'You do not have permission to perform this action. Please contact your administrator if you believe this is an error.'
    case 'server':
      return 'An internal server error occurred. Please try again later or contact support if the problem persists.'
    case 'validation':
      return originalMessage || 'Please check your input and try again.'
    case 'not_found':
      return 'The requested resource could not be found.'
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.'
    case 'timeout':
      return 'The request took too long to complete. Please try again.'
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.'
    default:
      return originalMessage || 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Check if error is recoverable (can be retried)
 */
function isRecoverable(type: ErrorType): boolean {
  return !['permission', 'not_found', 'validation'].includes(type)
}

/**
 * Reusable Error Display Component
 */
export function ErrorDisplay({
  error,
  title,
  onRetry,
  onDismiss,
  className,
  variant = 'default',
}: ErrorDisplayProps) {
  const errorType = getErrorType(error)
  const errorMessage = getErrorMessage(error)
  const userFriendlyMessage = getUserFriendlyMessage(errorType, errorMessage)
  const recoverable = isRecoverable(errorType)
  const displayTitle = getErrorTitle(errorType, title)
  const icon = getErrorIcon(errorType)

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
        {icon}
        <span>{userFriendlyMessage}</span>
        {onRetry && recoverable && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="h-auto p-1"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Alert variant="destructive" className={className}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 space-y-3">
          <AlertTitle className="text-base font-semibold">
            {displayTitle}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">{userFriendlyMessage}</p>

            {/* Show original error message in development */}
            {process.env.NODE_ENV === 'development' && errorMessage !== userFriendlyMessage && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Technical details</summary>
                <pre className="mt-2 whitespace-pre-wrap">{errorMessage}</pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {onRetry && recoverable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}
