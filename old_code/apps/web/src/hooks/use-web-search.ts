'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    searchWeb,
    deepSearchWeb,
    getSearchHistory,
    getSearchStatistics,
    cleanupSearches,
    createRecurringSearch,
    openDeepSearchSocket,
    type SearchOptions,
    type DeepSearchOptions,
} from '@/lib/api/web-search'
import { toast } from 'sonner'
import type {
    SearchResponsePayload,
    SearchHistoryItem,
    SearchStatistics,
    RecurringSearchRequest,
    RecurringSearchResponse,
    ScrapingProgressEvent,
} from '@/types/web-search'
import type { SearchResultItem, DeepSearchPage } from '@/types/web-search'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

// Query key factory
export const webSearchKeys = {
    all: ['web-search'] as const,
    searches: () => [...webSearchKeys.all, 'searches'] as const,
    search: (query: string) => [...webSearchKeys.searches(), query] as const,
    history: () => [...webSearchKeys.all, 'history'] as const,
    statistics: () => [...webSearchKeys.all, 'statistics'] as const,
    recurring: () => [...webSearchKeys.all, 'recurring'] as const,
}

// Hook: Perform web search
export function useWebSearch() {
    const queryClient = useQueryClient()
    const [results, setResults] = useState<SearchResultItem[]>([])
    const [deepSearchPages, setDeepSearchPages] = useState<DeepSearchPage[]>([])
    const [isDeepSearching, setIsDeepSearching] = useState(false)

    return useMutation({
        mutationFn: async (request: {
            query: string
            deepSearch?: { maxPages?: number }
            maxResults?: number
            type?: 'web' | 'news' | 'academic'
            useWebSocket?: boolean
        }) => {
            const { deepSearch: deepSearchConfig, useWebSocket = false, ...searchOptions } = request

            // Perform web search
            const response = await searchWeb(request.query, {
                ...searchOptions,
                type: searchOptions.type,
                maxResults: searchOptions.maxResults,
            })
            setResults(response.search.results)

            // If deep search requested with WebSocket, handle it separately
            if (deepSearchConfig && useWebSocket) {
                setIsDeepSearching(true)
                // WebSocket handling will be done via useDeepSearchWithSocket hook
                // This flag indicates that the component should use the WebSocket hook
                return response
            }

            // If deep search requested without WebSocket (fallback), do standard HTTP
            if (deepSearchConfig && !useWebSocket) {
                setIsDeepSearching(true)
                try {
                    const deepSearchResponse = await deepSearchWeb(request.query, {
                        maxPages: deepSearchConfig.maxPages,
                    })
                    setDeepSearchPages(deepSearchResponse.deepSearch?.pages || [])
                } finally {
                    setIsDeepSearching(false)
                }
            }

            return response
        },
        onSuccess: (data) => {
            setResults(data.search.results)
            // Invalidate history and stats after successful search
            queryClient.invalidateQueries({ queryKey: webSearchKeys.history() })
            queryClient.invalidateQueries({ queryKey: webSearchKeys.statistics() })
        },
    })
}// Hook: Get search history
export function useSearchHistory(options?: { limit?: number; offset?: number }) {
    return useQuery({
        queryKey: [...webSearchKeys.history(), options],
        queryFn: () => getSearchHistory(options),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Hook: Get search statistics
export function useSearchStatistics() {
    return useQuery({
        queryKey: webSearchKeys.statistics(),
        queryFn: getSearchStatistics,
        staleTime: 10 * 60 * 1000, // 10 minutes
    })
}

// Hook: Cleanup old search results
export function useCleanupSearchResults() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => cleanupSearches(),
        onSuccess: () => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: webSearchKeys.history() })
            queryClient.invalidateQueries({ queryKey: webSearchKeys.statistics() })
        },
    })
}// Hook: Create/manage recurring searches
export function useRecurringSearch() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (request: RecurringSearchRequest) => createRecurringSearch(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: webSearchKeys.recurring() })
        },
    })
}

