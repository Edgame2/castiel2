/**
 * AI Insights Error Handler
 * Provides improved error handling with categorization, user-friendly messages, and recovery actions
 */

"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  RefreshCw, 
  DollarSign, 
  Clock, 
  WifiOff, 
  ServerOff, 
  Ban,
  Settings,
  ExternalLink,
  HelpCircle
} from "lucide-react"
import { handleApiError, isRateLimitError, RateLimitError } from "@/lib/api/client"
import { AxiosError } from "axios"
import { formatDistanceToNow } from "date-fns"

export type AIInsightErrorType = 
  | 'rate_limit'
  | 'budget_exceeded'
  | 'model_unavailable'
  | 'timeout'
  | 'network'
  | 'server_error'
  | 'validation'
  | 'permission'
  | 'unknown'

export interface AIInsightError {
  type: AIInsightErrorType
  message: string
  originalError?: unknown
  retryAfter?: number
  resetAt?: string
  errorCode?: string
  details?: Record<string, any>
  recoverable?: boolean
  suggestedActions?: {
    label: string
    action: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }[]
}

/**
 * Categorize and enhance AI insights errors
 */
export function categorizeAIInsightError(error: unknown): AIInsightError {
  // Handle rate limit errors
  if (isRateLimitError(error)) {
    const rateLimitError = error as RateLimitError
    return {
      type: 'rate_limit',
      message: rateLimitError.message || 'Too many requests. Please wait a moment and try again.',
      retryAfter: rateLimitError.retryAfter,
      resetAt: rateLimitError.resetAt,
      recoverable: true,
      suggestedActions: [
        {
          label: 'Wait and Retry',
          action: () => {
            if (rateLimitError.retryAfter) {
              setTimeout(() => window.location.reload(), rateLimitError.retryAfter * 1000)
            }
          },
          variant: 'default',
        },
      ],
    }
  }

  // Handle Axios errors
  if (error instanceof Error && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ 
      message?: string
      error?: string
      code?: string
      details?: Record<string, any>
    }>

    const status = axiosError.response?.status
    const data = axiosError.response?.data

    // Rate limit (429)
    if (status === 429) {
      const retryAfter = (data as any)?.retryAfter || parseInt(axiosError.response?.headers['retry-after'] || '0')
      return {
        type: 'rate_limit',
        message: data?.message || 'Too many requests. Please wait a moment and try again.',
        retryAfter,
        recoverable: true,
        suggestedActions: [
          {
            label: 'Wait and Retry',
            action: () => {
              if (retryAfter) {
                setTimeout(() => window.location.reload(), retryAfter * 1000)
              }
            },
            variant: 'default',
          },
        ],
      }
    }

    // Budget exceeded (402 or custom code)
    if (status === 402 || data?.code === 'BUDGET_EXCEEDED' || data?.error?.includes('budget')) {
      return {
        type: 'budget_exceeded',
        message: data?.message || 'AI usage budget has been exceeded. Please contact your administrator.',
        errorCode: data?.code,
        details: data?.details,
        recoverable: false,
        suggestedActions: [
          {
            label: 'View Usage',
            action: () => window.open('/settings/ai', '_blank'),
            variant: 'outline',
          },
          {
            label: 'Contact Admin',
            action: () => window.open('mailto:support@castiel.ai', '_blank'),
            variant: 'secondary',
          },
        ],
      }
    }

    // Model unavailable (503)
    if (status === 503) {
      return {
        type: 'model_unavailable',
        message: data?.message || 'The AI model is temporarily unavailable. Please try again later.',
        errorCode: data?.code,
        details: data?.details,
        recoverable: true,
        suggestedActions: [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            variant: 'default',
          },
          {
            label: 'Configure Models',
            action: () => window.open('/settings/ai', '_blank'),
            variant: 'outline',
          },
        ],
      }
    }

    // Timeout (408 or timeout in message)
    if (status === 408 || axiosError.message?.toLowerCase().includes('timeout')) {
      return {
        type: 'timeout',
        message: 'The request took too long to complete. This may be due to a complex query or high server load.',
        recoverable: true,
        suggestedActions: [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            variant: 'default',
          },
          {
            label: 'Simplify Query',
            action: () => {},
            variant: 'outline',
          },
        ],
      }
    }

    // Network error
    if (status === 0 || axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
      return {
        type: 'network',
        message: 'Unable to connect to the server. Please check your internet connection.',
        recoverable: true,
        suggestedActions: [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            variant: 'default',
          },
        ],
      }
    }

    // Server error (500)
    if (status === 500 || status === 502 || status === 504) {
      return {
        type: 'server_error',
        message: data?.message || 'An internal server error occurred. Please try again later.',
        errorCode: data?.code,
        recoverable: true,
        suggestedActions: [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            variant: 'default',
          },
        ],
      }
    }

    // Validation error (400, 422)
    if (status === 400 || status === 422) {
      return {
        type: 'validation',
        message: data?.message || 'Invalid request. Please check your input and try again.',
        errorCode: data?.code,
        details: data?.details,
        recoverable: true,
      }
    }

    // Permission error (403)
    if (status === 403) {
      return {
        type: 'permission',
        message: data?.message || 'You do not have permission to perform this action.',
        recoverable: false,
        suggestedActions: [
          {
            label: 'Contact Admin',
            action: () => window.open('mailto:support@castiel.ai', '_blank'),
            variant: 'outline',
          },
        ],
      }
    }
  }

  // Check error message for specific patterns
  const handledError = handleApiError(error)
  let errorMessage: string = typeof handledError === 'string' ? handledError : handledError.message

  if (errorMessage.includes('budget') || errorMessage.includes('quota') || errorMessage.includes('limit exceeded')) {
    return {
      type: 'budget_exceeded',
      message: 'AI usage limit has been exceeded. Please contact your administrator.',
      recoverable: false,
      suggestedActions: [
        {
          label: 'View Usage',
          action: () => window.open('/settings/ai', '_blank'),
          variant: 'outline',
        },
      ],
    }
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return {
      type: 'rate_limit',
      message: 'Too many requests. Please wait a moment and try again.',
      recoverable: true,
      suggestedActions: [
        {
          label: 'Retry Later',
          action: () => {},
          variant: 'default',
        },
      ],
    }
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return {
      type: 'timeout',
      message: 'The request timed out. Please try again with a simpler query.',
      recoverable: true,
      suggestedActions: [
        {
          label: 'Retry',
          action: () => window.location.reload(),
          variant: 'default',
        },
      ],
    }
  }

  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return {
      type: 'network',
      message: 'Network error. Please check your connection and try again.',
      recoverable: true,
      suggestedActions: [
        {
          label: 'Retry',
          action: () => window.location.reload(),
          variant: 'default',
        },
      ],
    }
  }

  // Default unknown error - enhance error message with more details
  
  // Try to extract more details from the error
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error)
      if (parsed.message) {
        errorMessage = parsed.message
      }
      if (parsed.error) {
        errorMessage = parsed.error
      }
      if (parsed.details) {
        errorMessage = `${errorMessage}. ${parsed.details}`
      }
    } catch {
      // Not JSON, use as-is
      if (error && error.length > 0 && error !== errorMessage) {
        errorMessage = error
      }
    }
  } else if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message?: string; details?: string; error?: string }
    if (errorObj.message && errorObj.message !== errorMessage) {
      errorMessage = errorObj.message
    }
    if (errorObj.details) {
      errorMessage = `${errorMessage}. ${errorObj.details}`
    }
    if (errorObj.error && !errorMessage.includes(errorObj.error)) {
      errorMessage = `${errorMessage} (${errorObj.error})`
    }
  }
  
  return {
    type: 'unknown',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    originalError: error,
    recoverable: true,
    suggestedActions: [
      {
        label: 'Retry',
        action: () => window.location.reload(),
        variant: 'default',
      },
      {
        label: 'Get Help',
        action: () => window.open('mailto:support@castiel.ai', '_blank'),
        variant: 'outline',
      },
    ],
  }
}

