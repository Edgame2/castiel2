'use client'

/**
 * Chat Conversation Page
 * View and continue an existing conversation
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings2, Share2, MoreHorizontal, Trash2, Archive, Download, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatInterface } from '@/components/ai-insights'
import { ConversationAnalytics } from '@/components/ai-insights/conversation-analytics'
import { ConversationExportDialog } from '@/components/ai-insights/conversation-export-dialog'
import { ConversationSummaryPanel } from '@/components/ai-insights/conversation-summary-panel'
import { ConversationLinkedShardsPanel } from '@/components/ai-insights/conversation-linked-shards-panel'
import { ConversationShareDialog } from '@/components/ai-insights/conversation-share-dialog'
import { ConversationSettingsDialog } from '@/components/ai-insights/conversation-settings-dialog'
import { ConversationParticipantsPanel } from '@/components/ai-insights/conversation-participants-panel'
import { ConversationThreadDialog } from '@/components/ai-insights/conversation-thread-dialog'
import { useConversation, useDeleteConversation, useUpdateConversation, useArchiveConversation, useUnarchiveConversation } from '@/hooks/use-insights'
import { useState } from 'react'
import { use } from 'react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ConversationPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showThreadDialog, setShowThreadDialog] = useState(false)

  const { data: conversation, isLoading, error } = useConversation(id, {
    includeLinkedShards: true,
  })
  const deleteConversation = useDeleteConversation()
  const updateConversation = useUpdateConversation()
  const archiveConversation = useArchiveConversation()
  const unarchiveConversation = useUnarchiveConversation()

  const handleBack = () => {
    router.push('/chat')
  }

  const handleDelete = async () => {
    await deleteConversation.mutateAsync({ id })
    router.push('/chat')
  }

  const handleArchive = async () => {
    if (!conversation) return;
    if (conversation.status === 'archived') {
      await unarchiveConversation.mutateAsync({ id })
    } else {
      await archiveConversation.mutateAsync({ id })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="border-b px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full" />
        </div>
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground mb-4">Conversation not found</p>
        <Button onClick={handleBack}>Go back</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">
              {conversation.title || 'Untitled Conversation'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{conversation.messageCount} messages</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs px-1 py-0">
                {conversation.visibility}
              </Badge>
              {conversation.status === 'archived' && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    Archived
                  </Badge>
                </>
              )}
              {conversation.linkedShardsCount !== undefined && conversation.linkedShardsCount > 0 && (
                <>
                  <span>•</span>
                  <span>{conversation.linkedShardsCount} linked</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ConversationExportDialog
            conversationId={id}
            conversationTitle={conversation.title}
            trigger={
              <Button variant="ghost" size="icon" title="Export conversation">
                <Download className="h-4 w-4" />
              </Button>
            }
          />
          <Button 
            variant="ghost" 
            size="icon" 
            title="Share conversation"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <ConversationShareDialog
            conversationId={id}
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            title="Thread management"
            onClick={() => setShowThreadDialog(true)}
          >
            <Hash className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            title="Conversation settings"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          <ConversationSettingsDialog
            conversationId={id}
            open={showSettingsDialog}
            onOpenChange={setShowSettingsDialog}
          />
          <ConversationThreadDialog
            conversationId={id}
            open={showThreadDialog}
            onOpenChange={setShowThreadDialog}
            onSuccess={() => {
              // Refresh conversation data
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={handleArchive}
                disabled={archiveConversation.isPending || unarchiveConversation.isPending}
              >
                <Archive className="h-4 w-4 mr-2" />
                {conversation.status === 'archived' ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="linked">Linked Shards</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
            <ChatInterface
              conversationId={id}
              className="h-full"
              assistantName={conversation.assistantName || 'AI Assistant'}
            />
          </TabsContent>
          <TabsContent value="summary" className="flex-1 overflow-auto mt-0 p-4">
            <ConversationSummaryPanel conversationId={id} />
          </TabsContent>
          <TabsContent value="analytics" className="flex-1 overflow-auto mt-0 p-4">
            <ConversationAnalytics conversationId={id} />
          </TabsContent>
          <TabsContent value="linked" className="flex-1 overflow-auto mt-0 p-4">
            <ConversationLinkedShardsPanel conversationId={id} />
          </TabsContent>
          <TabsContent value="participants" className="flex-1 overflow-auto mt-0 p-4">
            <ConversationParticipantsPanel conversationId={id} className="h-full" />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}






