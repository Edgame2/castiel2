"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useDebounce } from "use-debounce"
import {
  Search,
  FileText,
  LayoutDashboard,
  Users,
  Settings,
  Plus,
  Clock,
  Sparkles,
  ChevronRight,
  Hash,
  FolderOpen,
  ArrowRight,
  Loader2,
  FileBox,
  ListFilter,
  Bookmark,
  BookmarkPlus,
  TrendingUp,
  X,
  Target,
  BarChart3,
  Briefcase,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useVectorSearchShards } from "@/hooks/use-shards"
import { useActiveShardTypes } from "@/hooks/use-shard-types"
import { useCommandPaletteStore, type SavedSearch } from "./command-palette-store"

interface CommandPaletteProps {
  // Additional props if needed
}

export function CommandPalette({}: CommandPaletteProps) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['common', 'search'])
  const { 
    isOpen, 
    close, 
    recentSearches, 
    addRecentSearch,
    removeRecentSearch,
    recentPages, 
    addRecentPage,
    savedSearches,
    saveSearch,
    removeSavedSearch,
    isSavedSearch,
    popularSearches,
  } = useCommandPaletteStore()
  
  const [query, setQuery] = React.useState("")
  const [debouncedQuery] = useDebounce(query, 300)
  const [selectedShardType, setSelectedShardType] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<'default' | 'search' | 'shardTypes' | 'saved'>('default')

  // Shard types for filtering
  const { data: shardTypesData } = useActiveShardTypes()
  const shardTypes = shardTypesData?.items ?? []

  // Vector search results (only when in search mode and query exists)
  const { data: searchResults, isLoading: searchLoading } = useVectorSearchShards(
    debouncedQuery,
    {
      limit: 8,
      shardTypeId: selectedShardType || undefined,
      minScore: 0.3,
      enabled: mode === 'search' && debouncedQuery.length >= 2,
    }
  )

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setMode('default')
      setSelectedShardType(null)
    }
  }, [isOpen])

  // Switch to search mode when user starts typing
  React.useEffect(() => {
    if (query.length >= 2 && mode === 'default') {
      setMode('search')
    } else if (query.length === 0 && mode === 'search') {
      setMode('default')
    }
  }, [query, mode])

  const navigateTo = (path: string, label?: string) => {
    if (label) {
      addRecentPage({ path, label })
    }
    router.push(path)
    close()
  }

  const handleSearch = (searchQuery: string) => {
    addRecentSearch(searchQuery)
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    close()
  }

  const handleSearchResult = (shardId: string, shardName: string) => {
    addRecentSearch(query)
    router.push(`/shards/${shardId}`)
    close()
  }

  const handleShardTypeFilter = (shardTypeId: string) => {
    setSelectedShardType(shardTypeId === selectedShardType ? null : shardTypeId)
  }

  const handleSaveSearch = () => {
    if (!query.trim()) return
    saveSearch({
      query: query.trim(),
      filters: selectedShardType ? { shardTypeId: selectedShardType } : undefined,
    })
  }

  const handleSelectSaved = (saved: SavedSearch) => {
    setQuery(saved.query)
    if (saved.filters?.shardTypeId) {
      setSelectedShardType(saved.filters.shardTypeId)
    }
    setMode('search')
  }

  const runCommand = React.useCallback((command: () => void) => {
    close()
    command()
  }, [close])

  // Check if current search is saved
  const isCurrentSaved = query.trim() ? isSavedSearch(query.trim()) : false

  // Quick actions
  const quickActions = [
    {
      id: 'create-shard',
      icon: Plus,
      label: t('commandPalette.actions.createShard', 'Create New Shard'),
      shortcut: '⌘N',
      action: () => navigateTo('/shards/new', 'Create Shard'),
    },
    {
      id: 'search',
      icon: Search,
      label: t('commandPalette.actions.search', 'Search Shards'),
      shortcut: '/',
      action: () => setMode('search'),
    },
    {
      id: 'saved-searches',
      icon: Bookmark,
      label: t('commandPalette.actions.savedSearches', 'Saved Searches'),
      action: () => setMode('saved'),
    },
    {
      id: 'filter-type',
      icon: ListFilter,
      label: t('commandPalette.actions.filterByType', 'Filter by Shard Type'),
      action: () => setMode('shardTypes'),
    },
  ]

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav:dashboards', 'Dashboards'), path: '/dashboards' },
    { id: 'shards', icon: FileText, label: t('nav:shards', 'Shards'), path: '/shards' },
    { id: 'shard-types', icon: FileBox, label: t('nav:shardTypes', 'Shard Types'), path: '/shard-types' },
    { id: 'users', icon: Users, label: t('nav:users', 'Users'), path: '/users' },
    { id: 'search-page', icon: Sparkles, label: t('nav:search', 'Vector Search'), path: '/search' },
    { id: 'opportunities', icon: Briefcase, label: t('nav:opportunities', 'Opportunities'), path: '/opportunities' },
    { id: 'pipeline', icon: BarChart3, label: t('nav:pipeline', 'Pipeline'), path: '/pipeline' },
    { id: 'quotas', icon: Target, label: t('nav:quotas', 'Quotas'), path: '/quotas' },
    { id: 'benchmarks', icon: BarChart3, label: t('nav:benchmarks', 'Benchmarks'), path: '/benchmarks' },
    { id: 'settings', icon: Settings, label: t('nav:settings', 'Settings'), path: '/settings' },
  ]

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <CommandInput
        placeholder={
          mode === 'search'
            ? t('commandPalette.searchPlaceholder', 'Search shards using AI...')
            : mode === 'shardTypes'
            ? t('commandPalette.filterPlaceholder', 'Select a shard type to filter...')
            : t('commandPalette.placeholder', 'Type a command or search...')
        }
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searchLoading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('commandPalette.searching', 'Searching...')}</span>
            </div>
          ) : mode === 'search' && debouncedQuery.length >= 2 ? (
            <div className="py-4 text-center">
              <p>{t('commandPalette.noResults', 'No results found.')}</p>
              <button
                className="text-primary text-sm mt-2 hover:underline"
                onClick={() => handleSearch(query)}
              >
                {t('commandPalette.searchFull', 'Search in full page →')}
              </button>
            </div>
          ) : (
            <p>{t('commandPalette.noCommands', 'No commands found.')}</p>
          )}
        </CommandEmpty>

        {/* Search Results */}
        {mode === 'search' && searchResults && searchResults.items.length > 0 && (
          <CommandGroup heading={
            <div className="flex items-center justify-between">
              <span>{t('commandPalette.results', 'Search Results')}</span>
              {query.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSaveSearch()
                  }}
                  disabled={isCurrentSaved}
                >
                  {isCurrentSaved ? (
                    <>
                      <Bookmark className="h-3 w-3 mr-1 fill-current" />
                      {t('commandPalette.saved', 'Saved')}
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-3 w-3 mr-1" />
                      {t('commandPalette.saveSearch', 'Save Search')}
                    </>
                  )}
                </Button>
              )}
            </div>
          }>
            {searchResults.items.map((result) => (
              <CommandItem
                key={result.id}
                value={`search-${result.id}`}
                onSelect={() => handleSearchResult(result.id, result.name)}
                className="flex items-center gap-3"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{result.name}</p>
                  {result.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {result.shardType && (
                    <Badge variant="outline" className="text-xs">
                      {result.shardType.name}
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className={
                      result.score > 0.8
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : result.score > 0.6
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }
                  >
                    {Math.round(result.score * 100)}%
                  </Badge>
                </div>
              </CommandItem>
            ))}
            <CommandItem
              value="see-all-results"
              onSelect={() => handleSearch(query)}
              className="text-primary"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              {t('commandPalette.seeAllResults', 'See all results')}
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Saved Searches Mode */}
        {mode === 'saved' && (
          <CommandGroup heading={t('commandPalette.savedSearches', 'Saved Searches')}>
            {savedSearches.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('commandPalette.noSavedSearches', 'No saved searches yet. Save a search to quickly access it later.')}
              </div>
            ) : (
              savedSearches.map((saved) => (
                <CommandItem
                  key={saved.id}
                  value={`saved-${saved.id}`}
                  onSelect={() => handleSelectSaved(saved)}
                  className="group"
                >
                  <Bookmark className="mr-2 h-4 w-4 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{saved.name || saved.query}</p>
                    {saved.name && (
                      <p className="text-xs text-muted-foreground truncate">{saved.query}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {saved.filters?.shardTypeId && (
                      <Badge variant="outline" className="text-xs">
                        <Hash className="h-2.5 w-2.5 mr-0.5" />
                        filtered
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSavedSearch(saved.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CommandItem>
              ))
            )}
            <CommandSeparator />
            <CommandItem
              value="back-to-default"
              onSelect={() => setMode('default')}
              className="text-muted-foreground"
            >
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              {t('commandPalette.backToMenu', 'Back to menu')}
            </CommandItem>
          </CommandGroup>
        )}

        {/* Shard Type Filter Mode */}
        {mode === 'shardTypes' && (
          <CommandGroup heading={t('commandPalette.shardTypes', 'Shard Types')}>
            {shardTypes.map((type) => (
              <CommandItem
                key={type.id}
                value={`type-${type.id}`}
                onSelect={() => {
                  handleShardTypeFilter(type.id)
                  setMode('search')
                }}
              >
                <Hash className="mr-2 h-4 w-4" />
                <span>{type.displayName || type.name}</span>
                {selectedShardType === type.id && (
                  <Badge className="ml-auto" variant="default">
                    {t('commandPalette.selected', 'Selected')}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Default Mode */}
        {mode === 'default' && (
          <>
            {/* Quick Actions */}
            <CommandGroup heading={t('commandPalette.quickActions', 'Quick Actions')}>
              {quickActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.id}
                  onSelect={() => action.action()}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <CommandShortcut>{action.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <>
                <CommandGroup heading={t('commandPalette.savedSearches', 'Saved Searches')}>
                  {savedSearches.slice(0, 3).map((saved) => (
                    <CommandItem
                      key={`saved-${saved.id}`}
                      value={`saved-${saved.id}`}
                      onSelect={() => handleSelectSaved(saved)}
                      className="group"
                    >
                      <Bookmark className="mr-2 h-4 w-4 text-blue-500" />
                      <span className="flex-1 truncate">{saved.name || saved.query}</span>
                      {saved.filters?.shardTypeId && (
                        <Badge variant="outline" className="text-xs ml-2">
                          <Hash className="h-2.5 w-2.5 mr-0.5" />
                          filtered
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                  {savedSearches.length > 3 && (
                    <CommandItem
                      value="view-all-saved"
                      onSelect={() => setMode('saved')}
                      className="text-muted-foreground"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {t('commandPalette.viewAllSaved', 'View all saved searches')}
                    </CommandItem>
                  )}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <>
                <CommandGroup heading={t('commandPalette.recentSearches', 'Recent Searches')}>
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <CommandItem
                      key={`recent-${index}`}
                      value={`recent-search-${search}`}
                      onSelect={() => {
                        setQuery(search)
                        setMode('search')
                      }}
                      className="group"
                    >
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{search}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRecentSearch(search)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Popular Searches */}
            {popularSearches.length > 0 && recentSearches.length === 0 && (
              <>
                <CommandGroup heading={t('commandPalette.popularSearches', 'Popular Searches')}>
                  {popularSearches.slice(0, 5).map((search, index) => (
                    <CommandItem
                      key={`popular-${index}`}
                      value={`popular-search-${search}`}
                      onSelect={() => {
                        setQuery(search)
                        setMode('search')
                      }}
                    >
                      <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Recent Pages */}
            {recentPages.length > 0 && (
              <>
                <CommandGroup heading={t('commandPalette.recentPages', 'Recent Pages')}>
                  {recentPages.slice(0, 5).map((page, index) => (
                    <CommandItem
                      key={`page-${index}`}
                      value={`recent-page-${page.path}`}
                      onSelect={() => navigateTo(page.path)}
                    >
                      <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{page.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Navigation */}
            <CommandGroup heading={t('commandPalette.navigation', 'Navigation')}>
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => navigateTo(item.path, item.label)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Selected Filter Badge */}
        {selectedShardType && mode === 'search' && (
          <div className="px-2 pb-2">
            <Badge variant="secondary" className="gap-1">
              <ListFilter className="h-3 w-3" />
              {shardTypes.find(t => t.id === selectedShardType)?.displayName || 'Type Filter'}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => setSelectedShardType(null)}
              >
                ×
              </button>
            </Badge>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  )
}

