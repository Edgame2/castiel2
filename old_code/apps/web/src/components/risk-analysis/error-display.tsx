/**
 * Error Display Component for Risk Analysis
 * Reusable error display with retry functionality and specific error handling
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { handleApiError, isRateLimitError } from '@/lib/api/client';
import type { AxiosError } from 'axios';

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export function ErrorDisplay({ error, onRetry, title, className }: ErrorDisplayProps) {
  const errorMessage = handleApiError(error);
  const isRateLimit = isRateLimitError(errorMessage);
  const isPermissionError = error instanceof Error && 
    'isAxiosError' in error && 
    (error as AxiosError).response?.status === 403;

  // Extract retry after time if rate limited
  const retryAfter = isRateLimit ? errorMessage.retryAfter : undefined;

  // Format retry after time
  const formatRetryAfter = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  };

  const message = isRateLimit 
    ? (errorMessage as any).message 
    : (typeof errorMessage === 'string' ? errorMessage : (errorMessage as any).message);

  return (
    <Alert variant="destructive" className={className}>
      <div className="flex items-start gap-3">
        {isPermissionError ? (
          <Shield className="h-5 w-5 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 mt-0.5" />
        )}
        <div className="flex-1 space-y-2">
          <AlertTitle>
            {title || (isPermissionError ? 'Permission Denied' : 'Error Loading Data')}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{message}</p>
            
            {/* Retry After Countdown */}
            {retryAfter && retryAfter > 0 && (
              <p className="text-xs text-muted-foreground">
                You can try again in {formatRetryAfter(retryAfter)}
              </p>
            )}

            {/* Retry Button */}
            {onRetry && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  disabled={retryAfter ? retryAfter > 0 : false}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}


