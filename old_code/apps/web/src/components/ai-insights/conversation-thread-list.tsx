"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus, Search, Loader2, Hash, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useListThreads, useCreateThread } from "@/hooks/use-insights"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface Thread {
  id: string
  title?: string
  threadTopic: string
  messageCount: number
  lastActivityAt: string
  createdAt: string
}

interface ConversationThreadListProps {
  projectId?: string
  onThreadSelect?: (threadId: string) => void
  className?: string
}

export function ConversationThreadList({
  projectId,
  onThreadSelect,
  className,
}: ConversationThreadListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data, isLoading, error } = useListThreads({
    projectId,
    topic: searchQuery || undefined,
    limit: 50,
  })

  const createThread = useCreateThread()

  const threads: Thread[] = data?.threads || []

  const handleThreadClick = (threadId: string) => {
    if (onThreadSelect) {
      onThreadSelect(threadId)
    } else {
      router.push(`/chat/${threadId}`)
    }
  }

  const handleCreateThread = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const threadTopic = formData.get("threadTopic" as any) as string
    const title = formData.get("title" as any) as string

    if (!threadTopic.trim()) {
      toast.error("Thread topic is required")
      return
    }

    try {
      const result = await createThread.mutateAsync({
        title: title || undefined,
        threadTopic: threadTopic.trim(),
        tags: projectId ? [`project:${projectId}`] : undefined,
      })
      toast.success("Thread created successfully")
      setCreateDialogOpen(false)
      handleThreadClick(result.threadId)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Failed to create thread", 3, {
        errorMessage: errorObj.message,
      })
      toast.error("Failed to create thread")
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Conversation Threads
              </CardTitle>
              <CardDescription>
                Group related conversations by topic or project
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Thread
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateThread}>
                  <DialogHeader>
                    <DialogTitle>Create New Thread</DialogTitle>
                    <DialogDescription>
                      Create a new conversation thread to group related conversations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="threadTopic">
                        Thread Topic <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="threadTopic"
                        name="threadTopic"
                        placeholder="e.g., Project Planning, Customer Support, Research"
                        required
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title (Optional)</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="e.g., Q4 Planning Thread"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createThread.isPending}>
                      {createThread.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Thread
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threads by topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Thread List */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-destructive">
              Failed to load threads
            </div>
          ) : threads.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery
                ? "No threads found matching your search"
                : "No threads yet. Create one to get started."}
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => handleThreadClick(thread.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary shrink-0">
                      <Hash className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm truncate">
                          {thread.title || thread.threadTopic}
                        </h4>
                        {thread.title && (
                          <Badge variant="secondary" className="text-xs">
                            {thread.threadTopic}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {thread.messageCount} messages
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(thread.lastActivityAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}






