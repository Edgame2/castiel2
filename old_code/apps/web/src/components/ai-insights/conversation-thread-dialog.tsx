'use client'

/**
 * ConversationThreadDialog Component
 * Dialog for creating threads and adding conversations to threads
 */

import { useState } from 'react'
import { Hash, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateThread, useAddConversationToThread, useListThreads } from '@/hooks/use-insights'
import { toast } from 'sonner'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

interface ConversationThreadDialogProps {
  conversationId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ConversationThreadDialog({
  conversationId,
  open,
  onOpenChange,
  onSuccess,
}: ConversationThreadDialogProps) {
  const [mode, setMode] = useState<'create' | 'add'>('create')
  const [threadTopic, setThreadTopic] = useState('')
  const [selectedThreadId, setSelectedThreadId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const createThread = useCreateThread()
  const addToThread = useAddConversationToThread()
  const { data: threadsData, isLoading: threadsLoading } = useListThreads(
    mode === 'add' && open ? {} : undefined
  )

  const threads = threadsData?.threads || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'create') {
      if (!threadTopic.trim()) {
        toast.error('Thread topic is required')
        return
      }

      try {
        await createThread.mutateAsync({
          threadTopic: threadTopic.trim(),
          title: title.trim() || undefined,
        })
        toast.success('Thread created successfully')
        handleClose()
        onSuccess?.()
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to create thread', 3, {
          errorMessage: errorObj.message,
          conversationId,
        })
        toast.error('Failed to create thread')
      }
    } else {
      // Add conversation to thread
      if (!selectedThreadId) {
        toast.error('Please select a thread')
        return
      }

      if (!conversationId) {
        toast.error('No conversation selected')
        return
      }

      try {
        await addToThread.mutateAsync({
          conversationId,
          threadId: selectedThreadId,
        })
        toast.success('Conversation added to thread')
        handleClose()
        onSuccess?.()
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to add conversation to thread', 3, {
          errorMessage: errorObj.message,
          conversationId,
          threadId: selectedThreadId,
        })
        toast.error('Failed to add conversation to thread')
      }
    }
  }

  const handleClose = () => {
    setMode('create')
    setThreadTopic('')
    setSelectedThreadId('')
    setTitle('')
    setDescription('')
    onOpenChange(false)
  }

  const isLoading = createThread.isPending || addToThread.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Thread' : 'Add to Thread'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new conversation thread to group related conversations together.'
              : 'Add this conversation to an existing thread.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Mode Toggle */}
            {conversationId && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'create' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('create')}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Thread
                </Button>
                <Button
                  type="button"
                  variant={mode === 'add' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('add')}
                  className="flex-1"
                >
                  <Hash className="h-4 w-4 mr-1" />
                  Add to Thread
                </Button>
              </div>
            )}

            {mode === 'create' ? (
              <>
                {/* Thread Topic */}
                <div className="space-y-2">
                  <Label htmlFor="thread-topic">
                    Thread Topic <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="thread-topic"
                    placeholder="e.g., Project Planning, Customer Support"
                    value={threadTopic}
                    onChange={(e) => setThreadTopic(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    A topic that describes what this thread is about
                  </p>
                </div>

                {/* Title (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Q1 Planning Discussions"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Description (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional context about this thread..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Thread Selection */}
                <div className="space-y-2">
                  <Label htmlFor="thread-select">
                    Select Thread <span className="text-destructive">*</span>
                  </Label>
                  {threadsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No threads found. Create a new thread first.
                    </div>
                  ) : (
                    <Select
                      value={selectedThreadId}
                      onValueChange={setSelectedThreadId}
                      required
                    >
                      <SelectTrigger id="thread-select">
                        <SelectValue placeholder="Select a thread..." />
                      </SelectTrigger>
                      <SelectContent>
                        {threads.map((thread: { id: string; threadTopic?: string; messageCount?: number }) => (
                          <SelectItem key={thread.id} value={thread.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {thread.threadTopic || 'Untitled Thread'}
                              </span>
                              {thread.messageCount !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {thread.messageCount} messages
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Adding...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Thread
                    </>
                  ) : (
                    <>
                      <Hash className="h-4 w-4 mr-2" />
                      Add to Thread
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

