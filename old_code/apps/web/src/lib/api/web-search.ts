import { apiClient, ensureAuth, handleApiError } from './client'
import { env } from '@/lib/env'
import type {
    SearchResponsePayload,
    SearchType,
    SearchHistoryItem,
    SearchStatistics,
    RecurringSearchRequest,
    RecurringSearchResponse,
    ScrapingProgressEvent,
} from '@/types/web-search'

export interface SearchOptions {
    type?: SearchType
    maxResults?: number
    useCache?: boolean
    forceRefresh?: boolean
}

export interface DeepSearchOptions extends SearchOptions {
    maxPages?: number
}

export async function searchWeb(query: string, options?: SearchOptions): Promise<SearchResponsePayload> {
    await ensureAuth()
    try {
        const { data } = await apiClient.post<SearchResponsePayload>('/api/v1/search', {
            q: query,
            type: options?.type || 'web',
            maxResults: options?.maxResults ?? 10,
            useCache: options?.useCache ?? true,
            forceRefresh: options?.forceRefresh,
        })
        return data
    } catch (error) {
        const message = handleApiError(error);
        throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred')
    }
}

export async function deepSearchWeb(query: string, options?: DeepSearchOptions): Promise<SearchResponsePayload> {
    await ensureAuth()
    try {
        const { data } = await apiClient.post<SearchResponsePayload>('/api/v1/search/deep', {
            q: query,
            type: options?.type || 'web',
            maxResults: options?.maxResults ?? 10,
            maxPages: options?.maxPages ?? 3,
        })
        return data
    } catch (error) {
        const message = handleApiError(error);
        throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred')
    }
}

export async function getSearchHistory(params?: { limit?: number; offset?: number }): Promise<{
    searches: SearchHistoryItem[]
    total: number
    limit: number
    offset: number
}> {
    await ensureAuth()
    try {
        const { data } = await apiClient.get('/api/v1/search/history', {
            params: {
                limit: params?.limit ?? 20,
                offset: params?.offset ?? 0,
            },
        })
        return data
    } catch (error) {
        const message = handleApiError(error);
        throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred')
    }
}

export async function getSearchStatistics(): Promise<SearchStatistics> {
    await ensureAuth()
    try {
        const { data } = await apiClient.get<SearchStatistics>('/api/v1/search/stats')
        return data
    } catch (error) {
        const message = handleApiError(error);
        throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred')
    }
}

export async function cleanupSearches(): Promise<{ deletedCount: number; message: string }> {
    await ensureAuth()
    try {
        const { data } = await apiClient.post('/api/v1/search/cleanup' as any)
        return data
    } catch (error) {
        const message = handleApiError(error);
        throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred')
    }
}

export async function createRecurringSearch(
    payload: RecurringSearchRequest
): Promise<RecurringSearchResponse> {
    await ensureAuth()
    try {
        const { data } = await apiClient.post<RecurringSearchResponse>('/api/v1/recurring-search', payload)
        return data
    } catch (error) {
        const message = handleApiError(error);
        throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred')
    }
}

export function openDeepSearchSocket(
    query: string,
    options: { maxPages?: number },
    handlers: {
        onProgress?: (progress: ScrapingProgressEvent) => void
        onComplete?: (payload: SearchResponsePayload) => void
        onError?: (message: string) => void
    }
): WebSocket {
    // Build WS URL from base
    const base = env.NEXT_PUBLIC_API_BASE_URL?.replace(/^http/, 'ws') || ''
    const url = new URL('/api/v1/search/deep/ws', base)
    url.searchParams.set('q', query)
    if (options.maxPages) {
        url.searchParams.set('maxPages', String(options.maxPages))
    }

    const socket = new WebSocket(url.toString())

    socket.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data)
            if (parsed.type === 'progress') {
                handlers.onProgress?.(parsed.data as ScrapingProgressEvent)
            } else if (parsed.type === 'complete') {
                handlers.onComplete?.(parsed.data as SearchResponsePayload)
                socket.close()
            } else if (parsed.type === 'error') {
                handlers.onError?.(parsed.error as string)
                socket.close()
            }
        } catch (err) {
            handlers.onError?.('Failed to parse progress message')
        }
    }

    socket.onerror = () => {
        handlers.onError?.('WebSocket connection failed')
    }

    return socket
}
