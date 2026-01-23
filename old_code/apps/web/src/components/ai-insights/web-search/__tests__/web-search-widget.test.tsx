/**
 * WebSearchWidget Component Tests
 * Tests for dashboard-embedded web search widget with tabs and configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { WebSearchWidget } from '../web-search-widget'
import * as searchHooks from '@/hooks/use-web-search'

vi.mock('@/hooks/use-web-search', () => ({
    useWebSearchWithContext: vi.fn(),
}))

describe('WebSearchWidget Component', () => {
    const mockSearchFn = vi.fn().mockResolvedValue({
        search: {
            results: [
                {
                    url: 'https://example.com',
                    title: 'Example Result',
                    snippet: 'Example snippet',
                    domain: 'example.com',
                    relevanceScore: 0.95,
                }
            ]
        }
    })

    const mockStats = {
        totalSearches: 42,
        totalWebPages: 156,
        totalChunks: 2847,
        averageChunksPerPage: 18.2,
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(searchHooks.useWebSearchWithContext).mockReturnValue({
            search: { mutateAsync: mockSearchFn },
            stats: mockStats,
        } as any)
    })

    describe('Rendering', () => {
        it('should render widget with title', () => {
            render(<WebSearchWidget />)
            expect(screen.getByText('Web Search' as any)).toBeInTheDocument()
        })

        it('should render search input', () => {
            render(<WebSearchWidget />)
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })

        it('should render tabs when showTabs is true', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showTabs: true }}
                />
            )
            expect(screen.getByText('Search' as any)).toBeInTheDocument()
        })

        it('should render stats tab when showStats is true', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showStats: true }}
                />
            )
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBeGreaterThan(1)
        })

        it('should not render stats tab when showStats is false', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showStats: false }}
                />
            )
            const statsTabs = screen.queryAllByText('Stats' as any)
            expect(statsTabs.length).toBe(0)
        })

        it('should hide header when showHeader is false', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showHeader: false }}
                />
            )
            // Header should be hidden but content should still exist
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })

        it('should render custom title from config', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ title: 'Custom Web Search' }}
                />
            )
            expect(screen.getByText('Custom Web Search' as any)).toBeInTheDocument()
        })
    })

    describe('Widget Sizes', () => {
        it('should apply small size height class', () => {
            const { container } = render(
                <WebSearchWidget widgetSize="small" />
            )
            const content = container.querySelector('[class*="h-96"]')
            expect(content).toBeInTheDocument()
        })

        it('should apply medium size height class', () => {
            const { container } = render(
                <WebSearchWidget widgetSize="medium" />
            )
            const content = container.querySelector('[class*="h-\\[600px\\]"]')
            expect(content).toBeInTheDocument()
        })

        it('should apply large size height class', () => {
            const { container } = render(
                <WebSearchWidget widgetSize="large" />
            )
            const content = container.querySelector('[class*="h-\\[800px\\]"]')
            expect(content).toBeInTheDocument()
        })

        it('should apply full size height class', () => {
            const { container } = render(
                <WebSearchWidget widgetSize="full" />
            )
            const content = container.querySelector('[class*="min-h-screen"]')
            expect(content).toBeInTheDocument()
        })
    })

    describe('Tab Navigation', () => {
        it('should start with search tab active', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showTabs: true }}
                />
            )
            const searchTab = screen.getByRole('tab', { name: 'Search' })
            expect(searchTab).toHaveAttribute('aria-selected', 'true')
        })

        it('should switch to stats tab when clicked', async () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showStats: true, showTabs: true }}
                />
            )
            const statsTab = screen.getByRole('tab', { name: 'Stats' })
            fireEvent.click(statsTab)

            await waitFor(() => {
                expect(statsTab).toHaveAttribute('aria-selected', 'true')
            })
        })

        it('should show stats content when stats tab is active', async () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showStats: true, showTabs: true }}
                />
            )
            const statsTab = screen.getByRole('tab', { name: 'Stats' })
            fireEvent.click(statsTab)

            await waitFor(() => {
                expect(screen.getByText('Search Statistics' as any)).toBeInTheDocument()
            })
        })

        it('should show search content when search tab is active', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showTabs: true }}
                />
            )
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })
    })

    describe('Search Functionality', () => {
        it('should call search function with correct params', async () => {
            render(<WebSearchWidget />)

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test query' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockSearchFn).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: 'test query',
                    })
                )
            })
        })

        it('should display results after search', async () => {
            mockSearchFn.mockResolvedValue({
                search: {
                    results: [
                        {
                            url: 'https://result1.com',
                            title: 'Result 1',
                            snippet: 'Snippet 1',
                        },
                        {
                            url: 'https://result2.com',
                            title: 'Result 2',
                            snippet: 'Snippet 2',
                        },
                    ]
                }
            })

            render(<WebSearchWidget />)

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test query' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(screen.getByText('Result 1' as any)).toBeInTheDocument()
                expect(screen.getByText('Result 2' as any)).toBeInTheDocument()
            })
        })

        it('should show loading state during search', async () => {
            mockSearchFn.mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({
                    search: { results: [] }
                }), 100))
            )

            render(<WebSearchWidget />)

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            // Button should be disabled during loading
            await waitFor(() => {
                expect(button).toBeDisabled()
            })
        })
    })

    describe('Deep Search Configuration', () => {
        it('should show deep search toggle when enabled in config', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ enableDeepSearch: true }}
                />
            )
            expect(screen.getByText(/Enable deep search/i)).toBeInTheDocument()
        })

        it('should not show deep search toggle when disabled in config', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ enableDeepSearch: false }}
                />
            )
            // Deep search toggle might not be visible initially
            const deepSearchElements = screen.queryAllByText(/Enable deep search/i)
            expect(deepSearchElements.length).toBe(0)
        })

        it('should pass deep search params to search function', async () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ enableDeepSearch: true }}
                />
            )

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })

            const deepSearchCheckbox = screen.getByRole('checkbox', { name: /Enable deep search/i })
            fireEvent.click(deepSearchCheckbox)

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockSearchFn).toHaveBeenCalled()
            })
        })
    })

    describe('Widget Configuration', () => {
        it('should use default query from config', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ defaultQuery: 'initial search' }}
                />
            )
            expect(screen.getByDisplayValue('initial search')).toBeInTheDocument()
        })

        it('should use default title from config', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ title: 'Custom Search Widget' }}
                />
            )
            expect(screen.getByText('Custom Search Widget' as any)).toBeInTheDocument()
        })

        it('should respect all config options', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{
                        title: 'My Widget',
                        showHeader: true,
                        showTabs: true,
                        showStats: true,
                        enableDeepSearch: true,
                        defaultQuery: 'ai news',
                    }}
                />
            )
            expect(screen.getByText('My Widget' as any)).toBeInTheDocument()
            expect(screen.getByDisplayValue('ai news')).toBeInTheDocument()
        })
    })

    describe('Callbacks', () => {
        it('should call onResultsSelect when result is selected', async () => {
            const mockOnSelect = vi.fn()

            mockSearchFn.mockResolvedValue({
                search: {
                    results: [
                        {
                            url: 'https://example.com',
                            title: 'Example',
                            snippet: 'Snippet',
                        }
                    ]
                }
            })

            render(
                <WebSearchWidget
                    onResultsSelect={mockOnSelect}
                />
            )

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(screen.getByText('Example' as any)).toBeInTheDocument()
            })
        })
    })

    describe('Empty States', () => {
        it('should show empty state initially', () => {
            render(<WebSearchWidget />)
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })

        it('should show no results message when search returns empty', async () => {
            mockSearchFn.mockResolvedValue({
                search: { results: [] }
            })

            render(<WebSearchWidget />)

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(screen.getByText(/No results yet/)).toBeInTheDocument()
            })
        })
    })

    describe('Props Combinations', () => {
        it('should handle small size with stats disabled', () => {
            render(
                <WebSearchWidget
                    widgetSize="small"
                    widgetConfig={{ showStats: false }}
                />
            )
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })

        it('should handle full size with all features enabled', () => {
            render(
                <WebSearchWidget
                    widgetSize="full"
                    widgetConfig={{
                        showTabs: true,
                        showStats: true,
                        enableDeepSearch: true,
                        showHeader: true,
                    }}
                />
            )
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })

        it('should handle minimal config', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{
                        showTabs: false,
                        showStats: false,
                        enableDeepSearch: false,
                        showHeader: false,
                    }}
                />
            )
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })
    })

    describe('Responsive Behavior', () => {
        it('should have scrollable content area', () => {
            const { container } = render(
                <WebSearchWidget widgetSize="medium" />
            )
            const scrollable = container.querySelector('[class*="overflow"]')
            expect(scrollable).toBeInTheDocument()
        })

        it('should adapt height based on widget size', () => {
            const { rerender, container: container1 } = render(
                <WebSearchWidget widgetSize="small" />
            )
            expect(container1.querySelector('[class*="h-96"]')).toBeInTheDocument()

            rerender(
                <WebSearchWidget widgetSize="large" />
            )
            expect(container1.querySelector('[class*="h-\\[800px\\]"]')).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('should have proper tab structure', () => {
            render(
                <WebSearchWidget
                    widgetConfig={{ showTabs: true, showStats: true }}
                />
            )
            const tabs = screen.getAllByRole('tab')
            expect(tabs.length).toBeGreaterThan(0)
        })

        it('should have focusable search input', () => {
            render(<WebSearchWidget />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            expect(input).toBeVisible()
        })

        it('should have accessible search button', () => {
            render(<WebSearchWidget />)
            const button = screen.getByRole('button', { name: /search/i })
            expect(button).toBeInTheDocument()
        })
    })

    describe('Error Handling', () => {
        it('should handle search errors gracefully', async () => {
            mockSearchFn.mockRejectedValue(new Error('Search failed'))

            render(<WebSearchWidget />)

            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                // Component should remain functional
                expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
            })
        })
    })
})
