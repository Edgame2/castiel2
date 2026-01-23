'use client'

/**
 * Conversation Search Component
 * Advanced search interface for conversations with filters
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Calendar, User, Tag, X, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useSearchConversations } from '@/hooks/use-insights'
import { Skeleton } from '@/components/ui/skeleton'

interface ConversationSearchProps {
  onSelectConversation?: (conversationId: string) => void
  className?: string
}

export function ConversationSearch({ onSelectConversation, className }: ConversationSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState<Date | undefined>()
  const [toDate, setToDate] = useState<Date | undefined>()
  const [participantId, setParticipantId] = useState<string | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useSearchConversations({
    q: query,
    fromDate: fromDate?.toISOString(),
    toDate: toDate?.toISOString(),
    participantId,
    tags: tags.length > 0 ? tags : undefined,
    enabled: query.length >= 2,
  })

  const handleConversationClick = (conversationId: string) => {
    if (onSelectConversation) {
      onSelectConversation(conversationId)
    } else {
      router.push(`/chat/${conversationId}`)
    }
  }

  const handleTagAdd = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const clearFilters = () => {
    setFromDate(undefined)
    setToDate(undefined)
    setParticipantId(undefined)
    setTags([])
  }

  const hasActiveFilters = fromDate || toDate || participantId || tags.length > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-20"
        />
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7',
                hasActiveFilters && 'text-primary'
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filters</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !fromDate && 'text-muted-foreground'
                        )}
                      >
                        {fromDate ? format(fromDate, 'PPP') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !toDate && 'text-muted-foreground'
                        )}
                      >
                        {toDate ? format(toDate, 'PPP') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Participant Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Participant
                </label>
                <Input
                  placeholder="User ID"
                  value={participantId || ''}
                  onChange={(e) => setParticipantId(e.target.value || undefined)}
                />
              </div>

              {/* Tags Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleTagAdd()
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleTagAdd}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => handleTagRemove(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {fromDate && (
            <Badge variant="outline" className="gap-1">
              From: {format(fromDate, 'MMM d, yyyy')}
              <button onClick={() => setFromDate(undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {toDate && (
            <Badge variant="outline" className="gap-1">
              To: {format(toDate, 'MMM d, yyyy')}
              <button onClick={() => setToDate(undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {participantId && (
            <Badge variant="outline" className="gap-1">
              Participant: {participantId}
              <button onClick={() => setParticipantId(undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="gap-1">
              {tag}
              <button onClick={() => handleTagRemove(tag)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="border rounded-lg bg-background">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data && data.conversations.length > 0 ? (
            <div className="divide-y">
              {data.conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation.id)}
                  className="w-full text-left p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {conversation.title || 'Untitled Conversation'}
                      </h4>
                      {conversation.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {conversation.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {conversation.messageCount} messages
                        </Badge>
                        {conversation.tags && conversation.tags.length > 0 && (
                          <div className="flex gap-1">
                            {conversation.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No conversations found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}






