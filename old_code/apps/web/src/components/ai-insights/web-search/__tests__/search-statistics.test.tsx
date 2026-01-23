/**
 * SearchStatistics Component Tests
 * Tests for displaying search metrics and statistics dashboard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { SearchStatistics } from '../search-statistics'
import * as apiModule from '@/lib/api/web-search'

vi.mock('@/lib/api/web-search', () => ({
    getSearchStatistics: vi.fn(),
}))

describe('SearchStatistics Component', () => {
    const mockStats = {
        totalSearches: 42,
        totalWebPages: 156,
        totalChunks: 2847,
        averageChunksPerPage: 18.2,
        totalCost: 0.87,
        cacheHitRate: 0.35,
        deepSearchPercentage: 0.62,
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render statistics card title', () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)
            expect(screen.getByText('Search Statistics' as any)).toBeInTheDocument()
        })

        it('should render all metric labels', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('Searches' as any)).toBeInTheDocument()
                expect(screen.getByText('Pages scraped' as any)).toBeInTheDocument()
                expect(screen.getByText('Chunks' as any)).toBeInTheDocument()
                expect(screen.getByText(/Avg. chunks/)).toBeInTheDocument()
            })
        })

        it('should display metric values', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('42' as any)).toBeInTheDocument()
                expect(screen.getByText('156' as any)).toBeInTheDocument()
                expect(screen.getByText('2847' as any)).toBeInTheDocument()
                expect(screen.getByText('18.2' as any)).toBeInTheDocument()
            })
        })

        it('should render refresh button', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
            })
        })

        it('should render custom title in widget mode', () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(
                <SearchStatistics
                    isWidget={true}
                    widgetConfig={{ title: 'My Stats' }}
                />
            )
            expect(screen.getByText('My Stats' as any)).toBeInTheDocument()
        })
    })

    describe('Data Loading', () => {
        it('should load statistics on mount', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(apiModule.getSearchStatistics).toHaveBeenCalled()
            })
        })

        it('should display loading state initially', () => {
            vi.mocked(apiModule.getSearchStatistics).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockStats), 100))
            )

            render(<SearchStatistics />)
            // Should show loading indicator (ellipsis or spinner)
            expect(screen.getByText('…' as any)).toBeInTheDocument()
        })

        it('should display data after loading', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('42' as any)).toBeInTheDocument()
            })
        })

        it('should handle loading error gracefully', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockRejectedValue(
                new Error('Failed to fetch')
            )

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled()
            })

            consoleSpy.mockRestore()
        })
    })

    describe('Refresh Functionality', () => {
        it('should refresh data when refresh button is clicked', async () => {
            vi.mocked(apiModule.getSearchStatistics)
                .mockResolvedValueOnce(mockStats)
                .mockResolvedValueOnce({ ...mockStats, totalSearches: 50 })

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('42' as any)).toBeInTheDocument()
            })

            const refreshButton = screen.getByRole('button', { name: /Refresh/i })
            fireEvent.click(refreshButton)

            await waitFor(() => {
                expect(apiModule.getSearchStatistics).toHaveBeenCalledTimes(2)
            })
        })

        it('should disable refresh button while loading', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockStats), 100))
            )

            render(<SearchStatistics />)

            const refreshButton = screen.getByRole('button', { name: /Refresh/i })

            await waitFor(() => {
                expect(refreshButton).toBeDisabled()
            })

            await waitFor(() => {
                expect(refreshButton).not.toBeDisabled()
            }, { timeout: 200 })
        })

        it('should show loading spinner during refresh', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve(mockStats), 100))
            )

            render(<SearchStatistics />)

            await waitFor(() => {
                const refreshButton = screen.getByRole('button', { name: /Refresh/i })
                const spinner = refreshButton.querySelector('svg')
                expect(spinner).toHaveClass('animate-spin')
            })
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            const { container } = render(
                <SearchStatistics isWidget={true} />
            )

            await waitFor(() => {
                expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
            })
        })

        it('should hide header when showHeader is false', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(
                <SearchStatistics
                    isWidget={true}
                    widgetConfig={{ showHeader: false }}
                />
            )

            await waitFor(() => {
                expect(screen.queryByText('Search Statistics' as any)).not.toBeInTheDocument()
            })
        })

        it('should apply widget size classes', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            const { container } = render(
                <SearchStatistics
                    isWidget={true}
                    widgetSize="small"
                />
            )

            await waitFor(() => {
                const card = container.querySelector('div[class*="h-full"]')
                expect(card).toHaveClass('h-full')
            })
        })
    })

    describe('Metric Display', () => {
        it('should display total searches metric', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('Searches' as any)).toBeInTheDocument()
                expect(screen.getByText('42' as any)).toBeInTheDocument()
            })
        })

        it('should display total web pages metric', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('Pages scraped' as any)).toBeInTheDocument()
                expect(screen.getByText('156' as any)).toBeInTheDocument()
            })
        })

        it('should display total chunks metric', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('Chunks' as any)).toBeInTheDocument()
                expect(screen.getByText('2847' as any)).toBeInTheDocument()
            })
        })

        it('should display average chunks per page metric', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText(/Avg. chunks/)).toBeInTheDocument()
                expect(screen.getByText('18.2' as any)).toBeInTheDocument()
            })
        })
    })

    describe('Props', () => {
        it('should accept isWidget prop', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            const { container } = render(
                <SearchStatistics isWidget={true} />
            )

            await waitFor(() => {
                expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
            })
        })

        it('should accept widgetSize prop', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            const { container } = render(
                <SearchStatistics
                    isWidget={true}
                    widgetSize="large"
                />
            )

            await waitFor(() => {
                const card = container.firstChild
                expect(card).toHaveClass('h-full')
            })
        })

        it('should accept widgetConfig prop', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(
                <SearchStatistics
                    isWidget={true}
                    widgetConfig={{
                        title: 'Custom Title',
                        showHeader: true,
                    }}
                />
            )

            await waitFor(() => {
                expect(screen.getByText('Custom Title' as any)).toBeInTheDocument()
            })
        })
    })

    describe('Grid Layout', () => {
        it('should display metrics in responsive grid', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            const { container } = render(<SearchStatistics />)

            await waitFor(() => {
                const grid = container.querySelector('[class*="grid"]')
                expect(grid).toBeInTheDocument()
            })
        })

        it('should show all four metric cards', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                const cards = screen.getAllByText(/^[\d.]+$/)
                expect(cards.length).toBeGreaterThanOrEqual(4)
            })
        })
    })

    describe('Icons', () => {
        it('should render metric icons', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            const { container } = render(<SearchStatistics />)

            await waitFor(() => {
                const svgs = container.querySelectorAll('svg')
                expect(svgs.length).toBeGreaterThan(0)
            })
        })
    })

    describe('Accessibility', () => {
        it('should have proper button structure for refresh', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                const button = screen.getByRole('button', { name: /Refresh/i })
                expect(button).toBeInTheDocument()
            })
        })

        it('should display statistics in semantic structure', async () => {
            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(mockStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('Searches' as any)).toBeInTheDocument()
                expect(screen.getByText('Pages scraped' as any)).toBeInTheDocument()
            })
        })
    })

    describe('Edge Cases', () => {
        it('should handle zero statistics', async () => {
            const zeroStats = {
                totalSearches: 0,
                totalWebPages: 0,
                totalChunks: 0,
                averageChunksPerPage: 0,
                totalCost: 0,
                cacheHitRate: 0,
                deepSearchPercentage: 0,
            }

            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(zeroStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getAllByText('0' as any).length).toBeGreaterThan(0)
            })
        })

        it('should handle large numbers', async () => {
            const largeStats = {
                totalSearches: 999999,
                totalWebPages: 999999,
                totalChunks: 999999,
                averageChunksPerPage: 999.99,
                totalCost: 9999.99,
                cacheHitRate: 0.99,
                deepSearchPercentage: 0.99,
            }

            vi.mocked(apiModule.getSearchStatistics).mockResolvedValue(largeStats)

            render(<SearchStatistics />)

            await waitFor(() => {
                expect(screen.getByText('999999' as any)).toBeInTheDocument()
            })
        })
    })
})
