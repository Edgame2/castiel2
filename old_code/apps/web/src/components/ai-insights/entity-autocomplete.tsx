/**
 * Entity Autocomplete Component
 * Provides @mention-style entity autocomplete for chat input
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Briefcase, StickyNote, Search } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useEntityAutocomplete } from '@/hooks/use-insights'

interface EntityAutocompleteProps {
  query: string
  projectId?: string
  onSelect: (entity: { shardId: string; name: string; shardType: string }) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export function EntityAutocomplete({
  query,
  projectId,
  onSelect,
  onClose,
  position,
}: EntityAutocompleteProps) {
  const { data, isLoading } = useEntityAutocomplete(query, projectId, query.length >= 2)

  const suggestions = data?.suggestions || []

  const getEntityIcon = (shardType: string) => {
    switch (shardType) {
      case 'c_document':
        return <FileText className="h-4 w-4" />
      case 'c_opportunity':
        return <Briefcase className="h-4 w-4" />
      case 'c_note':
        return <StickyNote className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getEntityTypeLabel = (shardType: string) => {
    switch (shardType) {
      case 'c_document':
        return 'Document'
      case 'c_opportunity':
        return 'Opportunity'
      case 'c_note':
        return 'Note'
      default:
        return 'Entity'
    }
  }

  if (!query || query.length < 2 || suggestions.length === 0) {
    return null
  }

  return (
    <div
      className="absolute z-50 w-[300px] rounded-md border bg-popover text-popover-foreground shadow-md"
      style={{
        top: position?.top ? `${position.top}px` : 'auto',
        left: position?.left ? `${position.left}px` : 'auto',
        bottom: position?.top ? 'auto' : '0',
      }}
    >
      <Command>
        <CommandList>
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Searching...</div>
          ) : suggestions.length === 0 ? (
            <CommandEmpty>No entities found</CommandEmpty>
          ) : (
            <CommandGroup heading="Entities">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.shardId}
                  onSelect={() => {
                    onSelect({
                      shardId: suggestion.shardId,
                      name: suggestion.name,
                      shardType: suggestion.shardType,
                    })
                    onClose()
                  }}
                  className="flex items-start gap-3 p-3"
                >
                  <div className="mt-0.5 text-muted-foreground">
                    {getEntityIcon(suggestion.shardType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{suggestion.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getEntityTypeLabel(suggestion.shardType)}
                      </Badge>
                      {suggestion.preview && (
                        <span className="text-xs text-muted-foreground truncate">
                          {suggestion.preview}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  )
}

/**
 * Hook to detect @mentions in text and extract entity query
 */
export function useEntityMentionDetection(
  text: string,
  cursorPosition: number
): { query: string; startPos: number; endPos: number } | null {
  // Look for @mention pattern before cursor
  const textBeforeCursor = text.substring(0, cursorPosition)
  const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s\-_]*)$/)

  if (mentionMatch) {
    const startPos = cursorPosition - mentionMatch[0].length
    const query = mentionMatch[1].trim()
    return {
      query,
      startPos,
      endPos: cursorPosition,
    }
  }

  return null
}

