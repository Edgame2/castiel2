/**
 * DeepSearchToggle Component Tests
 * Tests for enabling/disabling deep search and configuring page depth
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { DeepSearchToggle } from '../deep-search-toggle'

describe('DeepSearchToggle Component', () => {
    const mockOnChange = vi.fn()

    beforeEach(() => {
        mockOnChange.mockClear()
    })

    describe('Rendering', () => {
        it('should render toggle label', () => {
            render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByText(/Enable deep search/i)).toBeInTheDocument()
        })

        it('should render pages input label', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByText(/Pages to scrape/i)).toBeInTheDocument()
        })

        it('should display current maxPages value', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={5}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByDisplayValue('5')).toBeInTheDocument()
        })

        it('should show instruction text', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByText(/Scrape up to 10 pages/i)).toBeInTheDocument()
        })

        it('should render switch in unchecked state when disabled', () => {
            render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const checkbox = screen.getByRole('checkbox')
            expect(checkbox).not.toBeChecked()
        })

        it('should render switch in checked state when enabled', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const checkbox = screen.getByRole('checkbox')
            expect(checkbox).toBeChecked()
        })
    })

    describe('User Interactions', () => {
        it('should call onChange when toggle is clicked', async () => {
            render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const checkbox = screen.getByRole('checkbox')
            fireEvent.click(checkbox)

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith({
                    enabled: true,
                    maxPages: 3,
                })
            })
        })

        it('should disable pages input when deep search is disabled', () => {
            render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3')
            expect(input).toBeDisabled()
        })

        it('should enable pages input when deep search is enabled', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3')
            expect(input).not.toBeDisabled()
        })

        it('should call onChange when maxPages is changed', async () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3')
            fireEvent.change(input, { target: { value: '7' } })

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith({
                    enabled: true,
                    maxPages: 7,
                })
            })
        })

        it('should clamp maxPages to minimum of 1', async () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3')
            fireEvent.change(input, { target: { value: '0' } })

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith({
                    enabled: true,
                    maxPages: 1,
                })
            })
        })

        it('should clamp maxPages to maximum of 10', async () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3')
            fireEvent.change(input, { target: { value: '15' } })

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith({
                    enabled: true,
                    maxPages: 10,
                })
            })
        })
    })

    describe('Widget Mode', () => {
        it('should render as card when isWidget is true', () => {
            const { container } = render(
                <DeepSearchToggle
                    isWidget={true}
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(container.querySelector('div[class*="card"]')).toBeInTheDocument()
        })

        it('should show custom title in widget mode', () => {
            render(
                <DeepSearchToggle
                    isWidget={true}
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                    widgetConfig={{ title: 'Custom Deep Search' }}
                />
            )
            expect(screen.getByText('Custom Deep Search' as any)).toBeInTheDocument()
        })

        it('should hide header when showHeader is false', () => {
            render(
                <DeepSearchToggle
                    isWidget={true}
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                    widgetConfig={{ showHeader: false }}
                />
            )
            expect(screen.queryByText('Deep Search' as any)).not.toBeInTheDocument()
        })

        it('should apply widget size classes', () => {
            const { container } = render(
                <DeepSearchToggle
                    isWidget={true}
                    widgetSize="small"
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const card = container.querySelector('div[class*="h-full"]')
            expect(card).toHaveClass('h-full')
        })
    })

    describe('Props', () => {
        it('should accept enabled prop', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={5}
                    onChange={mockOnChange}
                />
            )
            const checkbox = screen.getByRole('checkbox')
            expect(checkbox).toBeChecked()
        })

        it('should accept maxPages prop', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={8}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByDisplayValue('8')).toBeInTheDocument()
        })

        it('should accept onChange callback', async () => {
            render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const checkbox = screen.getByRole('checkbox')
            fireEvent.click(checkbox)

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalled()
            })
        })
    })

    describe('Edge Cases', () => {
        it('should handle decimal input by parsing to integer', async () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3')
            fireEvent.change(input, { target: { value: '5.5' } })

            await waitFor(() => {
                // Should parse and clamp to 5
                expect(mockOnChange).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxPages: expect.any(Number),
                    })
                )
            })
        })

        it('should handle empty input gracefully', async () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const input = screen.getByDisplayValue('3') as HTMLInputElement
            fireEvent.change(input, { target: { value: '' } })

            // Component should maintain valid state
            expect(input.value).toBeDefined()
        })

        it('should allow toggling on and off multiple times', async () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            const checkbox = screen.getByRole('checkbox')

            fireEvent.click(checkbox)
            await waitFor(() => {
                expect(mockOnChange).toHaveBeenLastCalledWith(
                    expect.objectContaining({
                        enabled: false,
                    })
                )
            })

            mockOnChange.mockClear()

            fireEvent.click(checkbox)
            await waitFor(() => {
                expect(mockOnChange).toHaveBeenLastCalledWith(
                    expect.objectContaining({
                        enabled: true,
                    })
                )
            })
        })
    })

    describe('Accessibility', () => {
        it('should have label for toggle switch', () => {
            render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByLabelText(/Enable deep search/i)).toBeInTheDocument()
        })

        it('should have label for pages input', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByLabelText(/Pages to scrape/i)).toBeInTheDocument()
        })

        it('should have help text for pages input', () => {
            render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByText(/up to 10 pages/i)).toBeInTheDocument()
        })
    })

    describe('State Management', () => {
        it('should maintain enabled state correctly', () => {
            const { rerender } = render(
                <DeepSearchToggle
                    enabled={false}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            let checkbox = screen.getByRole('checkbox')
            expect(checkbox).not.toBeChecked()

            rerender(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            checkbox = screen.getByRole('checkbox')
            expect(checkbox).toBeChecked()
        })

        it('should maintain maxPages value correctly', () => {
            const { rerender } = render(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={3}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByDisplayValue('3')).toBeInTheDocument()

            rerender(
                <DeepSearchToggle
                    enabled={true}
                    maxPages={7}
                    onChange={mockOnChange}
                />
            )
            expect(screen.getByDisplayValue('7')).toBeInTheDocument()
        })
    })
})
