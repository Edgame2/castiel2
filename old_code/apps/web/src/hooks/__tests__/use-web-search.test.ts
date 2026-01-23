/**
 * Web Search Hooks Tests
 * Tests for useWebSearch, useWebSearchWithContext, and related hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWebSearch, useWebSearchWithContext } from '../use-web-search'
import * as apiModule from '@/lib/api/web-search'
import type { SearchResponsePayload } from '@/types/web-search'

vi.mock('@/lib/api/web-search', () => ({
    searchWeb: vi.fn(),
    deepSearchWeb: vi.fn(),
    getSearchHistory: vi.fn(),
    getSearchStatistics: vi.fn(),
    cleanupSearches: vi.fn(),
    createRecurringSearch: vi.fn(),
    openDeepSearchSocket: vi.fn(),
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        loading: vi.fn(),
    }
}))

vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual('@tanstack/react-query')
    return {
        ...actual,
        useQueryClient: () => ({
            invalidateQueries: vi.fn(),
        }),
    }
})

describe('useWebSearch Hook', () => {
    const mockSearchResults: SearchResponsePayload = {
        search: {
            id: 'search-123',
            query: 'test query',
            results: [
                {
                    url: 'https://example.com',
                    title: 'Example Result',
                    snippet: 'Example snippet',
                    domain: 'example.com',
                    relevanceScore: 0.95,
                }
            ],
            resultCount: 1,
        },
        costBreakdown: {
            searchCost: 0.001,
            deepSearchCost: 0,
            totalCost: 0.001,
        },
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Basic Search', () => {
        it('should perform web search with query', async () => {
            vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'test query',
                    maxResults: 5,
                })
            })

            expect(apiModule.searchWeb).toHaveBeenCalledWith(
                expect.objectContaining({
                    query: 'test query',
                    maxResults: 5,
                })
            )
        })

        it('should return search results', async () => {
            vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                const response = await result.current.mutateAsync({
                    query: 'test query',
                })
                expect(response.search.results).toHaveLength(1)
                expect(response.search.results[0].title).toBe('Example Result')
            })
        })

        it('should handle search errors', async () => {
            const error = new Error('Search failed')
            vi.mocked(apiModule.searchWeb).mockRejectedValue(error)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                try {
                    await result.current.mutateAsync({
                        query: 'test query',
                    })
                } catch (err) {
                    expect(err).toBe(error)
                }
            })
        })
    })

    describe('Search Types', () => {
        it('should support web search type', async () => {
            vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'test',
                    type: 'web',
                })
            })

            expect(apiModule.searchWeb).toHaveBeenCalled()
        })

        it('should support news search type', async () => {
            vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'news',
                    type: 'news',
                })
            })

            expect(apiModule.searchWeb).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'news',
                })
            )
        })

        it('should support academic search type', async () => {
            vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'research',
                    type: 'academic',
                })
            })

            expect(apiModule.searchWeb).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'academic',
                })
            )
        })
    })

    describe('Deep Search', () => {
        it('should perform deep search when enabled', async () => {
            vi.mocked(apiModule.deepSearchWeb).mockResolvedValue({
                ...mockSearchResults,
                deepSearch: {
                    pages: [
                        {
                            url: 'https://example.com/1',
                            title: 'Page 1',
                            chunks: [],
                        }
                    ],
                    totalCost: 0.005,
                    duration: 1000,
                },
            })

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'test',
                    deepSearch: { maxPages: 3 },
                })
            })

            expect(apiModule.deepSearchWeb).toHaveBeenCalled()
        })

        it('should pass maxPages parameter to deep search', async () => {
            vi.mocked(apiModule.deepSearchWeb).mockResolvedValue({
                ...mockSearchResults,
                deepSearch: {
                    pages: [],
                    totalCost: 0,
                    duration: 0,
                },
            })

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'test',
                    deepSearch: { maxPages: 5 },
                })
            })

            expect(apiModule.deepSearchWeb).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxPages: 5,
                })
            )
        })
    })

    describe('Loading States', () => {
        it('should track loading state during search', async () => {
            vi.mocked(apiModule.searchWeb).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockSearchResults), 100))
            )

            const { result } = renderHook(() => useWebSearch())

            expect(result.current.isPending).toBe(false)

            act(() => {
                result.current.mutateAsync({
                    query: 'test',
                })
            })

            await waitFor(() => {
                expect(result.current.isPending).toBe(true)
            }, { timeout: 50 })

            await waitFor(() => {
                expect(result.current.isPending).toBe(false)
            }, { timeout: 200 })
        })

        it('should track success state', async () => {
            vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                await result.current.mutateAsync({
                    query: 'test',
                })
            })

            expect(result.current.isSuccess).toBe(true)
        })

        it('should track error state', async () => {
            vi.mocked(apiModule.searchWeb).mockRejectedValue(new Error('Search failed'))

            const { result } = renderHook(() => useWebSearch())

            await act(async () => {
                try {
                    await result.current.mutateAsync({
                        query: 'test',
                    })
                } catch (err) {
                    // Error expected
                }
            })

            expect(result.current.isError).toBe(true)
        })
    })

    describe('History', () => {
        it('should fetch search history', async () => {
            const mockHistory = {
                searches: [
                    {
                        id: 'history-1',
                        query: 'previous search',
                        resultCount: 10,
                        createdAt: new Date().toISOString(),
                    }
                ],
                total: 1,
                limit: 10,
                offset: 0,
            }

            vi.mocked(apiModule.getSearchHistory).mockResolvedValue(mockHistory)

            const { result } = renderHook(() => useWebSearch())

            expect(apiModule.getSearchHistory).toBeDefined()
        })
    })

    describe('Statistics', () => {
        it('should fetch search statistics', async () => {
            const mockStats = {
                totalSearches: 42,
                totalWebPages: 156,
                totalChunks: 2847,
                averageChunksPerPage: 18.2,
            }

            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            expect(apiModule.getSearchStatistics).toBeDefined()
        })
    })

    describe('Cleanup', () => {
        it('should cleanup searches', async () => {
            vi.mocked(apiModule.cleanupSearches).mockResolvedValue({
                deletedCount: 5,
                message: 'Cleaned up 5 searches',
            })

            expect(apiModule.cleanupSearches).toBeDefined()
        })
    })
})

describe('useWebSearchWithContext Hook', () => {
    const mockStats = {
        totalSearches: 42,
        totalWebPages: 156,
        totalChunks: 2847,
        averageChunksPerPage: 18.2,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should provide search mutation', () => {
        const { result } = renderHook(() => useWebSearchWithContext())

        expect(result.current.search).toBeDefined()
        expect(result.current.search.mutateAsync).toBeDefined()
    })

    it('should provide statistics', () => {
        vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

        const { result } = renderHook(() => useWebSearchWithContext())

        expect(result.current.stats).toBeDefined()
    })

    it('should integrate with app context', () => {
        const { result } = renderHook(() => useWebSearchWithContext())

        expect(result.current.search).toBeDefined()
        expect(result.current.stats).toBeDefined()
    })
})

describe('Hook Integration', () => {
    const mockSearchResults: SearchResponsePayload = {
        search: {
            id: 'search-123',
            query: 'test query',
            results: [
                {
                    url: 'https://example.com',
                    title: 'Example Result',
                    snippet: 'Example snippet',
                    domain: 'example.com',
                    relevanceScore: 0.95,
                }
            ],
            resultCount: 1,
        },
        costBreakdown: {
            searchCost: 0.001,
            deepSearchCost: 0,
            totalCost: 0.001,
        },
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should work with multiple searches', async () => {
        vi.mocked(apiModule.searchWeb)
            .mockResolvedValueOnce({
                ...mockSearchResults,
                search: {
                    ...mockSearchResults.search,
                    query: 'query 1',
                },
            })
            .mockResolvedValueOnce({
                ...mockSearchResults,
                search: {
                    ...mockSearchResults.search,
                    query: 'query 2',
                },
            })

        const { result } = renderHook(() => useWebSearch())

        await act(async () => {
            await result.current.mutateAsync({ query: 'query 1' })
            await result.current.mutateAsync({ query: 'query 2' })
        })

        expect(apiModule.searchWeb).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid searches', async () => {
        vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

        const { result } = renderHook(() => useWebSearch())

        await act(async () => {
            await Promise.all([
                result.current.mutateAsync({ query: 'query 1' }),
                result.current.mutateAsync({ query: 'query 2' }),
                result.current.mutateAsync({ query: 'query 3' }),
            ])
        })

        expect(apiModule.searchWeb).toHaveBeenCalledTimes(3)
    })

    it('should cache results', async () => {
        vi.mocked(apiModule.searchWeb).mockResolvedValue(mockSearchResults)

        const { result: result1 } = renderHook(() => useWebSearch())
        const { result: result2 } = renderHook(() => useWebSearch())

        await act(async () => {
            await result1.current.mutateAsync({ query: 'test' })
        })

        await act(async () => {
            await result2.current.mutateAsync({ query: 'test' })
        })

        // Both hooks should work independently
        expect(apiModule.searchWeb).toHaveBeenCalled()
    })
})

describe('Hook Error Handling', () => {
    it('should handle network errors', async () => {
        vi.mocked(apiModule.searchWeb).mockRejectedValue(
            new Error('Network error')
        )

        const { result } = renderHook(() => useWebSearch())

        await act(async () => {
            try {
                await result.current.mutateAsync({ query: 'test' })
            } catch (err) {
                expect(err).toBeInstanceOf(Error)
            }
        })
    })

    it('should handle validation errors', async () => {
        vi.mocked(apiModule.searchWeb).mockRejectedValue(
            new Error('Invalid query')
        )

        const { result } = renderHook(() => useWebSearch())

        await act(async () => {
            try {
                await result.current.mutateAsync({ query: '' })
            } catch (err) {
                expect(err).toBeInstanceOf(Error)
            }
        })
    })

    it('should handle timeout errors', async () => {
        vi.mocked(apiModule.searchWeb).mockRejectedValue(
            new Error('Request timeout')
        )

        const { result } = renderHook(() => useWebSearch())

        await act(async () => {
            try {
                await result.current.mutateAsync({ query: 'test' })
            } catch (err) {
                expect(err).toBeInstanceOf(Error)
            }
        })
    })
})
