"use client"

import { Mail, ExternalLink, RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"
import { formatDistanceToNow } from "date-fns"
import { useGmailInbox } from "@/hooks/use-google-workspace"
import { apiClient } from "@/lib/api/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"

interface GmailInboxWidgetProps {
  widget: Widget
  data: unknown
}

interface GmailInboxData {
  unreadCount: number
  recentMessages: Array<{
    id: string
    threadId: string
    snippet: string
    subject: string
    from: string
    date: string
    labelIds: string[]
  }>
}

export function GmailInboxWidget({ widget, data }: GmailInboxWidgetProps) {
  const [isMarkingRead, setIsMarkingRead] = useState<string | null>(null)
  const queryClient = useQueryClient()
  
  // Get integration ID from widget config
  const integrationId = (widget.config as any)?.integrationId as string | undefined
  const limit = (widget.config as any)?.limit as number || 5

  const { data: inboxData, isLoading, error, refetch } = useGmailInbox(
    integrationId || '',
    { limit }
  )

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      if (!integrationId) throw new Error('Integration ID not configured')
      
      await apiClient.post(
        `/api/tenant/integrations/${integrationId}/gmail/messages/${messageId}/mark-read`
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['google-workspace', 'gmail', integrationId],
      })
      setIsMarkingRead(null)
    },
    onError: () => {
      setIsMarkingRead(null)
    },
  })

  const handleMarkAsRead = async (messageId: string) => {
    setIsMarkingRead(messageId)
    await markAsRead.mutateAsync(messageId)
  }

  // Use provided data or fetched data
  const inbox = (data as GmailInboxData) || inboxData
  const isLoadingData = !data && isLoading
  const hasError = !data && error

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Mail className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load Gmail inbox</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!inbox) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    )
  }

  const unreadCount = inbox.unreadCount || 0
  const messages = inbox.recentMessages || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <span className="font-semibold">Gmail Inbox</span>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No unread messages
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">
                      {message.from}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(message.date), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-1 truncate">
                    {message.subject || '(No subject)'}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {message.snippet}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(message.id)}
                    disabled={isMarkingRead === message.id}
                    title="Mark as read"
                  >
                    {isMarkingRead === message.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`https://mail.google.com/mail/u/0/#inbox/${message.threadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Gmail"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="mt-4 pt-4 border-t">
        <Button variant="outline" className="w-full" size="sm" asChild>
          <Link
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Gmail
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  )
}







