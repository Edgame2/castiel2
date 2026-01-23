/**
 * AI Recommendation Hook
 * 
 * React hook for accessing the AI recommendation service from frontend
 */

'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  AIRecommendationRequest,
  AIRecommendationResponse,
  RecommendationType,
  RecommendationContext,
} from '@castiel/shared-types';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface UseAIRecommendationOptions {
  onSuccess?: (response: AIRecommendationResponse) => void;
  onError?: (error: Error) => void;
}

export function useAIRecommendation<T = any>(options?: UseAIRecommendationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<AIRecommendationResponse<T> | null>(null);

  const generate = useCallback(
    async (
      type: RecommendationType,
      context: Partial<RecommendationContext>,
      generateOptions?: AIRecommendationRequest['options']
    ): Promise<AIRecommendationResponse<T>> => {
      setIsLoading(true);
      setError(null);

      try {
        const payload: AIRecommendationRequest = {
          type,
          context: context as RecommendationContext, // Backend will merge with auth context
          options: generateOptions,
        };

        const result = await apiClient.post<AIRecommendationResponse<T>>(
          '/api/v1/ai-recommendations/generate',
          payload
        );

        setResponse(result.data);
        options?.onSuccess?.(result.data);
        return result.data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setResponse(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    generate,
    reset,
    isLoading,
    error,
    response,
  };
}

/**
 * Hook for checking rate limit status
 */
export function useAIRecommendationRateLimit() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const check = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.get('/api/v1/ai-recommendations/rate-limit' as any);
      setStatus(result.data);
      return result.data;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to check rate limit', 3, {
        errorMessage: errorObj.message,
      })
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    check,
    isLoading,
    status,
  };
}

/**
 * Hook for checking cost tracking
 */
export function useAIRecommendationCosts() {
  const [isLoading, setIsLoading] = useState(false);
  const [costs, setCosts] = useState<any>(null);

  const fetch = useCallback(async (startDate?: Date, endDate?: Date) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const result = await apiClient.get(`/api/v1/ai-recommendations/costs?${params.toString()}`);
      setCosts(result.data);
      return result.data;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch costs', 3, {
        errorMessage: errorObj.message,
      })
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetch,
    isLoading,
    costs,
  };
}

/**
 * Hook for fetching supported recommendation types
 */
export function useAIRecommendationTypes() {
  const [isLoading, setIsLoading] = useState(false);
  const [types, setTypes] = useState<RecommendationType[]>([]);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.get<{ types: RecommendationType[] }>(
        '/api/v1/ai-recommendations/types'
      );
      setTypes(result.data.types);
      return result.data.types;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to fetch types', 3, {
        errorMessage: errorObj.message,
      })
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetch,
    isLoading,
    types,
  };
}
