"use client"

import { useState } from "react"
import { FileText, Sparkles, Loader2, RefreshCw, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useConversation, useGenerateConversationSummary } from "@/hooks/use-insights"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ConversationSummaryPanelProps {
  conversationId: string
  className?: string
}

export function ConversationSummaryPanel({
  conversationId,
  className,
}: ConversationSummaryPanelProps) {
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null)
  const { data: conversation, isLoading } = useConversation(conversationId, {
    includeMessages: false,
  })
  const generateSummary = useGenerateConversationSummary()

  const summary = conversation?.summary
  const messageCount = conversation?.messageCount || 0

  const handleGenerate = async (forceAI = false) => {
    try {
      const result = await generateSummary.mutateAsync({
        conversationId,
        options: { forceAI, maxMessages: 50 },
      })
      setLastGeneratedAt(new Date(result.generatedAt))
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Conversation Summary
            </CardTitle>
            <CardDescription>
              AI-generated summary of the conversation
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <Badge variant="secondary" className="text-xs">
                {messageCount} messages
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(false)}
              disabled={generateSummary.isPending || messageCount === 0}
            >
              {generateSummary.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {summary ? "Regenerate" : "Generate"}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {messageCount === 0 ? (
          <Alert>
            <AlertDescription>
              This conversation has no messages yet. Start chatting to generate a summary.
            </AlertDescription>
          </Alert>
        ) : summary ? (
          <div className="space-y-3">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
            {lastGeneratedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <CheckCircle className="h-3 w-3" />
                <span>
                  Generated {formatDistanceToNow(lastGeneratedAt, { addSuffix: true })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGenerate(true)}
                disabled={generateSummary.isPending}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Force AI Regeneration
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                No summary available yet. Click "Generate" to create an AI-powered summary
                of this conversation.
              </AlertDescription>
            </Alert>
            <div className="text-xs text-muted-foreground">
              <p>
                Summaries are automatically generated after {conversation?.messageCount || 0} messages,
                or you can generate one manually.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}






