'use client'

/**
 * Entity Context Sidebar Component
 * Displays linked entities (documents, opportunities, notes) referenced in the conversation
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Briefcase, StickyNote, Link2, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ChatMessage } from '@/lib/api/insights'

interface EntityInfo {
  shardId: string
  shardName: string
  shardTypeId: string
  relevance: number // Highest relevance score from all mentions
  mentionCount: number // How many times this entity was mentioned
  firstMentionedAt: Date // When this entity was first mentioned
}

interface EntityContextSidebarProps {
  messages: ChatMessage[]
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

/**
 * Get icon for shard type
 */
function getShardTypeIcon(shardTypeId: string) {
  if (shardTypeId === 'c_document') return FileText
  if (shardTypeId === 'c_opportunity') return Briefcase
  if (shardTypeId === 'c_note') return StickyNote
  return Link2
}

/**
 * Get display name for shard type
 */
function getShardTypeName(shardTypeId: string): string {
  if (shardTypeId === 'c_document') return 'Document'
  if (shardTypeId === 'c_opportunity') return 'Opportunity'
  if (shardTypeId === 'c_note') return 'Note'
  return shardTypeId.replace('c_', '').replace(/_/g, ' ')
}

export function EntityContextSidebar({
  messages,
  isOpen = true,
  onClose,
  className,
}: EntityContextSidebarProps) {
  const router = useRouter()

  // Extract unique entities from messages
  const entities = useMemo(() => {
    const entityMap = new Map<string, EntityInfo>()

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt)

      // Extract from contextSources
      if (message.contextSources) {
        message.contextSources.forEach((source) => {
          const existing = entityMap.get(source.shardId)
          if (existing) {
            // Update relevance if higher, increment mention count
            existing.relevance = Math.max(existing.relevance, source.score || 0)
            existing.mentionCount++
            if (messageDate < existing.firstMentionedAt) {
              existing.firstMentionedAt = messageDate
            }
          } else {
            entityMap.set(source.shardId, {
              shardId: source.shardId,
              shardName: source.shardName,
              shardTypeId: source.shardTypeId,
              relevance: source.score || 0,
              mentionCount: 1,
              firstMentionedAt: messageDate,
            })
          }
        })
      }

      // Extract from citations
      if (message.citations) {
        message.citations.forEach((citation) => {
          const existing = entityMap.get(citation.sourceShardId)
          if (existing) {
            existing.mentionCount++
            existing.relevance = Math.max(existing.relevance, citation.confidence || 0)
            if (messageDate < existing.firstMentionedAt) {
              existing.firstMentionedAt = messageDate
            }
          } else {
            entityMap.set(citation.sourceShardId, {
              shardId: citation.sourceShardId,
              shardName: citation.sourceShardName,
              shardTypeId: 'c_document', // Citations are typically documents
              relevance: citation.confidence || 0,
              mentionCount: 1,
              firstMentionedAt: messageDate,
            })
          }
        })
      }
    })

    // Convert to array and sort by relevance (highest first), then by mention count
    return Array.from(entityMap.values()).sort((a, b) => {
      if (Math.abs(a.relevance - b.relevance) > 0.01) {
        return b.relevance - a.relevance
      }
      return b.mentionCount - a.mentionCount
    })
  }, [messages])

  const handleEntityClick = (entity: EntityInfo) => {
    router.push(`/shards/${entity.shardId}`)
  }

  if (!isOpen || entities.length === 0) {
    return null
  }

  // Group entities by type
  const entitiesByType = useMemo(() => {
    const grouped: Record<string, EntityInfo[]> = {}
    entities.forEach((entity) => {
      if (!grouped[entity.shardTypeId]) {
        grouped[entity.shardTypeId] = []
      }
      grouped[entity.shardTypeId].push(entity)
    })
    return grouped
  }, [entities])

  return (
    <div
      className={cn(
        'w-80 border-l bg-muted/30 flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Linked Entities</h3>
          <Badge variant="secondary" className="text-xs">
            {entities.length}
          </Badge>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Entity List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {Object.entries(entitiesByType).map(([shardTypeId, typeEntities]) => {
            const Icon = getShardTypeIcon(shardTypeId)
            const typeName = getShardTypeName(shardTypeId)

            return (
              <div key={shardTypeId} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{typeName}s</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {typeEntities.length}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {typeEntities.map((entity) => (
                    <TooltipProvider key={entity.shardId}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleEntityClick(entity)}
                            className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors group"
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5">
                                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {entity.shardName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {entity.relevance > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {Math.round(entity.relevance * 100)}%
                                    </Badge>
                                  )}
                                  {entity.mentionCount > 1 && (
                                    <span className="text-xs text-muted-foreground">
                                      {entity.mentionCount}x
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{entity.shardName}</p>
                            <p className="text-xs text-muted-foreground">
                              Type: {typeName}
                            </p>
                            {entity.relevance > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Relevance: {Math.round(entity.relevance * 100)}%
                              </p>
                            )}
                            {entity.mentionCount > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Mentioned {entity.mentionCount} times
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Click to view details
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}






