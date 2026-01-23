"use client"

/**
 * AI Insights Dashboard Widget
 * Provides quick AI insights and suggested questions
 */

import { useState } from "react"
import Link from "next/link"
import { Sparkles, MessageSquare, Loader2, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"
import { cn } from "@/lib/utils"
import { useQuickInsight, useSuggestions } from "@/hooks/use-insights"
import { StreamingText } from "@/components/ai-insights"

interface AIInsightsWidgetProps {
  widget: Widget
}

interface AIInsightsConfig {
  mode?: 'suggestions' | 'quick-insight' | 'combined'
  shardId?: string
  insightType?: 'summary' | 'key_points' | 'risks' | 'opportunities' | 'next_steps'
  showSuggestionsCount?: number
  autoRefresh?: boolean
  refreshInterval?: number // in seconds
}

const DEFAULT_SUGGESTIONS = [
  { question: "What are my top priorities?", category: "recommendation", priority: 1 },
  { question: "Summarize recent activity", category: "summary", priority: 2 },
  { question: "What risks should I be aware of?", category: "analysis", priority: 3 },
  { question: "Show me opportunities to explore", category: "analysis", priority: 4 },
]

export function AIInsightsWidget({ widget }: AIInsightsWidgetProps) {
  const config = widget.config as AIInsightsConfig
  const mode = config?.mode || 'combined'
  const shardId = config?.shardId
  const insightType = config?.insightType || 'summary'
  const suggestionsCount = config?.showSuggestionsCount || 4

  const [generatedInsight, setGeneratedInsight] = useState<string | null>(null)
  
  const quickInsight = useQuickInsight()
  const { data: suggestionsData, isLoading: suggestionsLoading, refetch: refetchSuggestions } = 
    useSuggestions(shardId || '', { enabled: !!shardId && (mode === 'suggestions' || mode === 'combined') })

  const suggestions = suggestionsData?.suggestions || DEFAULT_SUGGESTIONS
  const displaySuggestions = suggestions.slice(0, suggestionsCount)

  const handleGenerateInsight = async () => {
    if (!shardId) return
    
    try {
      const result = await quickInsight.mutateAsync({
        shardId,
        type: insightType,
        options: { format: 'brief' },
      })
      setGeneratedInsight(result.content)
    } catch (error) {
      // Error handled by mutation
    }
  }

  // Suggestions-only mode
  if (mode === 'suggestions') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Suggested Questions</span>
          </div>
          {shardId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => refetchSuggestions()}
              disabled={suggestionsLoading}
            >
              <RefreshCw className={cn("h-3 w-3", suggestionsLoading && "animate-spin")} />
            </Button>
          )}
        </div>
        <SuggestionsList suggestions={displaySuggestions} />
      </div>
    )
  }

  // Quick-insight-only mode
  if (mode === 'quick-insight' && shardId) {
    return (
      <div className="space-y-3">
        {!generatedInsight && !quickInsight.isPending && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Get AI-powered insights instantly
            </p>
            <Button onClick={handleGenerateInsight} size="sm">
              <Sparkles className="h-4 w-4 mr-1" />
              Generate Insight
            </Button>
          </div>
        )}

        {quickInsight.isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Generating...</span>
          </div>
        )}

        {generatedInsight && (
          <div className="space-y-3">
            <ScrollArea className="max-h-[200px]">
              <StreamingText content={generatedInsight} className="text-sm" />
            </ScrollArea>
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedInsight(null)}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateInsight}
                disabled={quickInsight.isPending}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Combined mode (default)
  return (
    <div className="space-y-4">
      {/* Quick Insight Section */}
      {shardId && (
        <div className="space-y-2">
          {!generatedInsight && !quickInsight.isPending && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleGenerateInsight}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Get Quick Insight
            </Button>
          )}

          {quickInsight.isPending && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating insight...</span>
            </div>
          )}

          {generatedInsight && (
            <div className="p-3 rounded-md bg-muted/50 space-y-2">
              <ScrollArea className="max-h-[150px]">
                <StreamingText content={generatedInsight} className="text-sm" />
              </ScrollArea>
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setGeneratedInsight(null)}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>Ask AI</span>
        </div>
        <SuggestionsList suggestions={displaySuggestions} compact />
      </div>

      {/* Chat Link */}
      <Link
        href="/chat"
        className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors text-sm"
      >
        <span>Open AI Chat</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function SuggestionsList({ 
  suggestions, 
  compact = false 
}: { 
  suggestions: { question: string; category: string; priority: number }[]
  compact?: boolean 
}) {
  return (
    <div className={cn("space-y-1", compact && "space-y-0.5")}>
      {suggestions.map((suggestion, index) => (
        <Link
          key={index}
          href={`/chat/new?q=${encodeURIComponent(suggestion.question)}`}
          className={cn(
            "flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors",
            compact && "p-1.5"
          )}
        >
          <MessageSquare className={cn("h-4 w-4 mt-0.5 text-muted-foreground shrink-0", compact && "h-3 w-3")} />
          <span className={cn("text-sm", compact && "text-xs")}>{suggestion.question}</span>
        </Link>
      ))}
    </div>
  )
}

export default AIInsightsWidget











