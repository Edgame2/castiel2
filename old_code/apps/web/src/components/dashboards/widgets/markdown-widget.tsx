"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"

interface MarkdownWidgetProps {
  widget: Widget
}

interface MarkdownConfig {
  content: string
}

export function MarkdownWidget({ widget }: MarkdownWidgetProps) {
  const config = widget.config as unknown as unknown as MarkdownConfig
  const content = config?.content || ''

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No content
      </div>
    )
  }

  // Simple markdown rendering (basic HTML conversion)
  // In production, you might want to use a proper markdown library
  const renderMarkdown = (md: string): string => {
    return md
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      // Code
      .replace(/`([^`]+)`/gim, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      // Line breaks
      .replace(/\n/gim, '<br />')
  }

  return (
    <ScrollArea className="h-full">
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    </ScrollArea>
  )
}











