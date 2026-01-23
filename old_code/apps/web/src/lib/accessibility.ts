/**
 * Accessibility Utilities
 * Helper functions for improving accessibility across the application
 */

/**
 * Generate a unique ID for accessibility attributes
 * @param prefix - Optional prefix for the ID
 */
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Announce a message to screen readers using ARIA live regions
 * @param message - The message to announce
 * @param priority - The priority level ('polite' or 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div' as any)
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement is made
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Check if an element is keyboard focusable
 * @param element - The element to check
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false
  if (element.hasAttribute('hidden')) return false
  if (element.getAttribute('tabindex') === '-1') return false

  const tabindex = element.getAttribute('tabindex')
  if (tabindex !== null && parseInt(tabindex, 10) >= 0) return true

  return (
    element.tagName === 'A' ||
    element.tagName === 'BUTTON' ||
    element.tagName === 'INPUT' ||
    element.tagName === 'SELECT' ||
    element.tagName === 'TEXTAREA' ||
    element.getAttribute('contenteditable') === 'true'
  )
}

/**
 * Get all focusable elements within a container
 * @param container - The container to search within
 */
export function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Check if reduced motion is preferred by the user
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if high contrast mode is enabled
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches
}

/**
 * Get the appropriate ARIA role for a heading level
 * @param level - The heading level (1-6)
 */
export function getHeadingRole(level: number): string {
  return level >= 1 && level <= 6 ? 'heading' : 'none'
}

/**
 * Create accessible error message ID for form inputs
 * @param inputId - The ID of the input element
 */
export function getErrorMessageId(inputId: string): string {
  return `${inputId}-error`
}

/**
 * Create accessible description ID for form inputs
 * @param inputId - The ID of the input element
 */
export function getDescriptionId(inputId: string): string {
  return `${inputId}-description`
}

/**
 * Trap focus within a modal or dialog
 * @param container - The container element
 * @param event - The keyboard event
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return

  const focusableElements = getFocusableElements(container)
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement?.focus()
    event.preventDefault()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement?.focus()
    event.preventDefault()
  }
}

/**
 * Get color contrast ratio between two colors
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16)
    const r = ((rgb >> 16) & 0xff) / 255
    const g = ((rgb >> 8) & 0xff) / 255
    const b = (rgb & 0xff) / 255

    const [rs, gs, bs] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    )

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if a color contrast meets WCAG AA standards
 * @param foreground - Foreground color in hex
 * @param background - Background color in hex
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 */
export function meetsWCAGContrast(
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}
