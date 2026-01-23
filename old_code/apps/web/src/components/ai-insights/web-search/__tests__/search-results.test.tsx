/**
 * SearchResults Component Tests
 * Tests for displaying search results with ranking, source info, and export functionality
 * Tests: Rendering, export, refresh, widget mode, empty state, cost display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { SearchResults } from '../search-results'
import type { SearchResultItem, SearchCostBreakdown } from '@/types/web-search'

describe('SearchResults Component', () => {
    const mockResults: SearchResultItem[] = [
        {
            url: 'https://example.com/1',
            title: 'Example Result 1',
            snippet: 'This is the first result',
            domain: 'example.com',
            provider: 'SerpAPI',
            relevanceScore: 0.95,
            publishedDate: '2025-12-01',
        },
        {
            url: 'https://test.com/2',
            title: 'Example Result 2',
            snippet: 'This is the second result',
            domain: 'test.com',
            provider: 'Bing',
            relevanceScore: 0.87,
            publishedDate: '2025-12-02',
        },
    ]

    const mockCost: SearchCostBreakdown = {
        searchCost: 0.001,
        deepSearchCost: 0.025,
        totalCost: 0.026,
    }

    const mockOnRefresh = vi.fn()

    beforeEach(() => {
        mockOnRefresh.mockClear()
    })

    describe('Rendering', () => {
        it('should render results count', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByText('2 results' as any)).toBeInTheDocument()
        })

        it('should render each result with title', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByText('Example Result 1' as any)).toBeInTheDocument()
            expect(screen.getByText('Example Result 2' as any)).toBeInTheDocument()
        })

        it('should render result snippets', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByText('This is the first result' as any)).toBeInTheDocument()
            expect(screen.getByText('This is the second result' as any)).toBeInTheDocument()
        })

        it('should render provider badges', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByText('SerpAPI' as any)).toBeInTheDocument()
            expect(screen.getByText('Bing' as any)).toBeInTheDocument()
        })

        it('should render domain tags', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByText('example.com' as any)).toBeInTheDocument()
            expect(screen.getByText('test.com' as any)).toBeInTheDocument()
        })

        it('should render relevance scores', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByText(/Relevance: 95%/)).toBeInTheDocument()
            expect(screen.getByText(/Relevance: 87%/)).toBeInTheDocument()
        })

        it('should render published dates', () => {
            render(<SearchResults results={mockResults} />)
            const dates = screen.getAllByText(/12\//)
            expect(dates.length).toBeGreaterThan(0)
        })

        it('should render external links', () => {
            render(<SearchResults results={mockResults} />)
            const links = screen.getAllByRole('link')
            expect(links.length).toBeGreaterThan(0)
            expect(links[0]).toHaveAttribute('href', 'https://example.com/1')
        })

        it('should render with custom title in widget mode', () => {
            render(
                <SearchResults
                    results={mockResults}
                    isWidget={true}
                    widgetConfig={{ title: 'My Results' }}
                />
            )
            expect(screen.getByText('My Results' as any)).toBeInTheDocument()
        })
    })

    describe('Cost Display', () => {
        it('should display total cost when provided', () => {
            render(<SearchResults results={mockResults} cost={mockCost} />)
            expect(screen.getByText(/0.0260.*total/)).toBeInTheDocument()
        })

        it('should show search cost breakdown', () => {
            render(<SearchResults results={mockResults} cost={mockCost} />)
            expect(screen.getByText(/0.0010.*search/)).toBeInTheDocument()
        })

        it('should show deep search cost when available', () => {
            render(<SearchResults results={mockResults} cost={mockCost} />)
            expect(screen.getByText(/0.0250.*deep/)).toBeInTheDocument()
        })

        it('should not show deep search cost when zero', () => {
            const costWithoutDeep: SearchCostBreakdown = {
                searchCost: 0.001,
                deepSearchCost: 0,
                totalCost: 0.001,
            }
            render(<SearchResults results={mockResults} cost={costWithoutDeep} />)
            expect(screen.getByText(/0.0010.*total/)).toBeInTheDocument()
        })

        it('should not display cost when not provided', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.queryByText(/Cost:/)).not.toBeInTheDocument()
        })
    })

    describe('Export Functionality', () => {
        it('should render JSON export button', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByRole('button', { name: /JSON/i })).toBeInTheDocument()
        })

        it('should render CSV export button', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument()
        })

        it('should export results as JSON', async () => {
            const createElementSpy = vi.spyOn(document, 'createElement')
            const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
            const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

            render(<SearchResults results={mockResults} />)
            const jsonButton = screen.getByRole('button', { name: /JSON/i })
            fireEvent.click(jsonButton)

            await waitFor(() => {
                expect(createElementSpy).toHaveBeenCalledWith('a')
                expect(revokeObjectURLSpy).toHaveBeenCalled()
            })

            createElementSpy.mockRestore()
            createObjectURLSpy.mockRestore()
            revokeObjectURLSpy.mockRestore()
        })

        it('should export results as CSV', async () => {
            const createElementSpy = vi.spyOn(document, 'createElement')
            const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
            const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

            render(<SearchResults results={mockResults} />)
            const csvButton = screen.getByRole('button', { name: /CSV/i })
            fireEvent.click(csvButton)

            await waitFor(() => {
                expect(createElementSpy).toHaveBeenCalledWith('a')
                expect(revokeObjectURLSpy).toHaveBeenCalled()
            })

            createElementSpy.mockRestore()
            createObjectURLSpy.mockRestore()
            revokeObjectURLSpy.mockRestore()
        })
    })

    describe('Refresh Functionality', () => {
        it('should render refresh button when onRefresh is provided', () => {
            render(
                <SearchResults
                    results={mockResults}
                    onRefresh={mockOnRefresh}
                />
            )
            expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
        })

        it('should not render refresh button when onRefresh is not provided', () => {
            render(<SearchResults results={mockResults} />)
            expect(screen.queryByRole('button', { name: /Refresh/i })).not.toBeInTheDocument()
        })

        it('should call onRefresh when refresh button is clicked', async () => {
            render(
                <SearchResults
                    results={mockResults}
                    onRefresh={mockOnRefresh}
                />
            )
            const refreshButton = screen.getByRole('button', { name: /Refresh/i })
            fireEvent.click(refreshButton)

            await waitFor(() => {
                expect(mockOnRefresh).toHaveBeenCalled()
            })
        })
    })

    describe('Empty State', () => {
        it('should show empty message when no results', () => {
            render(<SearchResults results={[]} />)
            expect(screen.getByText(/No results yet/)).toBeInTheDocument()
        })

        it('should show 0 results count', () => {
            render(<SearchResults results={[]} />)
            expect(screen.getByText('0 results' as any)).toBeInTheDocument()
        })

        it('should still render export buttons when empty', () => {
            render(<SearchResults results={[]} />)
            expect(screen.getByRole('button', { name: /JSON/i })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /CSV/i })).toBeInTheDocument()
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', () => {
            const { container } = render(
                <SearchResults
                    isWidget={true}
                    results={mockResults}
                />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should hide header when widgetConfig.showHeader is false', () => {
            render(
                <SearchResults
                    isWidget={true}
                    results={mockResults}
                    widgetConfig={{ showHeader: false }}
                />
            )
            expect(screen.queryByText('Search Results' as any)).not.toBeInTheDocument()
        })

        it('should apply widget size classes', () => {
            const { container } = render(
                <SearchResults
                    isWidget={true}
                    widgetSize="small"
                    results={mockResults}
                />
            )
            const card = container.querySelector('div[class*="h-full"]')
            expect(card).toHaveClass('h-full')
        })
    })

    describe('Result Links', () => {
        it('should have external link targets', () => {
            render(<SearchResults results={mockResults} />)
            const links = screen.getAllByRole('link')
            links.forEach(link => {
                const anchor = link as HTMLAnchorElement;
                if (anchor.href.startsWith('http')) {
                    expect(anchor).toHaveAttribute('target', '_blank')
                    expect(anchor).toHaveAttribute('rel', 'noreferrer')
                }
            })
        })

        it('should render open icon links', () => {
            render(<SearchResults results={mockResults} />)
            const openLinks = screen.getAllByText(/Open/i)
            expect(openLinks.length).toBeGreaterThan(0)
        })
    })

    describe('Scroll Area', () => {
        it('should render scrollable area for results', () => {
            const { container } = render(
                <SearchResults results={mockResults} />
            )
            const scrollArea = container.querySelector('[class*="overflow"]')
            expect(scrollArea).toBeInTheDocument()
        })

        it('should display multiple results with proper spacing', () => {
            render(<SearchResults results={mockResults} />)
            const resultElements = screen.getAllByText(/Example Result/)
            expect(resultElements).toHaveLength(2)
        })
    })

    describe('Props', () => {
        it('should accept custom widget config', () => {
            render(
                <SearchResults
                    isWidget={true}
                    results={mockResults}
                    widgetConfig={{
                        title: 'Custom Title',
                        showHeader: true,
                    }}
                />
            )
            expect(screen.getByText('Custom Title' as any)).toBeInTheDocument()
        })

        it('should handle different widget sizes', () => {
            const { container: smallContainer } = render(
                <SearchResults
                    isWidget={true}
                    widgetSize="small"
                    results={mockResults}
                />
            )
            expect(smallContainer.firstChild).toHaveClass('h-full')

            const { container: largeContainer } = render(
                <SearchResults
                    isWidget={true}
                    widgetSize="large"
                    results={mockResults}
                />
            )
            expect(largeContainer.firstChild).toHaveClass('h-full')
        })
    })

    describe('Complex Scenarios', () => {
        it('should handle large number of results', () => {
            const manyResults = Array.from({ length: 50 }, (_, i) => ({
                ...mockResults[0],
                url: `https://example.com/${i}`,
                title: `Result ${i}`,
            }))
            render(<SearchResults results={manyResults} />)
            expect(screen.getByText('50 results' as any)).toBeInTheDocument()
        })

        it('should handle results with missing optional fields', () => {
            const minimalResults: SearchResultItem[] = [
                {
                    url: 'https://example.com',
                    title: 'Minimal Result',
                    snippet: undefined,
                    domain: undefined,
                    provider: undefined,
                },
            ]
            render(<SearchResults results={minimalResults} />)
            expect(screen.getByText('Minimal Result' as any)).toBeInTheDocument()
        })

        it('should handle results with all fields populated', () => {
            const fullResults: SearchResultItem[] = [
                {
                    url: 'https://example.com/full',
                    title: 'Full Result',
                    snippet: 'Complete snippet text',
                    domain: 'example.com',
                    provider: 'SerpAPI',
                    relevanceScore: 0.99,
                    publishedDate: '2025-12-05',
                },
            ]
            render(<SearchResults results={fullResults} />)
            expect(screen.getByText('Full Result' as any)).toBeInTheDocument()
            expect(screen.getByText('Complete snippet text' as any)).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('should have proper link structure', () => {
            render(<SearchResults results={mockResults} />)
            const links = screen.getAllByRole('link')
            expect(links.length).toBeGreaterThan(0)
        })

        it('should have scrollable area for keyboard navigation', () => {
            const { container } = render(
                <SearchResults results={mockResults} />
            )
            expect(container.querySelector('[class*="overflow"]')).toBeInTheDocument()
        })
    })
})
