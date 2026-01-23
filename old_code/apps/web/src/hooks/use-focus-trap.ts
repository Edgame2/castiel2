import { useEffect, useRef } from "react"

/**
 * Focus Trap Hook
 * Traps keyboard focus within a container (useful for modals/dialogs)
 * Ensures accessibility by preventing focus from leaving the active element
 * 
 * @param isActive - Whether the focus trap should be active
 * @returns Reference to attach to the container element
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current

    // Get all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Handle tab key navigation
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      // Shift + Tab (backwards)
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    // Handle escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Let the parent component handle the escape
        container.dispatchEvent(new CustomEvent("escapekeypressed" as any))
      }
    }

    // Add event listeners
    container.addEventListener("keydown", handleTab)
    container.addEventListener("keydown", handleEscape)

    // Focus first element on mount
    firstElement?.focus()

    // Store previously focused element to restore later
    const previouslyFocusedElement = document.activeElement as HTMLElement

    // Cleanup
    return () => {
      container.removeEventListener("keydown", handleTab)
      container.removeEventListener("keydown", handleEscape)
      
      // Restore focus to previously focused element
      previouslyFocusedElement?.focus()
    }
  }, [isActive])

  return containerRef
}
