"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { 
  Sparkles, 
  TrendingUp, 
  Bookmark, 
  Clock, 
  Hash,
  Lightbulb,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useActiveShardTypes } from "@/hooks/use-shard-types"
import { useCommandPaletteStore, type SavedSearch } from "./command-palette-store"
import { cn } from "@/lib/utils"

interface SearchSuggestionsProps {
  query: string
  onSelect: (suggestion: string) => void
  onSelectSaved?: (saved: SavedSearch) => void
  className?: string
}

/**
 * Search suggestions component that displays:
 * - AI-powered suggestions based on current query
 * - Popular/trending searches
 * - Saved searches
 * - Shard type-based suggestions
 */
export function SearchSuggestions({
  query,
  onSelect,
  onSelectSaved,
  className,
}: SearchSuggestionsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('common')
  const { 
    savedSearches, 
    popularSearches, 
    recentSearches,
    removeSavedSearch,
  } = useCommandPaletteStore()
  const { data: shardTypesData } = useActiveShardTypes()
  const shardTypes = shardTypesData?.items ?? []

  // Generate AI-powered suggestions based on query and context
  const aiSuggestions = React.useMemo(() => {
    if (!query || query.length < 2) return []
    
    const suggestions: string[] = []
    const lowerQuery = query.toLowerCase()
    
    // Add type-specific suggestions
    shardTypes.forEach((type) => {
      const typeName = type.displayName || type.name
      if (typeName.toLowerCase().includes(lowerQuery)) {
        suggestions.push(`${query} in ${typeName}`)
      }
    })
    
    // Add contextual suggestions
    const contextPatterns = [
      { pattern: /^find|search|look/i, suggestion: `${query} created this week` },
      { pattern: /^recent|latest|new/i, suggestion: `${query} by date` },
      { pattern: /^my|mine/i, suggestion: `${query} assigned to me` },
      { pattern: /document|doc|file/i, suggestion: `${query} with attachments` },
      { pattern: /project|task|issue/i, suggestion: `${query} in progress` },
    ]
    
    contextPatterns.forEach(({ pattern, suggestion }) => {
      if (pattern.test(query) && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion)
      }
    })
    
    // Add general suggestions
    if (suggestions.length < 3) {
      suggestions.push(
        `"${query}" exact match`,
        `${query} related content`,
      )
    }
    
    return suggestions.slice(0, 4)
  }, [query, shardTypes])

  // Filter popular searches that match query
  const matchingPopular = React.useMemo(() => {
    if (!query) return popularSearches.slice(0, 5)
    const lowerQuery = query.toLowerCase()
    return popularSearches.filter(
      (s) => s.toLowerCase().includes(lowerQuery) && s.toLowerCase() !== lowerQuery
    ).slice(0, 3)
  }, [query, popularSearches])

  // Filter saved searches that match query
  const matchingSaved = React.useMemo(() => {
    if (!query) return savedSearches.slice(0, 5)
    const lowerQuery = query.toLowerCase()
    return savedSearches.filter(
      (s) => s.query.toLowerCase().includes(lowerQuery) || 
             (s.name && s.name.toLowerCase().includes(lowerQuery))
    ).slice(0, 3)
  }, [query, savedSearches])

  // Filter recent searches that match query
  const matchingRecent = React.useMemo(() => {
    if (!query) return []
    const lowerQuery = query.toLowerCase()
    return recentSearches.filter(
      (s) => s.toLowerCase().includes(lowerQuery) && s.toLowerCase() !== lowerQuery
    ).slice(0, 3)
  }, [query, recentSearches])

  // Check if we have any suggestions to show
  const hasSuggestions = aiSuggestions.length > 0 || 
                         matchingPopular.length > 0 || 
                         matchingSaved.length > 0 ||
                         matchingRecent.length > 0

  if (!hasSuggestions) return null

  return (
    <div className={cn("space-y-4", className)}>
      {/* AI Suggestions */}
      {query && aiSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {t('search.suggestions.ai', 'AI Suggestions')}
          </div>
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSelect(suggestion)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                <Lightbulb className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Matching Recent */}
      {matchingRecent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t('search.suggestions.recent', 'Recent')}
          </div>
          <div className="flex flex-wrap gap-2">
            {matchingRecent.map((search, index) => (
              <button
                key={index}
                onClick={() => onSelect(search)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Saved Searches */}
      {matchingSaved.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Bookmark className="h-3 w-3" />
            {t('search.suggestions.saved', 'Saved Searches')}
          </div>
          <div className="flex flex-wrap gap-2">
            {matchingSaved.map((saved) => (
              <div
                key={saved.id}
                className="inline-flex items-center gap-1 group"
              >
                <button
                  onClick={() => onSelectSaved ? onSelectSaved(saved) : onSelect(saved.query)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-l-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                >
                  <Bookmark className="h-3 w-3" />
                  {saved.name || saved.query}
                  {saved.filters?.shardTypeId && (
                    <Badge variant="outline" className="ml-1 text-xs py-0">
                      <Hash className="h-2.5 w-2.5 mr-0.5" />
                      filtered
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => removeSavedSearch(saved.id)}
                  className="p-1.5 rounded-r-full bg-blue-500/10 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title={t('common:delete' as any)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular/Trending */}
      {matchingPopular.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {t('search.suggestions.popular', 'Popular Searches')}
          </div>
          <div className="flex flex-wrap gap-2">
            {matchingPopular.map((search, index) => (
              <button
                key={index}
                onClick={() => onSelect(search)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                {search}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline suggestions for search input
 */
export function InlineSuggestions({
  query,
  onSelect,
  maxSuggestions = 5,
  className,
}: {
  query: string
  onSelect: (suggestion: string) => void
  maxSuggestions?: number
  className?: string
}) {
  const { popularSearches, recentSearches } = useCommandPaletteStore()
  const { data: shardTypesData } = useActiveShardTypes()
  const shardTypes = shardTypesData?.items ?? []

  // Generate inline auto-complete suggestions
  const suggestions = React.useMemo(() => {
    if (!query || query.length < 2) return []
    
    const lowerQuery = query.toLowerCase()
    const results: Array<{ text: string; type: 'recent' | 'popular' | 'type' }> = []
    
    // Add matching recent searches
    recentSearches.forEach((s) => {
      if (s.toLowerCase().startsWith(lowerQuery) && s.toLowerCase() !== lowerQuery) {
        results.push({ text: s, type: 'recent' })
      }
    })
    
    // Add matching popular searches
    popularSearches.forEach((s) => {
      if (s.toLowerCase().startsWith(lowerQuery) && 
          s.toLowerCase() !== lowerQuery &&
          !results.some((r) => r.text.toLowerCase() === s.toLowerCase())) {
        results.push({ text: s, type: 'popular' })
      }
    })
    
    // Add shard type suggestions
    shardTypes.forEach((type) => {
      const typeName = type.displayName || type.name
      const suggestion = `${query} in ${typeName}`
      if (!results.some((r) => r.text === suggestion)) {
        results.push({ text: suggestion, type: 'type' })
      }
    })
    
    return results.slice(0, maxSuggestions)
  }, [query, recentSearches, popularSearches, shardTypes, maxSuggestions])

  if (suggestions.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion.text)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors",
            suggestion.type === 'recent' && "bg-muted hover:bg-muted/80",
            suggestion.type === 'popular' && "bg-primary/10 hover:bg-primary/20 text-primary",
            suggestion.type === 'type' && "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
          )}
        >
          {suggestion.type === 'recent' && <Clock className="h-2.5 w-2.5" />}
          {suggestion.type === 'popular' && <TrendingUp className="h-2.5 w-2.5" />}
          {suggestion.type === 'type' && <Hash className="h-2.5 w-2.5" />}
          <span className="truncate max-w-[150px]">{suggestion.text}</span>
        </button>
      ))}
    </div>
  )
}

