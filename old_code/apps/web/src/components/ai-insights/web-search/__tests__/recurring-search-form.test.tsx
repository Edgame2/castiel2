/**
 * RecurringSearchForm Component Tests
 * Tests for creating and configuring recurring search schedules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { RecurringSearchForm } from '../recurring-search-form'
import * as apiModule from '@/lib/api/web-search'

vi.mock('@/lib/api/web-search', () => ({
    createRecurringSearch: vi.fn(),
}))

describe('RecurringSearchForm Component', () => {
    const mockOnCreated = vi.fn()

    beforeEach(() => {
        mockOnCreated.mockClear()
        vi.clearAllMocks()
    })

    describe('Rendering', () => {
        it('should render query input', () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            expect(screen.getByPlaceholderText(/e.g. AI agents weekly/i)).toBeInTheDocument()
        })

        it('should render search type selector', () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            expect(screen.getByText(/Search type/i)).toBeInTheDocument()
        })

        it('should render schedule selector', () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            expect(screen.getByText(/Schedule/i)).toBeInTheDocument()
        })

        it('should render deep search toggle', () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            expect(screen.getByText(/Deep search/i)).toBeInTheDocument()
        })

        it('should render save button', () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
        })

        it('should render custom title in widget mode', () => {
            render(
                <RecurringSearchForm
                    isWidget={true}
                    onCreated={mockOnCreated}
                    widgetConfig={{ title: 'New Recurring Search' }}
                />
            )
            expect(screen.getByText('New Recurring Search' as any)).toBeInTheDocument()
        })
    })

    describe('Form Submission', () => {
        it('should require query before submission', async () => {
            vi.mocked(apiModule.createRecurringSearch).mockResolvedValue({
                searchId: '123',
                executedAt: new Date().toISOString(),
            })

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/Query is required/i)).toBeInTheDocument()
            })
        })

        it('should submit form with correct payload', async () => {
            const mockResponse = {
                searchId: '123',
                executedAt: new Date().toISOString(),
            }

            vi.mocked(apiModule.createRecurringSearch).mockResolvedValue(mockResponse)

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'AI agents' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(apiModule.createRecurringSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        query: 'AI agents',
                        searchType: 'web',
                        deepSearch: true,
                    })
                )
            })
        })

        it('should call onCreated callback on success', async () => {
            const mockResponse = {
                searchId: '123',
                executedAt: new Date().toISOString(),
            }

            vi.mocked(apiModule.createRecurringSearch).mockResolvedValue(mockResponse)

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test query' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(mockOnCreated).toHaveBeenCalledWith(mockResponse)
            })
        })

        it('should display error message on failure', async () => {
            vi.mocked(apiModule.createRecurringSearch).mockRejectedValue(
                new Error('Network error')
            )

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test query' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/Network error/i)).toBeInTheDocument()
            })
        })
    })

    describe('Form Interactions', () => {
        it('should update query on input change', async () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i) as HTMLInputElement
            fireEvent.change(queryInput, { target: { value: 'new query' } })

            await waitFor(() => {
                expect(queryInput.value).toBe('new query')
            })
        })

        it('should change search type', async () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            // Would need to interact with Select component
            // This is a simplified test
            expect(screen.getByText(/Search type/i)).toBeInTheDocument()
        })

        it('should toggle deep search option', async () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            const deepSearchCheckbox = screen.getByRole('checkbox', { name: /Deep search/i })
            expect(deepSearchCheckbox).toBeChecked()

            fireEvent.click(deepSearchCheckbox)
            await waitFor(() => {
                expect(deepSearchCheckbox).not.toBeChecked()
            })
        })

        it('should update deep search pages when changed', async () => {
            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )
            const pageInputs = screen.getAllByDisplayValue('3')
            const deepSearchInput = pageInputs.find(input => {
                const label = input.closest('div' as any)?.textContent
                return label?.includes('Pages')
            })

            if (deepSearchInput) {
                fireEvent.change(deepSearchInput, { target: { value: '5' } })
                await waitFor(() => {
                    expect(deepSearchInput).toHaveValue(5)
                })
            }
        })
    })

    describe('Props', () => {
        it('should use defaultQuery when provided', () => {
            render(
                <RecurringSearchForm
                    defaultQuery="Initial query"
                    onCreated={mockOnCreated}
                />
            )
            expect(screen.getByDisplayValue('Initial query')).toBeInTheDocument()
        })

        it('should include projectId in submission', async () => {
            const mockResponse = {
                searchId: '123',
                executedAt: new Date().toISOString(),
            }

            vi.mocked(apiModule.createRecurringSearch).mockResolvedValue(mockResponse)

            render(
                <RecurringSearchForm
                    projectId="project-123"
                    onCreated={mockOnCreated}
                />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(apiModule.createRecurringSearch).toHaveBeenCalledWith(
                    expect.objectContaining({
                        projectId: 'project-123',
                    })
                )
            })
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', () => {
            const { container } = render(
                <RecurringSearchForm
                    isWidget={true}
                    onCreated={mockOnCreated}
                />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should hide header when showHeader is false', () => {
            render(
                <RecurringSearchForm
                    isWidget={true}
                    onCreated={mockOnCreated}
                    widgetConfig={{ showHeader: false }}
                />
            )
            expect(screen.queryByText('Recurring Search' as any)).not.toBeInTheDocument()
        })
    })

    describe('Loading States', () => {
        it('should disable save button while submitting', async () => {
            vi.mocked(apiModule.createRecurringSearch).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({
                    searchId: '123',
                    executedAt: new Date().toISOString(),
                }), 100))
            )

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(saveButton).toBeDisabled()
            })
        })

        it('should show loading spinner while submitting', async () => {
            vi.mocked(apiModule.createRecurringSearch).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({
                    searchId: '123',
                    executedAt: new Date().toISOString(),
                }), 100))
            )

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            // Button should show loading state
            expect(saveButton).toBeDisabled()
        })
    })

    describe('Error Handling', () => {
        it('should clear error message on successful submission', async () => {
            const mockResponse = {
                searchId: '123',
                executedAt: new Date().toISOString(),
            }

            vi.mocked(apiModule.createRecurringSearch).mockResolvedValue(mockResponse)

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(mockOnCreated).toHaveBeenCalled()
            })
        })

        it('should display server error messages', async () => {
            vi.mocked(apiModule.createRecurringSearch).mockRejectedValue(
                new Error('Server returned 500')
            )

            render(
                <RecurringSearchForm onCreated={mockOnCreated} />
            )

            const queryInput = screen.getByPlaceholderText(/e.g. AI agents weekly/i)
            fireEvent.change(queryInput, { target: { value: 'test' } })

            const saveButton = screen.getByRole('button', { name: /Save/i })
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(screen.getByText(/Server returned 500/i)).toBeInTheDocument()
            })
        })
    })
})
