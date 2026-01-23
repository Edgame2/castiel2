"use client"

/**
 * Skip Links Component
 * Provides keyboard navigation shortcuts to main content areas
 * Essential for WCAG 2.1 AA compliance
 */

export function SkipLinks() {
  return (
    <>
      {/* Screen reader only by default, visible on focus */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>
      </div>
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#navigation"
          className="fixed left-4 top-16 z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to navigation
        </a>
      </div>
    </>
  )
}
