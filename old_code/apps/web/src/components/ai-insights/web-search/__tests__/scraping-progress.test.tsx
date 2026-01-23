/**
 * ScrapingProgress Component Tests
 * Tests for real-time progress indicator during page scraping operations
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { ScrapingProgress } from '../scraping-progress'
import type { ScrapingProgressEvent } from '@/types/web-search'

describe('ScrapingProgress Component', () => {
    const mockEvents: ScrapingProgressEvent[] = [
        {
            currentPage: 1,
            totalPages: 3,
            currentUrl: 'https://example.com/page1',
            status: 'fetching',
            progress: 25,
            message: 'Fetching page 1...',
        },
        {
            currentPage: 1,
            totalPages: 3,
            currentUrl: 'https://example.com/page1',
            status: 'parsing',
            progress: 50,
            message: 'Parsing HTML...',
        },
        {
            currentPage: 1,
            totalPages: 3,
            currentUrl: 'https://example.com/page1',
            status: 'chunking',
            progress: 75,
            message: 'Splitting into chunks...',
        },
    ]

    describe('Rendering', () => {
        it('should render latest status when events provided', () => {
            render(
                <ScrapingProgress
                    events={mockEvents}
                />
            )
            expect(screen.getByText(/Splitting into chunks/i)).toBeInTheDocument()
        })

        it('should display waiting message when no events', () => {
            render(
                <ScrapingProgress events={[]} />
            )
            expect(screen.getByText(/Waiting for scraping/i)).toBeInTheDocument()
        })

        it('should show current URL from latest event', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText(/example.com\/page1/)).toBeInTheDocument()
        })

        it('should display progress percentage', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            // Should show latest progress (75%)
            expect(screen.getByText('75%' as any)).toBeInTheDocument()
        })

        it('should display status badge', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText('chunking' as any)).toBeInTheDocument()
        })

        it('should show progress message', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText(/Splitting into chunks/i)).toBeInTheDocument()
        })

        it('should render all events in history', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText('fetching' as any)).toBeInTheDocument()
            expect(screen.getByText('parsing' as any)).toBeInTheDocument()
            expect(screen.getByText('chunking' as any)).toBeInTheDocument()
        })

        it('should show custom title in widget mode', () => {
            render(
                <ScrapingProgress
                    isWidget={true}
                    events={mockEvents}
                    widgetConfig={{ title: 'Custom Progress' }}
                />
            )
            expect(screen.getByText('Custom Progress' as any)).toBeInTheDocument()
        })
    })

    describe('Status Badges', () => {
        it('should color-code fetching status', () => {
            const fetchingEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'fetching',
                    progress: 10,
                }
            ]
            render(<ScrapingProgress events={fetchingEvent} />)
            expect(screen.getByText('fetching' as any)).toBeInTheDocument()
        })

        it('should color-code parsing status', () => {
            const parsingEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'parsing',
                    progress: 30,
                }
            ]
            render(<ScrapingProgress events={parsingEvent} />)
            expect(screen.getByText('parsing' as any)).toBeInTheDocument()
        })

        it('should color-code chunking status', () => {
            const chunkingEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'chunking',
                    progress: 60,
                }
            ]
            render(<ScrapingProgress events={chunkingEvent} />)
            expect(screen.getByText('chunking' as any)).toBeInTheDocument()
        })

        it('should color-code embedding status', () => {
            const embeddingEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'embedding',
                    progress: 80,
                }
            ]
            render(<ScrapingProgress events={embeddingEvent} />)
            expect(screen.getByText('embedding' as any)).toBeInTheDocument()
        })

        it('should color-code complete status', () => {
            const completeEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'complete',
                    progress: 100,
                }
            ]
            render(<ScrapingProgress events={completeEvent} />)
            expect(screen.getByText('complete' as any)).toBeInTheDocument()
        })

        it('should color-code error status', () => {
            const errorEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'error',
                    progress: 50,
                    message: 'Network error',
                }
            ]
            render(<ScrapingProgress events={errorEvent} />)
            expect(screen.getByText('error' as any)).toBeInTheDocument()
            expect(screen.getByText('Network error' as any)).toBeInTheDocument()
        })
    })

    describe('Progress Tracking', () => {
        it('should cap progress at 100%', () => {
            const overflowEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'complete',
                    progress: 150, // Over 100
                }
            ]
            render(<ScrapingProgress events={overflowEvent} />)
            // Progress bar should clamp to 100
            expect(screen.getByText('100%' as any)).toBeInTheDocument()
        })

        it('should display minimum 0% progress', () => {
            const zeroEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'fetching',
                    progress: 0,
                }
            ]
            render(<ScrapingProgress events={zeroEvent} />)
            expect(screen.getByText('0%' as any)).toBeInTheDocument()
        })

        it('should show progress increasing across events', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            // All progress values should be visible in history
            expect(screen.getByText('25%' as any)).toBeInTheDocument()
            expect(screen.getByText('50%' as any)).toBeInTheDocument()
            expect(screen.getByText('75%' as any)).toBeInTheDocument()
        })
    })

    describe('Multiple Pages Scraping', () => {
        it('should handle scraping multiple pages', () => {
            const multiPageEvents: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com/page1',
                    status: 'complete',
                    progress: 33,
                },
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com/page2',
                    status: 'fetching',
                    progress: 50,
                },
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com/page3',
                    status: 'chunking',
                    progress: 100,
                },
            ]
            render(<ScrapingProgress events={multiPageEvents} />)
            expect(screen.getByText(/page3/)).toBeInTheDocument()
            expect(screen.getByText('chunking' as any)).toBeInTheDocument()
        })

        it('should scroll through event history', () => {
            const manyEvents: ScrapingProgressEvent[] = Array.from({ length: 20 }, (_, i) => ({
                currentPage: 1,
                totalPages: 10,
                currentUrl: `https://example.com/page${i}`,
                status: i % 3 === 0 ? 'complete' : 'fetching',
                progress: (i / 20) * 100,
            }))
            render(<ScrapingProgress events={manyEvents} />)
            expect(screen.getByText(/page19/)).toBeInTheDocument()
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', () => {
            const { container } = render(
                <ScrapingProgress
                    isWidget={true}
                    events={mockEvents}
                />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should hide header when showHeader is false', () => {
            render(
                <ScrapingProgress
                    isWidget={true}
                    events={mockEvents}
                    widgetConfig={{ showHeader: false }}
                />
            )
            expect(screen.queryByText('Scraping Progress' as any)).not.toBeInTheDocument()
        })

        it('should apply widget size classes', () => {
            const { container } = render(
                <ScrapingProgress
                    isWidget={true}
                    widgetSize="small"
                    events={mockEvents}
                />
            )
            const card = container.querySelector('div[class*="h-full"]')
            expect(card).toHaveClass('h-full')
        })
    })

    describe('Empty and Edge Cases', () => {
        it('should handle empty message gracefully', () => {
            const noMessageEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'fetching',
                    progress: 25,
                }
            ]
            render(<ScrapingProgress events={noMessageEvent} />)
            expect(screen.getByText(/example.com/)).toBeInTheDocument()
        })

        it('should handle very long URLs', () => {
            const longUrlEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com/very/long/path/with/many/segments/and/parameters?q=1&r=2&s=3',
                    status: 'fetching',
                    progress: 25,
                }
            ]
            render(<ScrapingProgress events={longUrlEvent} />)
            expect(screen.getByText(/example.com/)).toBeInTheDocument()
        })

        it('should handle events with minimal data', () => {
            const minimalEvent: ScrapingProgressEvent[] = [
                {
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'fetching',
                    progress: 50,
                }
            ]
            render(<ScrapingProgress events={minimalEvent} />)
            expect(screen.getByText('50%' as any)).toBeInTheDocument()
        })
    })

    describe('Props', () => {
        it('should accept events array', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText('chunking' as any)).toBeInTheDocument()
        })

        it('should accept isWidget prop', () => {
            const { container } = render(
                <ScrapingProgress
                    isWidget={true}
                    events={mockEvents}
                />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should accept widgetSize prop', () => {
            const { container } = render(
                <ScrapingProgress
                    isWidget={true}
                    widgetSize="medium"
                    events={mockEvents}
                />
            )
            expect(container.firstChild).toHaveClass('h-full')
        })

        it('should accept widgetConfig prop', () => {
            render(
                <ScrapingProgress
                    isWidget={true}
                    events={mockEvents}
                    widgetConfig={{
                        title: 'Custom Title',
                        showHeader: true,
                    }}
                />
            )
            expect(screen.getByText('Custom Title' as any)).toBeInTheDocument()
        })
    })

    describe('Accessibility', () => {
        it('should have scrollable area for keyboard navigation', () => {
            const { container } = render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(container.querySelector('[class*="overflow"]')).toBeInTheDocument()
        })

        it('should have descriptive status messages', () => {
            render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText(/Splitting into chunks/i)).toBeInTheDocument()
        })
    })

    describe('Real-Time Updates', () => {
        it('should update when new events are added', () => {
            const { rerender } = render(
                <ScrapingProgress events={mockEvents} />
            )
            expect(screen.getByText('75%' as any)).toBeInTheDocument()

            const newEvents = [
                ...mockEvents,
                {
                    currentPage: 2,
                    totalPages: 10,
                    currentUrl: 'https://example.com/page2',
                    status: 'embedding' as const,
                    progress: 90,
                    message: 'Generating embeddings...',
                }
            ]

            rerender(
                <ScrapingProgress events={newEvents} />
            )
            expect(screen.getByText('90%' as any)).toBeInTheDocument()
            expect(screen.getByText('embedding' as any)).toBeInTheDocument()
        })

        it('should update progress bar smoothly', () => {
            const { rerender } = render(
                <ScrapingProgress events={[{
                    currentPage: 1,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'fetching',
                    progress: 10,
                }]} />
            )

            rerender(
                <ScrapingProgress events={[{
                    currentPage: 5,
                    totalPages: 10,
                    currentUrl: 'https://example.com',
                    status: 'fetching',
                    progress: 50,
                }]} />
            )

            expect(screen.getByText('50%' as any)).toBeInTheDocument()
        })
    })
})