/**
 * Get icon for error type
 */
function getErrorIcon(type: AIInsightErrorType) {
  switch (type) {
    case 'rate_limit':
      return <Ban className="h-5 w-5" />
    case 'budget_exceeded':
      return <DollarSign className="h-5 w-5" />
    case 'model_unavailable':
      return <ServerOff className="h-5 w-5" />
    case 'timeout':
      return <Clock className="h-5 w-5" />
    case 'network':
      return <WifiOff className="h-5 w-5" />
    case 'server_error':
      return <ServerOff className="h-5 w-5" />
    case 'validation':
    case 'permission':
      return <AlertCircle className="h-5 w-5" />
    default:
      return <HelpCircle className="h-5 w-5" />
  }
}

/**
 * Get color variant for error type
 */
function getErrorVariant(type: AIInsightErrorType): "default" | "destructive" {
  switch (type) {
    case 'rate_limit':
    case 'budget_exceeded':
      return 'destructive'
    case 'model_unavailable':
    case 'timeout':
    case 'network':
    case 'server_error':
      return 'default'
    default:
      return 'destructive'
  }
}

/**
 * AI Insight Error Display Component
 */
export function AIInsightErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className,
}: {
  error: unknown
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}) {
  const categorizedError = categorizeAIInsightError(error)

  return (
    <Alert 
      variant={getErrorVariant(categorizedError.type)} 
      className={className}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getErrorIcon(categorizedError.type)}</div>
        <div className="flex-1 space-y-3">
          <AlertTitle className="text-base font-semibold">
            {getErrorTitle(categorizedError.type)}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">{categorizedError.message}</p>

            {/* Retry After Countdown */}
            {categorizedError.retryAfter && categorizedError.retryAfter > 0 && (
              <div className="text-xs text-muted-foreground">
                You can try again in {formatRetryAfter(categorizedError.retryAfter)}
              </div>
            )}

            {/* Error Code Badge */}
            {categorizedError.errorCode && (
              <div>
                <Badge variant="outline" className="text-xs">
                  Code: {categorizedError.errorCode}
                </Badge>
              </div>
            )}

            {/* Suggested Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {onRetry && categorizedError.recoverable && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={onRetry}
                  disabled={categorizedError.retryAfter ? categorizedError.retryAfter > 0 : false}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry
                </Button>
              )}
              
              {categorizedError.suggestedActions?.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={action.action}
                >
                  {action.label}
                </Button>
              ))}

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

/**
 * Get error title based on type
 */
function getErrorTitle(type: AIInsightErrorType): string {
  switch (type) {
    case 'rate_limit':
      return 'Rate Limit Exceeded'
    case 'budget_exceeded':
      return 'Budget Exceeded'
    case 'model_unavailable':
      return 'Model Unavailable'
    case 'timeout':
      return 'Request Timeout'
    case 'network':
      return 'Network Error'
    case 'server_error':
      return 'Server Error'
    case 'validation':
      return 'Validation Error'
    case 'permission':
      return 'Permission Denied'
    default:
      return 'Error'
  }
}

/**
 * Format retry after time
 */
function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
}








