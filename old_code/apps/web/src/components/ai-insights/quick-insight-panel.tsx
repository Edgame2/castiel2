'use client'

/**
 * QuickInsightPanel Component
 * Provides quick AI insights for a shard
 */

import { useState } from 'react'
import {
  Sparkles,
  FileText,
  AlertTriangle,
  TrendingUp,
  CheckSquare,
  GitCompare,
  LineChart,
  Loader2,
  ChevronDown,
  MessageSquare,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useQuickInsight, useSuggestions } from '@/hooks/use-insights'
import { StreamingText } from './streaming-text'
import { FeedbackButtons } from './feedback-buttons'
import { ShareInsightDialog } from '@/components/collaborative-insights'
import { AIInsightErrorDisplay } from './error-handler'

type QuickInsightType =
  | 'summary'
  | 'key_points'
  | 'risks'
  | 'opportunities'
  | 'next_steps'
  | 'comparison'
  | 'trends'

interface QuickInsightPanelProps {
  shardId: string
  shardName?: string
  className?: string
  onStartConversation?: (question: string) => void
}

const INSIGHT_TYPES: {
  type: QuickInsightType
  label: string
  icon: typeof Sparkles
  description: string
}[] = [
  {
    type: 'summary',
    label: 'Summary',
    icon: FileText,
    description: 'Get a quick overview',
  },
  {
    type: 'key_points',
    label: 'Key Points',
    icon: CheckSquare,
    description: 'Extract main takeaways',
  },
  {
    type: 'risks',
    label: 'Risks',
    icon: AlertTriangle,
    description: 'Identify potential risks',
  },
  {
    type: 'opportunities',
    label: 'Opportunities',
    icon: TrendingUp,
    description: 'Find opportunities',
  },
  {
    type: 'next_steps',
    label: 'Next Steps',
    icon: CheckSquare,
    description: 'Recommended actions',
  },
  {
    type: 'comparison',
    label: 'Compare',
    icon: GitCompare,
    description: 'Compare with similar',
  },
  {
    type: 'trends',
    label: 'Trends',
    icon: LineChart,
    description: 'Analyze trends',
  },
]

export function QuickInsightPanel({
  shardId,
  shardName,
  className,
  onStartConversation,
}: QuickInsightPanelProps) {
  const [selectedType, setSelectedType] = useState<QuickInsightType | null>(null)
  const [insightContent, setInsightContent] = useState<string | null>(null)
  const [insightId, setInsightId] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)

  const quickInsight = useQuickInsight()
  const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestions(shardId, {
    enabled: !selectedType,
  })

  const handleGenerateInsight = async (type: QuickInsightType) => {
    setSelectedType(type)
    setInsightContent(null)
    setInsightId(null)

    try {
      const result = await quickInsight.mutateAsync({
        shardId,
        type,
        options: {
          format: 'detailed',
        },
      })
      setInsightContent(result.content)
      setInsightId(result.id)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleReset = () => {
    setSelectedType(null)
    setInsightContent(null)
    setInsightId(null)
  }

  const currentTypeInfo = selectedType
    ? INSIGHT_TYPES.find((t) => t.type === selectedType)
    : null

  return (
    <>
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Insights</CardTitle>
              {shardName && (
                <CardDescription className="text-xs truncate max-w-[200px]">
                  {shardName}
                </CardDescription>
              )}
            </div>
          </div>

          {/* Insight Type Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {currentTypeInfo ? (
                  <>
                    <currentTypeInfo.icon className="h-4 w-4 mr-1" />
                    {currentTypeInfo.label}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Generate
                  </>
                )}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {INSIGHT_TYPES.map((insight) => (
                <DropdownMenuItem
                  key={insight.type}
                  onClick={() => handleGenerateInsight(insight.type)}
                  className="gap-2"
                >
                  <insight.icon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{insight.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {insight.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {quickInsight.isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating {currentTypeInfo?.label.toLowerCase()}...
            </span>
          </div>
        )}

        {/* Insight Content */}
        {insightContent && !quickInsight.isPending && (
          <div className="space-y-4">
            <ScrollArea className="max-h-[300px]">
              <StreamingText content={insightContent} />
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                {insightId && (
                  <FeedbackButtons
                    messageId={insightId}
                    content={insightContent}
                    showRegenerate={false}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                >
                  Try another
                </Button>
                {onStartConversation && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStartConversation(`Tell me more about ${shardName}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Continue chat
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Initial State - Quick Actions */}
        {!selectedType && !quickInsight.isPending && (
          <div className="space-y-4">
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {INSIGHT_TYPES.slice(0, 4).map((insight) => (
                <Button
                  key={insight.type}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto py-2"
                  onClick={() => handleGenerateInsight(insight.type)}
                >
                  <insight.icon className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{insight.label}</span>
                </Button>
              ))}
            </div>

            {/* Suggested Questions */}
            {suggestionsData && suggestionsData.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Suggested questions
                </p>
                <div className="space-y-1">
                  {suggestionsData.suggestions.slice(0, 3).map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => onStartConversation?.(suggestion.question)}
                    >
                      <MessageSquare className="h-3 w-3 mr-2 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{suggestion.question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {quickInsight.isError && quickInsight.error && (
          <div className="py-4">
            <AIInsightErrorDisplay
              error={quickInsight.error}
              onRetry={() => selectedType && handleGenerateInsight(selectedType)}
            />
          </div>
        )}
        </CardContent>
      </Card>

      {/* Share Dialog */}
      {insightContent && insightId && (
        <ShareInsightDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          sourceType="quick_insight"
          sourceId={insightId}
          defaultTitle={`${currentTypeInfo?.label || 'Insight'} - ${shardName || 'Shard'}`}
          defaultContent={insightContent}
          defaultSummary={insightContent.substring(0, 200)}
          relatedShardIds={[shardId]}
          onSuccess={() => {
            setShowShareDialog(false);
          }}
        />
      )}
    </>
  )
}

/**
 * Compact version for embedding in other components
 */
export function QuickInsightButton({
  shardId,
  className,
  onInsightGenerated,
}: {
  shardId: string
  className?: string
  onInsightGenerated?: (content: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const quickInsight = useQuickInsight()

  const handleGenerateInsight = async (type: QuickInsightType) => {
    setIsOpen(false)

    try {
      const result = await quickInsight.mutateAsync({
        shardId,
        type,
        options: { format: 'brief' },
      })
      onInsightGenerated?.(result.content)
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          disabled={quickInsight.isPending}
        >
          {quickInsight.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="ml-1">AI</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {INSIGHT_TYPES.map((insight) => (
          <DropdownMenuItem
            key={insight.type}
            onClick={() => handleGenerateInsight(insight.type)}
            className="gap-2"
          >
            <insight.icon className="h-4 w-4" />
            {insight.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default QuickInsightPanel











