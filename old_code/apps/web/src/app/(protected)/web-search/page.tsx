'use client'

import { useState, useCallback } from 'react'
import { Sparkles, RotateCcw, Download } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import { SearchInput } from '@/components/ai-insights/web-search/search-input'
import { SearchResults } from '@/components/ai-insights/web-search/search-results'
import { DeepSearchToggle } from '@/components/ai-insights/web-search/deep-search-toggle'
import { ScrapingProgress } from '@/components/ai-insights/web-search/scraping-progress'
import { RecurringSearchForm } from '@/components/ai-insights/web-search/recurring-search-form'
import { SearchStatistics } from '@/components/ai-insights/web-search/search-statistics'
import { WebPagePreview } from '@/components/ai-insights/web-search/webpage-preview'

import { useWebSearchWithContext, useDeepSearchWithSocket } from '@/hooks/use-web-search'
import type { SearchResultItem, DeepSearchPage } from '@/types/web-search'

export default function WebSearchPage() {
    const [query, setQuery] = useState('')
    const [enableDeepSearch, setEnableDeepSearch] = useState(false)
    const [maxPages, setMaxPages] = useState(3)
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
    const [deepSearchPages, setDeepSearchPages] = useState<DeepSearchPage[]>([])
    const [selectedPage, setSelectedPage] = useState<DeepSearchPage | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [activeTab, setActiveTab] = useState<'search' | 'history' | 'recurring' | 'stats'>('search')

    const { search, history, stats, cleanup, recurring } = useWebSearchWithContext()
    const { executeDeepSearch, cancelSearch, progressEvents, isConnected: wsConnected, latestProgress } = useDeepSearchWithSocket()

    const handleSearch = async (params: {
        query: string
        deepSearch?: boolean
        maxPages?: number
        maxResults?: number
        domainWhitelist?: string[]
        domainBlacklist?: string[]
        type?: 'web' | 'news' | 'academic'
    }) => {
        try {
            setIsSearching(true)
            setQuery(params.query)
            setDeepSearchPages([])

            // First, perform regular web search
            const response = await search.mutateAsync({
                query: params.query,
                maxResults: params.maxResults || 10,
            })

            setSearchResults(response.search.results)
            toast.success(`Found ${response.search.results.length} results`)

            // If deep search is enabled, initiate WebSocket connection
            if (params.deepSearch) {
                toast.info('Starting deep search via WebSocket...')
                executeDeepSearch(
                    params.query,
                    { maxPages: params.maxPages || 3 },
                    (result) => {
                        setDeepSearchPages(result.deepSearch?.pages || [])
                        setIsSearching(false)
                    }
                )
            } else {
                setIsSearching(false)
            }

            setActiveTab('search')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Search failed'
            toast.error(message)
            setIsSearching(false)
        }
    }

    const handleRefresh = () => {
        if (query) {
            handleSearch({ query })
        }
    }

    const handleCleanup = async () => {
        try {
            await cleanup.mutateAsync()
            toast.success('Removed old search results')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Cleanup failed'
            toast.error(message)
        }
    }

    const handleCancelDeepSearch = () => {
        cancelSearch()
        setIsSearching(false)
        toast.info('Deep search cancelled')
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6" />
                    <h1 className="text-3xl font-bold">Web Search & Deep Analysis</h1>
                </div>
                <p className="text-muted-foreground">
                    Search the web, scrape pages deeply, and extract semantic insights
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="search">Search</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="recurring">Recurring</TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search</CardTitle>
                            <CardDescription>Enter a query to search the web</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <SearchInput onSearch={handleSearch} defaultQuery={query} />

                            <div className="space-y-2">
                                <DeepSearchToggle
                                    enabled={enableDeepSearch}
                                    maxPages={maxPages}
                                    onChange={({ enabled, maxPages }) => {
                                        setEnableDeepSearch(enabled)
                                        setMaxPages(maxPages)
                                    }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={!query || isSearching}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCleanup}
                                    disabled={cleanup.isPending}
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Clean Old Results
                                </Button>
                                {wsConnected && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleCancelDeepSearch}
                                    >
                                        Cancel Deep Search
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {enableDeepSearch && progressEvents.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Deep Search Progress</CardTitle>
                                <CardDescription>
                                    {latestProgress?.currentPage || 'Initializing...'} ({latestProgress?.progress || 0}%)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrapingProgress events={progressEvents} />
                            </CardContent>
                        </Card>
                    )}

                    {searchResults.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Results</CardTitle>
                                <CardDescription>{searchResults.length} results found</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SearchResults
                                    results={searchResults}
                                    onRefresh={handleRefresh}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {selectedPage && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Page Preview</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto"
                                    onClick={() => setSelectedPage(null)}
                                >
                                    Close
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <WebPagePreview page={selectedPage} />
                            </CardContent>
                        </Card>
                    )}

                    {!isSearching && searchResults.length === 0 && query && (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center text-muted-foreground">No results found. Try a different query.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search History</CardTitle>
                            <CardDescription>Recent searches and cached results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {history.isLoading ? (
                                <p className="text-muted-foreground">Loading history...</p>
                            ) : history.data ? (
                                <div className="space-y-3">
                                    {history.data?.searches.length > 0 ? (
                                        history.data.searches.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                                onClick={() => {
                                                    setQuery(item.query)
                                                    setActiveTab('search')
                                                    // Trigger a new search with the query
                                                    handleSearch({ query: item.query, deepSearch: enableDeepSearch, maxPages })
                                                }}
                                            >
                                                <div>
                                                    <p className="font-medium">{item.query}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.resultCount} results
                                                        {item.createdAt && ` • ${new Date(item.createdAt).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                                <Button variant="outline" size="sm">
                                                    View
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground">No search history yet</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Failed to load history</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recurring">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recurring Searches</CardTitle>
                            <CardDescription>Create automated recurring searches</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RecurringSearchForm
                                defaultQuery={query}
                                onCreated={(response) => {
                                    // Handle successful creation - the form handles the mutation internally
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stats">
                    <SearchStatistics />
                </TabsContent>
            </Tabs>
        </div>
    )
}
