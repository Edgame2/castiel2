'use client'

/**
 * StreamingText Component
 * Displays AI-generated text with a typing animation effect
 */

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface StreamingTextProps {
  content: string
  isStreaming?: boolean
  className?: string
  showCursor?: boolean
  onComplete?: () => void
}

/**
 * StreamingText - Displays text with typing animation and markdown support
 */
export function StreamingText({
  content,
  isStreaming = false,
  className,
  showCursor = true,
  onComplete,
}: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState(content)
  const prevContentRef = useRef(content)

  useEffect(() => {
    // Update displayed content when content changes
    setDisplayedContent(content)
    prevContentRef.current = content

    if (!isStreaming && content && onComplete) {
      onComplete()
    }
  }, [content, isStreaming, onComplete])

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        components={{
          // Custom code block styling
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match && !String(children).includes('\n')

            if (isInline) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            return (
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className={cn('text-sm font-mono', className)} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          // Custom link styling
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            )
          },
          // Custom list styling
          ul({ children, ...props }) {
            return (
              <ul className="list-disc list-inside space-y-1 my-2" {...props}>
                {children}
              </ul>
            )
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal list-inside space-y-1 my-2" {...props}>
                {children}
              </ol>
            )
          },
          // Custom heading styling
          h1({ children, ...props }) {
            return (
              <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
                {children}
              </h1>
            )
          },
          h2({ children, ...props }) {
            return (
              <h2 className="text-lg font-semibold mt-3 mb-2" {...props}>
                {children}
              </h2>
            )
          },
          h3({ children, ...props }) {
            return (
              <h3 className="text-base font-semibold mt-2 mb-1" {...props}>
                {children}
              </h3>
            )
          },
          // Custom paragraph styling
          p({ children, ...props }) {
            return (
              <p className="my-2 leading-relaxed" {...props}>
                {children}
              </p>
            )
          },
          // Custom blockquote styling
          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="border-l-4 border-primary/30 pl-4 my-3 italic text-muted-foreground"
                {...props}
              >
                {children}
              </blockquote>
            )
          },
          // Custom table styling
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-border" {...props}>
                  {children}
                </table>
              </div>
            )
          },
          th({ children, ...props }) {
            return (
              <th className="border border-border bg-muted px-3 py-2 text-left font-semibold" {...props}>
                {children}
              </th>
            )
          },
          td({ children, ...props }) {
            return (
              <td className="border border-border px-3 py-2" {...props}>
                {children}
              </td>
            )
          },
        }}
      >
        {displayedContent}
      </ReactMarkdown>
      {isStreaming && showCursor && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
      )}
    </div>
  )
}

/**
 * Skeleton for loading state
 */
export function StreamingTextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  )
}











