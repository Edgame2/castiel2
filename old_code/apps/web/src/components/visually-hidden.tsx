import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * VisuallyHidden Component
 * Hides content visually but keeps it accessible to screen readers
 * Essential for WCAG 2.1 compliance
 */

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  /**
   * Whether the content should be focusable
   * Useful for skip links that should appear on focus
   */
  focusable?: boolean
}

export function VisuallyHidden({
  children,
  focusable = false,
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        // Screen reader only styles
        "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0",
        "[clip:rect(0,0,0,0)]",
        // Show on focus if focusable
        focusable && "focus:not-sr-only focus:relative focus:h-auto focus:w-auto focus:overflow-visible",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/**
 * Alternative component using sr-only Tailwind utility
 * More commonly used in the shadcn/ui components
 */
export function ScreenReaderOnly({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("sr-only", className)} {...props}>
      {children}
    </span>
  )
}
