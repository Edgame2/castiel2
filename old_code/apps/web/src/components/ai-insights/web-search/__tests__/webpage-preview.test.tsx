/**
 * WebPagePreview Component Tests
 * Tests for displaying scraped webpage content with chunks and metadata
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { WebPagePreview } from '../webpage-preview'
import type { WebPagePreviewData } from '@/types/web-search'

describe('WebPagePreview Component', () => {
    const mockPage: WebPagePreviewData = {
        url: 'https://example.com/article',
        title: 'Example Article Title',
        content: 'This is the full text content of the webpage after scraping and parsing.',
        author: 'John Doe',
        publishDate: '2025-12-01',
        scrapedAt: '2025-12-06',
        searchType: 'web',
        sourceQuery: 'example query',
        chunks: [
            {
                id: 'chunk-1',
                text: 'This is the first semantic chunk of content.',
                tokenCount: 8,
                similarity: 0.95,
            },
            {
                id: 'chunk-2',
                text: 'This is the second semantic chunk of content.',
                tokenCount: 9,
                similarity: 0.87,
            },
            {
                id: 'chunk-3',
                text: 'This is the third semantic chunk of content.',
                tokenCount: 8,
                similarity: 0.76,
            },
        ],
    }

    describe('Rendering', () => {
        it('should render page title', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })

        it('should render page URL as link', () => {
            render(<WebPagePreview page={mockPage} />)
            const link = screen.getByRole('link')
            expect(link).toHaveAttribute('href', 'https://example.com/article')
        })

        it('should render search type badge', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('web' as any)).toBeInTheDocument()
        })

        it('should render source query badge', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/Query: example query/)).toBeInTheDocument()
        })

        it('should render author information', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/Author: John Doe/)).toBeInTheDocument()
        })

        it('should render publish date', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/12\/1\/2025/)).toBeInTheDocument()
        })

        it('should render scraped timestamp', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/Scraped/)).toBeInTheDocument()
        })

        it('should render page content', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('This is the full text content of the webpage after scraping and parsing.' as any)).toBeInTheDocument()
        })

        it('should render semantic chunks header', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/Semantic chunks \(\d+\)/)).toBeInTheDocument()
        })

        it('should render all chunks', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('This is the first semantic chunk of content.' as any)).toBeInTheDocument()
            expect(screen.getByText('This is the second semantic chunk of content.' as any)).toBeInTheDocument()
            expect(screen.getByText('This is the third semantic chunk of content.' as any)).toBeInTheDocument()
        })

        it('should render chunk token counts', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/8 tokens/)).toBeInTheDocument()
            expect(screen.getByText(/9 tokens/)).toBeInTheDocument()
        })

        it('should render chunk relevance scores', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/95% relevant/)).toBeInTheDocument()
            expect(screen.getByText(/87% relevant/)).toBeInTheDocument()
            expect(screen.getByText(/76% relevant/)).toBeInTheDocument()
        })

        it('should render custom title in widget mode', () => {
            render(
                <WebPagePreview
                    isWidget={true}
                    page={mockPage}
                    widgetConfig={{ title: 'Article Preview' }}
                />
            )
            expect(screen.getByText('Article Preview' as any)).toBeInTheDocument()
        })
    })

    describe('Content Handling', () => {
        it('should handle missing content gracefully', () => {
            const pageWithoutContent: WebPagePreviewData = {
                ...mockPage,
                content: undefined,
            }
            render(<WebPagePreview page={pageWithoutContent} />)
            expect(screen.getByText('No content captured.' as any)).toBeInTheDocument()
        })

        it('should handle empty chunks array', () => {
            const pageWithoutChunks: WebPagePreviewData = {
                ...mockPage,
                chunks: [],
            }
            render(<WebPagePreview page={pageWithoutChunks} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })

        it('should limit chunks display to 6 items', () => {
            const pageWithManyChunks: WebPagePreviewData = {
                ...mockPage,
                chunks: Array.from({ length: 20 }, (_, i) => ({
                    id: `chunk-${i}`,
                    text: `Chunk ${i} content`,
                    tokenCount: 10 + i,
                    similarity: 0.9 - (i * 0.01),
                })),
            }
            render(<WebPagePreview page={pageWithManyChunks} />)
            // Should show only first 6 chunks
            expect(screen.getByText('Chunk 0 content' as any)).toBeInTheDocument()
            expect(screen.queryByText('Chunk 19 content' as any)).not.toBeInTheDocument()
        })

        it('should handle multiline content with whitespace', () => {
            const pageWithMultilineContent: WebPagePreviewData = {
                ...mockPage,
                content: 'Line 1\n\nLine 2\n\n\nLine 3',
            }
            render(<WebPagePreview page={pageWithMultilineContent} />)
            expect(screen.getByText(/Line 1/)).toBeInTheDocument()
        })
    })

    describe('Metadata Display', () => {
        it('should render all metadata fields', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/Author: John Doe/)).toBeInTheDocument()
            expect(screen.getByText(/12\/1\/2025/)).toBeInTheDocument()
            expect(screen.getByText(/Scraped/)).toBeInTheDocument()
        })

        it('should handle missing author gracefully', () => {
            const pageWithoutAuthor: WebPagePreviewData = {
                ...mockPage,
                author: undefined,
            }
            render(<WebPagePreview page={pageWithoutAuthor} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })

        it('should handle missing publish date gracefully', () => {
            const pageWithoutDate: WebPagePreviewData = {
                ...mockPage,
                publishDate: undefined,
            }
            render(<WebPagePreview page={pageWithoutDate} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })

        it('should handle missing scraped timestamp gracefully', () => {
            const pageWithoutScrapedAt: WebPagePreviewData = {
                ...mockPage,
                scrapedAt: undefined,
            }
            render(<WebPagePreview page={pageWithoutScrapedAt} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })

        it('should show search type when available', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('web' as any)).toBeInTheDocument()
        })

        it('should hide search type when not provided', () => {
            const pageWithoutSearchType: WebPagePreviewData = {
                ...mockPage,
                searchType: undefined,
            }
            render(<WebPagePreview page={pageWithoutSearchType} />)
            // Should still render without search type badge
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })
    })

    describe('Links', () => {
        it('should open links in new tab', () => {
            render(<WebPagePreview page={mockPage} />)
            const links = screen.getAllByRole('link')
            links.forEach(link => {
                const anchor = link as HTMLAnchorElement;
                if (anchor.href.startsWith('http')) {
                    expect(link).toHaveAttribute('target', '_blank')
                    expect(link).toHaveAttribute('rel', 'noreferrer')
                }
            })
        })

        it('should link to original URL', () => {
            render(<WebPagePreview page={mockPage} />)
            const link = screen.getByRole('link')
            expect(link).toHaveAttribute('href', 'https://example.com/article')
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', () => {
            const { container } = render(
                <WebPagePreview isWidget={true} page={mockPage} />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should hide header when showHeader is false', () => {
            render(
                <WebPagePreview
                    isWidget={true}
                    page={mockPage}
                    widgetConfig={{ showHeader: false }}
                />
            )
            expect(screen.queryByText('Web Page Preview' as any)).not.toBeInTheDocument()
        })

        it('should apply widget size classes', () => {
            const { container } = render(
                <WebPagePreview
                    isWidget={true}
                    widgetSize="small"
                    page={mockPage}
                />
            )
            const card = container.querySelector('div[class*="h-full"]')
            expect(card).toHaveClass('h-full')
        })
    })

    describe('Chunk Display', () => {
        it('should show chunk count', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/Semantic chunks \(3\)/)).toBeInTheDocument()
        })

        it('should display chunks in scrollable area', () => {
            const { container } = render(
                <WebPagePreview page={mockPage} />
            )
            expect(container.querySelector('[class*="overflow"]')).toBeInTheDocument()
        })

        it('should style chunks appropriately', () => {
            const { container } = render(
                <WebPagePreview page={mockPage} />
            )
            const chunks = container.querySelectorAll('[class*="border"]')
            expect(chunks.length).toBeGreaterThan(0)
        })
    })

    describe('Props', () => {
        it('should accept page prop', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })

        it('should accept isWidget prop', () => {
            const { container } = render(
                <WebPagePreview isWidget={true} page={mockPage} />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should accept widgetSize prop', () => {
            const { container } = render(
                <WebPagePreview
                    isWidget={true}
                    widgetSize="large"
                    page={mockPage}
                />
            )
            expect(container.firstChild).toHaveClass('h-full')
        })

        it('should accept widgetConfig prop', () => {
            render(
                <WebPagePreview
                    isWidget={true}
                    page={mockPage}
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
        it('should have link structure', () => {
            render(<WebPagePreview page={mockPage} />)
            const links = screen.getAllByRole('link')
            expect(links.length).toBeGreaterThan(0)
        })

        it('should have scrollable content area', () => {
            const { container } = render(
                <WebPagePreview page={mockPage} />
            )
            expect(container.querySelector('[class*="scroll"]')).toBeInTheDocument()
        })

        it('should have semantic heading structure', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText('Example Article Title' as any)).toBeInTheDocument()
        })
    })

    describe('Edge Cases', () => {
        it('should handle very long URLs', () => {
            const pageWithLongUrl: WebPagePreviewData = {
                ...mockPage,
                url: 'https://example.com/very/long/path/with/many/segments/and/parameters?q=1&r=2&s=3&t=4&u=5',
            }
            render(<WebPagePreview page={pageWithLongUrl} />)
            expect(screen.getByText(/example.com/)).toBeInTheDocument()
        })

        it('should handle very long titles', () => {
            const pageWithLongTitle: WebPagePreviewData = {
                ...mockPage,
                title: 'A'.repeat(200),
            }
            render(<WebPagePreview page={pageWithLongTitle} />)
            expect(screen.getByText(/^A+$/)).toBeInTheDocument()
        })

        it('should handle missing optional metadata', () => {
            const minimalPage: WebPagePreviewData = {
                url: 'https://example.com',
                title: 'Minimal Page',
            }
            render(<WebPagePreview page={minimalPage} />)
            expect(screen.getByText('Minimal Page' as any)).toBeInTheDocument()
        })
    })

    describe('Chunk Metadata', () => {
        it('should display token counts for chunks', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/8 tokens/)).toBeInTheDocument()
            expect(screen.getByText(/9 tokens/)).toBeInTheDocument()
        })

        it('should display similarity scores as percentages', () => {
            render(<WebPagePreview page={mockPage} />)
            expect(screen.getByText(/95% relevant/)).toBeInTheDocument()
            expect(screen.getByText(/87% relevant/)).toBeInTheDocument()
        })

        it('should handle chunks without similarity scores', () => {
            const pageWithChunksNoSimilarity: WebPagePreviewData = {
                ...mockPage,
                chunks: [
                    {
                        id: 'chunk-1',
                        text: 'Chunk without similarity',
                        tokenCount: 5,
                    },
                ],
            }
            render(<WebPagePreview page={pageWithChunksNoSimilarity} />)
            expect(screen.getByText('Chunk without similarity' as any)).toBeInTheDocument()
        })
    })
})
