/**
 * Error Handling Utilities
 * Centralized error handling patterns for consistent error management
 */

import type { IMonitoringProvider } from '@castiel/monitoring';

export interface ErrorContext {
  operation: string;
  tenantId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface ErrorHandlingOptions {
  logError?: boolean;
  trackException?: boolean;
  trackEvent?: boolean;
  rethrow?: boolean;
  defaultMessage?: string;
  context?: ErrorContext;
}

/**
 * Safely handle errors with consistent logging and monitoring
 */
export function handleError(
  error: unknown,
  monitoring: IMonitoringProvider,
  options: ErrorHandlingOptions = {}
): Error {
  const {
    logError = true,
    trackException = true,
    trackEvent = false,
    rethrow = false,
    defaultMessage = 'An error occurred',
    context = {},
  } = options;

  // Normalize error to Error object
  const normalizedError = error instanceof Error 
    ? error 
    : new Error(error !== null && error !== undefined ? String(error) : defaultMessage);

  // Track exception if enabled
  if (trackException) {
    monitoring.trackException(normalizedError, {
      ...context,
      errorType: normalizedError.constructor.name,
      errorMessage: normalizedError.message,
      errorStack: normalizedError.stack?.substring(0, 500), // Limit stack trace length
    });
  }

  // Track event if enabled (for non-critical errors)
  if (trackEvent) {
    monitoring.trackEvent('error-handled', {
      ...context,
      errorType: normalizedError.constructor.name,
      errorMessage: normalizedError.message.substring(0, 200), // Limit message length
    });
  }

  // Log error if enabled
  if (logError) {
    // Use structured logging via monitoring
    monitoring.trackTrace(
      `[${context.operation || 'unknown'}] Error: ${normalizedError.message}`,
      3, // Error severity level
      {
        ...context,
        errorMessage: normalizedError.message,
        errorStack: normalizedError.stack?.substring(0, 500), // Limit stack trace length
      }
    );
  }

  // Rethrow if requested
  if (rethrow) {
    throw normalizedError;
  }

  return normalizedError;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  monitoring: IMonitoringProvider,
  context: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, monitoring, {
        context,
        rethrow: true,
      });
      throw error; // Will never reach here, but satisfies TypeScript
    }
  }) as T;
}

/**
 * Handle errors in batch operations with partial failure support
 */
export interface BatchErrorResult<T> {
  successful: T[];
  failed: Array<{ item: unknown; error: Error }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export async function handleBatchOperation<T>(
  items: unknown[],
  processor: (item: unknown) => Promise<T>,
  monitoring: IMonitoringProvider,
  context: ErrorContext
): Promise<BatchErrorResult<T>> {
  const successful: T[] = [];
  const failed: Array<{ item: unknown; error: Error }> = [];

  for (const item of items) {
    try {
      const result = await processor(item);
      successful.push(result);
    } catch (error) {
      const normalizedError = handleError(error, monitoring, {
        context: {
          ...context,
          itemId: (item as any)?.id || 'unknown',
        },
        logError: false, // Don't log each individual failure
        trackException: true,
      });
      failed.push({ item, error: normalizedError });
    }
  }

  // Log summary if there were failures
  if (failed.length > 0) {
    monitoring.trackEvent('batch-operation-partial-failure', {
      ...context,
      totalItems: items.length,
      successCount: successful.length,
      failureCount: failed.length,
      failureRate: (failed.length / items.length) * 100,
    });
  }

  return {
    successful,
    failed,
    totalProcessed: items.length,
    successCount: successful.length,
    failureCount: failed.length,
  };
}

/**
 * Validate that required context is present
 */
export function validateErrorContext(context: ErrorContext): void {
  if (!context.operation) {
    throw new Error('Error context must include "operation" field');
  }
}
