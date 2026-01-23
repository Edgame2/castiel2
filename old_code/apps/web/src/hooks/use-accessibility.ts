import { useEffect, useRef } from 'react'

/**
 * Hook to announce messages to screen readers
 * Uses ARIA live regions to communicate dynamic changes
 * 
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive' for urgent messages
 */
export function useScreenReaderAnnouncement(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcementRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!message) return

    // Create announcement element if it doesn't exist
    if (!announcementRef.current) {
      const announcement = document.createElement('div' as any)
      announcement.setAttribute('role', 'status')
      announcement.setAttribute('aria-live', priority)
      announcement.setAttribute('aria-atomic', 'true')
      announcement.className = 'sr-only'
      document.body.appendChild(announcement)
      announcementRef.current = announcement
    }

    // Update the message
    if (announcementRef.current) {
      announcementRef.current.textContent = message
    }

    // Cleanup on unmount
    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current)
        announcementRef.current = null
      }
    }
  }, [message, priority])
}

/**
 * Hook to manage keyboard shortcuts
 * Provides accessible keyboard navigation
 * 
 * @param shortcuts - Object mapping key combinations to handlers
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (event: KeyboardEvent) => void>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const modifiers = {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      }

      // Build the key combination string
      const combination = [
        modifiers.ctrl && 'ctrl',
        modifiers.alt && 'alt',
        modifiers.shift && 'shift',
        modifiers.meta && 'meta',
        key,
      ]
        .filter(Boolean)
        .join('+')

      // Check if this combination has a handler
      if (shortcuts[combination]) {
        event.preventDefault()
        shortcuts[combination](event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, enabled])
}

/**
 * Hook to manage focus on mount
 * Useful for dialogs and modals to set initial focus
 * 
 * @param elementRef - Ref to the element to focus
 * @param shouldFocus - Whether to focus the element
 */
export function useAutoFocus(
  elementRef: React.RefObject<HTMLElement>,
  shouldFocus: boolean = true
) {
  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      // Small delay to ensure element is rendered
      const timeoutId = setTimeout(() => {
        elementRef.current?.focus()
      }, 0)

      return () => clearTimeout(timeoutId)
    }
  }, [elementRef, shouldFocus])
}

/**
 * Hook to restore focus when component unmounts
 * Essential for modals and popups to return focus to the trigger element
 */
export function useRestoreFocus() {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Restore focus on unmount
    return () => {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [])
}
