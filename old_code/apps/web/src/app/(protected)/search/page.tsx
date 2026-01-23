"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Search as SearchIcon, Filter, X, Sparkles, Clock, Hash, ChevronDown, LayoutGrid, List, SlidersHorizontal, Bookmark, BookmarkPlus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { useVectorSearchShards } from "@/hooks/use-shards"
import { useActiveShardTypes } from "@/hooks/use-shard-types"
import { useGlobalVectorSearch } from "@/hooks/use-insights"
import { useCommandPaletteStore, SearchSuggestions, type SavedSearch } from "@/components/command-palette"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { VectorSearchAnalytics } from "@/components/ai-insights/vector-search-analytics"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SearchPage() {
  const { t } = useTranslation('common') as any
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { 
    recentSearches, 
    addRecentSearch,
    savedSearches,
    saveSearch,
    removeSavedSearch,
    isSavedSearch,
  } = useCommandPaletteStore()
  
  // Check if user is Super Admin
  const role = user?.role?.toLowerCase();
  const roles = user?.roles?.map(r => r.toLowerCase()) || [];
  const isSuperAdmin = role === 'super-admin' || role === 'super_admin' || role === 'superadmin' ||
    roles.includes('super-admin') || roles.includes('super_admin') || roles.includes('superadmin');
  
  // Check if user is admin for analytics tab
  const isAdmin = role === 'admin' || role === 'owner' || 
    roles.includes('admin') || roles.includes('owner');
  
  // Initialize from URL params
  const initialQuery = searchParams.get('q' as any) || ""
  const initialType = searchParams.get('type' as any) || ""
  const initialScore = parseInt(searchParams.get('score' as any) || "0")
  const initialGlobal = searchParams.get('global' as any) === 'true'
  
  const [query, setQuery] = useState(initialQuery)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [shardTypeFilter, setShardTypeFilter] = useState<string>(initialType)
  const [minScore, setMinScore] = useState<number>(initialScore)
  const [isGlobalSearch, setIsGlobalSearch] = useState<boolean>(initialGlobal && isSuperAdmin)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const { data: shardTypesData, isLoading: typesLoading } = useActiveShardTypes()
  const shardTypes = shardTypesData?.items ?? []

  // Use global search if enabled and user is Super Admin
  const { data: globalResults, isLoading: globalSearchLoading } = useGlobalVectorSearch(
    {
      query: searchQuery,
      topK: 50,
      shardTypeId: shardTypeFilter || undefined,
      minScore: minScore / 100,
      enabled: isGlobalSearch && isSuperAdmin && searchQuery.length > 0,
    }
  )

  const { data: tenantResults, isLoading: tenantSearchLoading } = useVectorSearchShards(
    searchQuery,
    {
      limit: 20,
      shardTypeId: shardTypeFilter || undefined,
      minScore: minScore / 100,
      enabled: !isGlobalSearch && searchQuery.length > 0,
    }
  )

  const results = isGlobalSearch ? globalResults : tenantResults
  const searchLoading = isGlobalSearch ? globalSearchLoading : tenantSearchLoading

  // Update URL when search params change
  const updateUrl = useCallback((newQuery: string, newType: string, newScore: number, global?: boolean) => {
    const params = new URLSearchParams()
    if (newQuery) params.set('q', newQuery)
    if (newType) params.set('type', newType)
    if (newScore > 0) params.set('score', String(newScore))
    if (global && isSuperAdmin) params.set('global', 'true')
    
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newUrl, { scroll: false })
  }, [router, isSuperAdmin])

  const handleSearch = () => {
    if (query.trim()) {
      setSearchQuery(query)
      addRecentSearch(query)
      updateUrl(query, shardTypeFilter, minScore, isGlobalSearch)
    }
  }

  const handleGlobalToggle = (checked: boolean) => {
    setIsGlobalSearch(checked)
    if (searchQuery) {
      updateUrl(searchQuery, shardTypeFilter, minScore, checked)
    }
  }

  const handleClearFilters = () => {
    setShardTypeFilter("")
    setMinScore(0)
    updateUrl(searchQuery, "", 0)
  }

  const handleTypeFilterChange = (type: string) => {
    setShardTypeFilter(type)
    updateUrl(searchQuery, type, minScore)
  }

  const handleScoreChange = (score: number) => {
    setMinScore(score)
    updateUrl(searchQuery, shardTypeFilter, score)
  }

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery)
    setSearchQuery(historyQuery)
    addRecentSearch(historyQuery)
    updateUrl(historyQuery, shardTypeFilter, minScore)
  }

  const handleResultClick = (shardId: string) => {
    router.push(`/shards/${shardId}`)
  }

  // Trigger search on initial load if URL has query
  useEffect(() => {
    if (initialQuery && !searchQuery) {
      setSearchQuery(initialQuery)
    }
  }, [initialQuery, searchQuery])

  const isFiltering = shardTypeFilter || minScore > 0

  // Check if current search is saved
  const isCurrentSaved = searchQuery.trim() ? isSavedSearch(searchQuery.trim()) : false

  const handleSaveSearch = () => {
    if (!searchQuery.trim()) return
    saveSearch({
      query: searchQuery.trim(),
      filters: shardTypeFilter ? { shardTypeId: shardTypeFilter, minScore } : minScore > 0 ? { minScore } : undefined,
    })
  }

  const handleSelectSaved = (saved: SavedSearch) => {
    setQuery(saved.query)
    setSearchQuery(saved.query)
    if (saved.filters?.shardTypeId) {
      setShardTypeFilter(saved.filters.shardTypeId)
    }
    if (saved.filters?.minScore) {
      setMinScore(saved.filters.minScore)
    }
    updateUrl(saved.query, saved.filters?.shardTypeId || '', saved.filters?.minScore || 0)
  }

  // Handle results structure (global search returns different format)
  const resultItems = isGlobalSearch 
    ? (results?.results || []).map((r: any) => ({ ...r.shard, score: r.score }))
    : results?.items || []

  // Compute shard type counts from results
  const typeCounts = resultItems.reduce((acc: Record<string, number>, item: any) => {
    const typeName = item.shardType?.name || 'Unknown'
    acc[typeName] = (acc[typeName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Tab state for Search and Analytics
  const [activeTab, setActiveTab] = useState<'search' | 'analytics'>('search')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{t('search.title' as any)}</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          {t('search.subtitle' as any)}
        </p>
      </div>

      {/* Tabs for Search and Analytics */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'analytics')}>
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          {isAdmin && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <VectorSearchAnalytics />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('search.placeholder' as any)}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchLoading || !query.trim()}>
              {searchLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  {t('search.searching' as any)}
                </>
              ) : (
                <>
                  <SearchIcon className="mr-2 h-4 w-4" />
                  {t('commandPalette.search', 'Search')}
                </>
              )}
            </Button>
            {searchQuery && (
              <Button 
                variant={isCurrentSaved ? "secondary" : "outline"}
                onClick={handleSaveSearch}
                disabled={isCurrentSaved}
                title={isCurrentSaved ? t('search.alreadySaved' as any) : t('search.saveSearch' as any)}
              >
                {isCurrentSaved ? (
                  <Bookmark className="h-4 w-4 fill-current" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Global Search Toggle (Super Admin only) */}
          {isSuperAdmin && (
            <div className="mt-4 flex items-center gap-2">
              <Switch
                id="global-search"
                checked={isGlobalSearch}
                onCheckedChange={handleGlobalToggle}
              />
              <Label htmlFor="global-search" className="text-sm font-medium cursor-pointer">
                Global Search (All Tenants)
              </Label>
              {isGlobalSearch && (
                <Badge variant="secondary" className="ml-2">
                  {results?.metadata?.tenantsSearched?.length || 0} tenants
                </Badge>
              )}
            </div>
          )}

          {/* Search Suggestions */}
          {query.length >= 2 && !searchQuery && (
            <div className="mt-4">
              <SearchSuggestions
                query={query}
                onSelect={(suggestion) => {
                  setQuery(suggestion)
                  setSearchQuery(suggestion)
                  addRecentSearch(suggestion)
                  updateUrl(suggestion, shardTypeFilter, minScore)
                }}
                onSelectSaved={handleSelectSaved}
              />
            </div>
          )}

          {/* Search History */}
          {recentSearches.length > 0 && !searchQuery && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">{t('search.recentSearches' as any)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 8).map((historyItem, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleHistoryClick(historyItem)}
                    className="h-7 text-xs"
                  >
                    {historyItem}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {searchQuery && (
          <div className="lg:col-span-1 space-y-4">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                      <SlidersHorizontal className="h-4 w-4" />
                      <CardTitle className="text-base">{t('search.filters' as any)}</CardTitle>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
                    </CollapsibleTrigger>
                    {isFiltering && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-7 text-xs"
                      >
                        <X className="mr-1 h-3 w-3" />
                        {t('search.clearFilters' as any)}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Shard Type Filter - Faceted */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        {t('search.shardType' as any)}
                      </label>
                      <div className="space-y-2">
                        <div
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                            !shardTypeFilter ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                          onClick={() => handleTypeFilterChange("")}
                        >
                          <span className="text-sm">{t('search.allTypes' as any)}</span>
                          <Badge variant="secondary">{results?.total || 0}</Badge>
                        </div>
                        {!typesLoading &&
                          shardTypes.map((type) => {
                            const count = typeCounts[type.name] || 0
                            const isSelected = shardTypeFilter === type.id
                            return (
                              <div
                                key={type.id}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                )}
                                onClick={() => handleTypeFilterChange(type.id)}
                              >
                                <span className="text-sm truncate">{type.displayName || type.name}</span>
                                <Badge variant="secondary" className="ml-2">{count}</Badge>
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    <Separator />

                    {/* Minimum Score Filter */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        {t('search.minRelevance' as any)}
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">0%</span>
                          <span className="font-medium">{minScore}%</span>
                          <span className="text-muted-foreground">100%</span>
                        </div>
                        <Slider
                          value={[minScore]}
                          onValueChange={(values) => handleScoreChange(values[0])}
                          min={0}
                          max={100}
                          step={5}
                          className="cursor-pointer"
                        />
                        <div className="flex gap-2">
                          {[0, 50, 70, 90].map((score) => (
                            <Button
                              key={score}
                              variant={minScore === score ? "default" : "outline"}
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={() => handleScoreChange(score)}
                            >
                              {score}%+
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Saved Searches Card */}
            {savedSearches.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-base">{t('search.savedSearches' as any)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {savedSearches.slice(0, 5).map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center gap-2 group"
                    >
                      <button
                        onClick={() => handleSelectSaved(saved)}
                        className={cn(
                          "flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors truncate",
                          saved.query === searchQuery 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted"
                        )}
                      >
                        {saved.name || saved.query}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeSavedSearch(saved.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Results Column */}
        <div className={cn("space-y-4", searchQuery ? "lg:col-span-3" : "lg:col-span-4")}>

          {/* Search Results */}
          {searchLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!searchLoading && results && (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('search.found' as any)} <span className="font-semibold">{results.total}</span> {t('results' as any)}
                  {shardTypeFilter && ` ${t('search.resultsWithFilters' as any)}`}
                </p>
                <div className="flex items-center gap-2">
                  {results.total > 0 && (
                    <p className="text-xs text-muted-foreground mr-2">
                      {t('search.sortedByRelevance' as any)}
                    </p>
                  )}
                  {/* View Mode Toggle */}
                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-2 rounded-none"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-2 rounded-none"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results List/Grid */}
              {resultItems.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-semibold">{t('search.noResults' as any)}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('search.noResultsHint' as any)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultItems.map((result: any) => (
                    <Card
                      key={result.id}
                      className="cursor-pointer hover:bg-accent/50 hover:shadow-md transition-all group"
                      onClick={() => handleResultClick(result.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                            {result.name}
                          </CardTitle>
                          <Badge
                            variant="default"
                            className={cn(
                              "shrink-0",
                              result.score > 0.8
                                ? "bg-green-500 hover:bg-green-600"
                                : result.score > 0.6
                                  ? "bg-blue-500 hover:bg-blue-600"
                                  : "bg-yellow-500 hover:bg-yellow-600"
                            )}
                          >
                            {(result.score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 mt-1">
                          {result.description || result.content || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1.5">
                          {result.shardType && (
                            <Badge variant="outline" className="text-xs">
                              {result.shardType.name}
                            </Badge>
                          )}
                          {result.tags?.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {resultItems.map((result: any) => (
                    <Card
                      key={result.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors group"
                      onClick={() => handleResultClick(result.id)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                              {result.name}
                            </h3>

                            {/* Content Preview */}
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {result.content || result.description || "No content available"}
                            </p>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-2 items-center">
                              {result.shardType && (
                                <Badge variant="outline">{result.shardType.name}</Badge>
                              )}
                              {result.tags?.slice(0, 3).map((tag: string) => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                </Badge>
                              ))}
                              {result.tags && result.tags.length > 3 && (
                                <Badge variant="secondary">
                                  {t('search.more', { count: result.tags.length - 3 })}
                                </Badge>
                              )}
                              <Separator orientation="vertical" className="h-4" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(result.createdAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>

                          {/* Relevance Score */}
                          <div className="flex-shrink-0">
                            <div className="text-center">
                              <Badge
                                variant="default"
                                className={cn(
                                  result.score > 0.8
                                    ? "bg-green-500 hover:bg-green-600"
                                    : result.score > 0.6
                                      ? "bg-blue-500 hover:bg-blue-600"
                                      : "bg-yellow-500 hover:bg-yellow-600"
                                )}
                              >
                                {(result.score * 100).toFixed(0)}%
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{t('search.match' as any)}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State (no search yet) */}
          {!searchQuery && !searchLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Sparkles className="mx-auto h-16 w-16 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">{t('search.startSearching' as any)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    {t('search.startSearchingHint' as any)}
                  </p>
                  
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="mt-8">
                      <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('search.recentSearches' as any)}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {recentSearches.slice(0, 5).map((historyQuery, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleHistoryClick(historyQuery)}
                          >
                            {historyQuery}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">{t('search.exampleSearches' as any)}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleHistoryClick("documents about machine learning")}
                      >
                        documents about machine learning
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleHistoryClick("customer feedback")}
                      >
                        customer feedback
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleHistoryClick("technical specifications")}
                      >
                        technical specifications
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