// Hook: Stream deep search progress via WebSocket
export function useDeepSearchProgress(
    sessionId?: string,
    onProgress?: (progress: {
        totalPages: number
        completedPages: number
        currentPage?: string
        status: 'pending' | 'processing' | 'completed' | 'failed'
    }) => void
) {
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const connect = useCallback(async (token: string) => {
        if (!sessionId) {
            setError('No session ID provided')
            return
        }

        try {
            // Open WebSocket connection to progress endpoint
            const wsUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/^http/, 'ws')
            if (!wsUrl) throw new Error('API URL not configured')

            const ws = new WebSocket(`${wsUrl}/api/v1/insights/deep-search/${sessionId}/progress?token=${token}`)

            ws.onopen = () => {
                setIsConnected(true)
                setError(null)
            }

            ws.onmessage = (event) => {
                try {
                    const progress = JSON.parse(event.data)
                    onProgress?.(progress)
                } catch (err) {
                    const errorObj = err instanceof Error ? err : new Error(String(err))
                    trackException(errorObj, 3)
                    trackTrace('[WebSocket] Failed to parse message in web search', 3, {
                        errorMessage: errorObj.message,
                    })
                }
            }

            ws.onerror = () => {
                setError('WebSocket connection error')
            }

            ws.onclose = () => {
                setIsConnected(false)
            }

            return ws
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to connect'
            setError(message)
        }
    }, [sessionId, onProgress])

    return { isConnected, error, connect }
}

/**
 * Hook: Deep search with real-time WebSocket progress updates
 * Manages WebSocket connection lifecycle and streams scraping progress
 */
export function useDeepSearchWithSocket() {
    const queryClient = useQueryClient()
    const [progressEvents, setProgressEvents] = useState<ScrapingProgressEvent[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const socketRef = useRef<WebSocket | null>(null)
    const reconnectAttemptsRef = useRef(0)
    const MAX_RECONNECT_ATTEMPTS = 3

    const executeDeepSearch = useCallback(
        (
            query: string,
            options?: { maxPages?: number },
            onComplete?: (results: SearchResponsePayload) => void
        ) => {
            setProgressEvents([])
            setError(null)
            reconnectAttemptsRef.current = 0

            // Open WebSocket connection
            socketRef.current = openDeepSearchSocket(
                query,
                options || {},
                {
                    onProgress: (progress) => {
                        setProgressEvents((prev) => [...prev, progress])
                    },
                    onComplete: (payload) => {
                        setIsConnected(false)
                        onComplete?.(payload)
                        // Invalidate related queries
                        queryClient.invalidateQueries({
                            queryKey: webSearchKeys.history(),
                        })
                        queryClient.invalidateQueries({
                            queryKey: webSearchKeys.statistics(),
                        })
                        toast.success('Deep search completed successfully')
                    },
                    onError: (message) => {
                        setError(message)
                        setIsConnected(false)
                        toast.error(`Deep search error: ${message}`)

                        // Attempt reconnection
                        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                            reconnectAttemptsRef.current++
                            setTimeout(() => {
                                executeDeepSearch(query, options, onComplete)
                            }, 1000 * reconnectAttemptsRef.current)
                        }
                    },
                }
            )

            setIsConnected(true)

            return socketRef.current
        },
        [queryClient]
    )

    const cancelSearch = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close()
            socketRef.current = null
        }
        setIsConnected(false)
        setProgressEvents([])
    }, [])

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.close()
                socketRef.current = null
            }
        }
    }, [])

    return {
        executeDeepSearch,
        cancelSearch,
        progressEvents,
        isConnected,
        error,
        latestProgress: progressEvents[progressEvents.length - 1],
    }
}

// Hook: Combined search with all context
export function useWebSearchWithContext() {
    const search = useWebSearch()
    const history = useSearchHistory()
    const stats = useSearchStatistics()
    const cleanup = useCleanupSearchResults()
    const recurring = useRecurringSearch()
    const deepSearchSocket = useDeepSearchWithSocket()

    return {
        search,
        history,
        stats,
        cleanup,
        recurring,
        deepSearchSocket,
        isLoading: search.isPending || history.isLoading || stats.isLoading,
        error: search.error || history.error || stats.error,
    }
}
