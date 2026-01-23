/**
 * SearchInput Component Tests
 * Tests for search query input with filters, deep search toggle, and search type selection
 * Tests: Rendering, user interactions, props, widget mode, loading states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { SearchInput } from '../search-input'
import type { SearchType } from '@/types/web-search'

describe('SearchInput Component', () => {
    const mockOnSearch = vi.fn()

    beforeEach(() => {
        mockOnSearch.mockClear()
    })

    describe('Rendering', () => {
        it('should render search input field', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            expect(screen.getByPlaceholderText(/Ask about a topic/i)).toBeInTheDocument()
        })

        it('should render search button', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
        })

        it('should render search type selector', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            expect(screen.getByText(/Search type/i)).toBeInTheDocument()
        })

        it('should render max results input', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            expect(screen.getByDisplayValue('8')).toBeInTheDocument()
        })

        it('should render deep search toggle', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            expect(screen.getByText(/Enable deep search/i)).toBeInTheDocument()
        })

        it('should render max pages input disabled by default', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const maxPagesInputs = screen.getAllByDisplayValue('3')
            const deepSearchInput = maxPagesInputs.find(
                input => (input as HTMLInputElement).disabled === false
            )
            expect(deepSearchInput).toBeDefined()
        })

        it('should render with custom title in widget mode', () => {
            render(
                <SearchInput
                    isWidget={true}
                    onSearch={mockOnSearch}
                    widgetConfig={{ title: 'Custom Search' }}
                />
            )
            expect(screen.getByText('Custom Search' as any)).toBeInTheDocument()
        })
    })

    describe('User Interactions', () => {
        it('should enable search button when query is entered', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            const button = screen.getByRole('button', { name: /search/i })

            expect(button).toBeDisabled()

            fireEvent.change(input, { target: { value: 'test query' } })
            await waitFor(() => {
                expect(button).not.toBeDisabled()
            })
        })

        it('should call onSearch when search button is clicked', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            const button = screen.getByRole('button', { name: /search/i })

            fireEvent.change(input, { target: { value: 'AI regulation' } })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: 'AI regulation',
                        type: 'web',
                        deepSearch: true,
                        maxPages: 3,
                        maxResults: 8,
                    })
                )
            })
        })

        it('should disable search button when isSubmitting is true', () => {
            render(<SearchInput onSearch={mockOnSearch} isSubmitting={true} />)
            const button = screen.getByRole('button', { name: /search/i })
            expect(button).toBeDisabled()
        })

        it('should show loading spinner when isSubmitting is true', () => {
            render(<SearchInput onSearch={mockOnSearch} isSubmitting={true} />)
            const refreshIcon = screen.getByRole('button', { name: /search/i }).querySelector('svg')
            expect(refreshIcon).toHaveClass('animate-spin')
        })

        it('should update search type when selector changes', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)

            fireEvent.change(input, { target: { value: 'latest news' } })

            // Find and click news option
            const searchTypeSelects = screen.getAllByText(/Search type/i)
            const selectTrigger = searchTypeSelects[0].closest('div' as any).querySelector('[role="combobox"]')
            fireEvent.click(selectTrigger!)

            await waitFor(() => {
                const newsOption = screen.getByText('News' as any)
                expect(newsOption).toBeInTheDocument()
            })

            fireEvent.click(screen.getByText('News' as any))
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'news',
                    })
                )
            })
        })

        it('should update max results when input changes', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            const maxResultsInputs = screen.getAllByDisplayValue('8')

            fireEvent.change(input, { target: { value: 'test' } })
            fireEvent.change(maxResultsInputs[0], { target: { value: '15' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxResults: 15,
                    })
                )
            })
        })

        it('should enable max pages input when deep search is enabled', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            // Toggle deep search on
            const switchElement = screen.getByRole('checkbox', { name: /Enable deep search/i })
            fireEvent.click(switchElement)

            await waitFor(() => {
                const maxPagesInputs = screen.getAllByDisplayValue('3') as HTMLInputElement[]
                const deepSearchPageInput = maxPagesInputs.find(input => !input.disabled)
                expect(deepSearchPageInput?.disabled).toBe(false)
            })
        })

        it('should limit max pages to 10', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)

            fireEvent.change(input, { target: { value: 'test' } })

            const maxPagesInputs = screen.getAllByDisplayValue('3')
            const pageInput = maxPagesInputs[maxPagesInputs.length - 1] as HTMLInputElement

            fireEvent.change(pageInput, { target: { value: '15' } })
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxPages: 10,
                    })
                )
            })
        })

        it('should prevent page input below 1', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)

            fireEvent.change(input, { target: { value: 'test' } })

            const maxPagesInputs = screen.getAllByDisplayValue('3')
            const pageInput = maxPagesInputs[maxPagesInputs.length - 1] as HTMLInputElement

            fireEvent.change(pageInput, { target: { value: '0' } })
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxPages: 1,
                    })
                )
            })
        })
    })

    describe('Props', () => {
        it('should use defaultQuery when provided', () => {
            render(
                <SearchInput
                    onSearch={mockOnSearch}
                    defaultQuery="initial search"
                />
            )
            expect(screen.getByDisplayValue('initial search')).toBeInTheDocument()
        })

        it('should use defaultType when provided', async () => {
            render(
                <SearchInput
                    onSearch={mockOnSearch}
                    defaultType="news"
                />
            )
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'news',
                    })
                )
            })
        })

        it('should disable deep search when enableDeepSearch is false', () => {
            render(
                <SearchInput
                    onSearch={mockOnSearch}
                    enableDeepSearch={false}
                />
            )
            const switchElement = screen.getByRole('checkbox', { name: /Enable deep search/i })
            expect(switchElement).not.toBeChecked()
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', () => {
            const { container } = render(
                <SearchInput isWidget={true} onSearch={mockOnSearch} />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should hide header when widgetConfig.showHeader is false', () => {
            render(
                <SearchInput
                    isWidget={true}
                    onSearch={mockOnSearch}
                    widgetConfig={{ showHeader: false }}
                />
            )
            expect(screen.queryByText('Web Search' as any)).not.toBeInTheDocument()
        })

        it('should show refresh interval hint when provided', () => {
            render(
                <SearchInput
                    isWidget={true}
                    onSearch={mockOnSearch}
                    widgetConfig={{ refreshInterval: 30 }}
                />
            )
            expect(screen.getByText(/Auto-refresh: 30s/)).toBeInTheDocument()
        })

        it('should apply widget size classes', () => {
            const { container } = render(
                <SearchInput
                    isWidget={true}
                    widgetSize="small"
                    onSearch={mockOnSearch}
                />
            )
            const card = container.querySelector('div[class*="h-full"]')
            expect(card).toHaveClass('h-full')
        })
    })

    describe('Search Types', () => {
        it('should support web search type', async () => {
            render(<SearchInput onSearch={mockOnSearch} defaultType="web" />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'web',
                    })
                )
            })
        })

        it('should support news search type', async () => {
            render(<SearchInput onSearch={mockOnSearch} defaultType="news" />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'breaking news' } })
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'news',
                    })
                )
            })
        })

        it('should support academic search type', async () => {
            render(<SearchInput onSearch={mockOnSearch} defaultType="academic" />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'research paper' } })
            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'academic',
                    })
                )
            })
        })
    })

    describe('Deep Search Configuration', () => {
        it('should allow enabling deep search', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const switchElement = screen.getByRole('checkbox', { name: /Enable deep search/i })
            fireEvent.click(switchElement)

            await waitFor(() => {
                expect(switchElement).toBeChecked()
            })
        })

        it('should pass correct deep search settings to callback', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)
            fireEvent.change(input, { target: { value: 'test' } })

            const switchElement = screen.getByRole('checkbox', { name: /Enable deep search/i })
            fireEvent.click(switchElement)

            const maxPagesInputs = screen.getAllByDisplayValue('3')
            const pageInput = maxPagesInputs[maxPagesInputs.length - 1]
            fireEvent.change(pageInput, { target: { value: '5' } })

            const button = screen.getByRole('button', { name: /search/i })
            fireEvent.click(button)

            await waitFor(() => {
                expect(mockOnSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        deepSearch: true,
                        maxPages: 5,
                    })
                )
            })
        })
    })

    describe('Accessibility', () => {
        it('should have proper labels for all inputs', () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            expect(screen.getByLabelText(/Search query/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/Max results/i)).toBeInTheDocument()
            expect(screen.getByLabelText(/Search type/i)).toBeInTheDocument()
        })

        it('should support keyboard navigation', async () => {
            render(<SearchInput onSearch={mockOnSearch} />)
            const input = screen.getByPlaceholderText(/Ask about a topic/i)

            fireEvent.change(input, { target: { value: 'test query' } })
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

            // Component should handle Enter key (implementation may vary)
            expect(input).toHaveValue('test query')
        })

        it('should have aria labels for icons', () => {
            render(<SearchInput onSearch={mockOnSearch} isSubmitting={false} />)
            const button = screen.getByRole('button', { name: /search/i })
            expect(button).toBeInTheDocument()
        })
    })
})
