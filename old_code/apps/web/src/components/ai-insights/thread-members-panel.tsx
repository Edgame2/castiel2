"use client"

import { useRouter } from "next/navigation"
import { MessageSquare, ExternalLink, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useThreadMembers, useThreadSummary, useRemoveConversationFromThread } from "@/hooks/use-insights"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface ThreadMembersPanelProps {
  threadId: string
  currentConversationId?: string
  onClose?: () => void
  className?: string
}

interface ThreadMember {
  id: string
  title?: string
  threadOrder?: number
  messageCount: number
  lastActivityAt: string
  createdAt: string
}

export function ThreadMembersPanel({
  threadId,
  currentConversationId,
  onClose,
  className,
}: ThreadMembersPanelProps) {
  const router = useRouter()
  const { data: membersData, isLoading: membersLoading } = useThreadMembers(threadId)
  const { data: summaryData, isLoading: summaryLoading } = useThreadSummary(threadId)
  const removeFromThread = useRemoveConversationFromThread()

  const members: ThreadMember[] = membersData?.members || []
  const summary = summaryData

  const handleMemberClick = (conversationId: string) => {
    router.push(`/chat/${conversationId}`)
  }

  const handleRemoveFromThread = async (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation()
    if (
      !confirm(
        "Are you sure you want to remove this conversation from the thread?"
      )
    ) {
      return
    }

    try {
      await removeFromThread.mutateAsync(conversationId)
      toast.success("Conversation removed from thread")
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to remove from thread", 3, {
        errorMessage: errorObj.message,
        conversationId,
        threadId,
      })
      toast.error("Failed to remove conversation from thread")
    }
  }

  // Sort members by threadOrder if available, otherwise by creation date
  const sortedMembers = [...members].sort((a, b) => {
    if (a.threadOrder !== undefined && b.threadOrder !== undefined) {
      return a.threadOrder - b.threadOrder
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return (
    <div
      className={cn(
        "w-80 border-l bg-muted/30 flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {summary?.threadTopic || "Thread Members"}
          </h3>
          {summary && (
            <p className="text-xs text-muted-foreground">
              {summary.memberCount} conversations, {summary.totalMessages} messages
            </p>
          )}
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {membersLoading || summaryLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sortedMembers.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No conversations in this thread
            </div>
          ) : (
            sortedMembers.map((member) => (
              <TooltipProvider key={member.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleMemberClick(member.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-md border hover:bg-accent transition-colors group",
                        currentConversationId === member.id && "bg-primary/10 border-primary"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {member.title || "Untitled Conversation"}
                            </p>
                            {member.threadOrder !== undefined && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                #{member.threadOrder + 1}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{member.messageCount} messages</span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(
                                new Date(member.lastActivityAt),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          {currentConversationId !== member.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleRemoveFromThread(e, member.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{member.title || "Untitled Conversation"}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.messageCount} messages
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active: {formatDistanceToNow(new Date(member.lastActivityAt), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Click to open conversation
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}






