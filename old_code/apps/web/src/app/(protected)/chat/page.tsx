'use client'

/**
 * Chat Page
 * Main AI chat interface for creating new conversations
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageSquare, Clock, Archive, Search, MoreHorizontal, Trash2, Sparkles, Filter, ArrowUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { ChatInterface, ConversationTemplateSelector } from '@/components/ai-insights'
import { useConversations, useDeleteConversation, useArchiveConversation } from '@/hooks/use-insights'
import { formatDistanceToNow } from 'date-fns'

export default function ChatPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<('active' | 'archived')[]>(['active'])
  const [visibilityFilter, setVisibilityFilter] = useState<('private' | 'shared' | 'public')[] | undefined>(undefined)
  const [orderBy, setOrderBy] = useState<'createdAt' | 'updatedAt' | 'lastActivityAt' | 'messageCount'>('lastActivityAt')
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const { data: conversationsData, isLoading } = useConversations({
    status: statusFilter,
    visibility: visibilityFilter,
    search: search || undefined,
    includeLinkedShardsCount: true,
    limit: 50,
  })

  const deleteConversation = useDeleteConversation()
  const archiveConversation = useArchiveConversation()

  const handleNewChat = () => {
    router.push('/chat/new')
  }

  const handleConversationClick = (id: string) => {
    router.push(`/chat/${id}`)
  }

  const handleConversationCreated = (conversationId: string) => {
    router.push(`/chat/${conversationId}`)
  }

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteConversation.mutateAsync({ id: deleteId })
      setDeleteId(null)
    }
  }

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await archiveConversation.mutateAsync({ id })
  }

  const conversations = conversationsData?.conversations || []

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-lg">AI Chat</h1>
            <div className="flex items-center gap-2">
              <ConversationTemplateSelector
                onConversationCreated={handleConversationCreated}
                trigger={
                  <Button variant="outline" size="sm">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Template
                  </Button>
                }
              />
              <Button size="sm" onClick={handleNewChat}>
                <Plus className="h-4 w-4 mr-1" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Filters Row */}
            <div className="flex items-center gap-2">
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Filter className="h-3 w-3 mr-1" />
                    Filters
                    {(visibilityFilter && visibilityFilter.length > 0) && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1">
                        {visibilityFilter.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={statusFilter.includes('active') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (statusFilter.includes('active')) {
                              // Don't allow deselecting if it's the only one
                              if (statusFilter.length > 1) {
                                setStatusFilter(statusFilter.filter(s => s !== 'active'))
                              }
                            } else {
                              setStatusFilter([...statusFilter, 'active'])
                            }
                          }}
                        >
                          Active
                        </Button>
                        <Button
                          variant={statusFilter.includes('archived') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (statusFilter.includes('archived')) {
                              // Don't allow deselecting if it's the only one
                              if (statusFilter.length > 1) {
                                setStatusFilter(statusFilter.filter(s => s !== 'archived'))
                              }
                            } else {
                              setStatusFilter([...statusFilter, 'archived'])
                            }
                          }}
                        >
                          Archived
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Visibility</Label>
                      <Select
                        value={visibilityFilter?.join(',') || 'all'}
                        onValueChange={(value) => {
                          if (value === 'all') {
                            setVisibilityFilter(undefined)
                          } else {
                            setVisibilityFilter([value as 'private' | 'shared' | 'public'])
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="shared">Shared</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(visibilityFilter && visibilityFilter.length > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVisibilityFilter(undefined)}
                        className="w-full"
                      >
                        Clear visibility filter
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    Sort
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Sort by</Label>
                      <Select
                        value={orderBy}
                        onValueChange={(value) => setOrderBy(value as typeof orderBy)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lastActivityAt">Last Activity</SelectItem>
                          <SelectItem value="updatedAt">Last Updated</SelectItem>
                          <SelectItem value="createdAt">Created Date</SelectItem>
                          <SelectItem value="messageCount">Message Count</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Order</Label>
                      <Select
                        value={orderDirection}
                        onValueChange={(value) => setOrderDirection(value as 'asc' | 'desc')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Newest First</SelectItem>
                          <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {search || (visibilityFilter && visibilityFilter.length > 0) 
                    ? 'No conversations match your filters' 
                    : 'No conversations yet'}
                </p>
                <p className="text-xs">
                  {search || (visibilityFilter && visibilityFilter.length > 0)
                    ? 'Try adjusting your search or filters'
                    : 'Start a new chat to get AI insights'}
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    'group flex items-start gap-2 p-3 rounded-lg cursor-pointer',
                    'hover:bg-accent transition-colors'
                  )}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {conversation.title || 'Untitled Conversation'}
                    </p>
                    {conversation.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastActivityAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {conversation.messageCount} msgs
                      </Badge>
                      {conversation.linkedShardsCount !== undefined && conversation.linkedShardsCount > 0 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {conversation.linkedShardsCount} linked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => handleArchive(e, conversation.id)}
                        disabled={archiveConversation.isPending || conversation.status === 'archived'}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteId(conversation.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - Empty State or Selected Chat */}
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Start a Conversation</h2>
          <p className="text-muted-foreground mb-6">
            Ask questions, get insights, and explore your data with AI assistance.
          </p>
          <Button onClick={handleNewChat}>
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
              onClick={handleDeleteConfirm}
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






