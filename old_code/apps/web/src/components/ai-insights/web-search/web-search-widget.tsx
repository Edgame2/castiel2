'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { SearchInput } from '@/components/ai-insights/web-search/search-input'
import { SearchResults } from '@/components/ai-insights/web-search/search-results'
import { DeepSearchToggle } from '@/components/ai-insights/web-search/deep-search-toggle'
import { SearchStatistics } from '@/components/ai-insights/web-search/search-statistics'

import { useWebSearchWithContext } from '@/hooks/use-web-search'
import type { SearchResultItem } from '@/types/web-search'

export interface WebSearchWidgetProps {
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
        defaultQuery?: string
        enableDeepSearch?: boolean
        showStats?: boolean
        showTabs?: boolean
    }
    onResultsSelect?: (result: SearchResultItem) => void
}

export function WebSearchWidget({
    widgetSize = 'medium',
    widgetConfig = {},
    onResultsSelect,
}: WebSearchWidgetProps) {
    const { title = 'Web Search', showHeader = true, defaultQuery = '', enableDeepSearch = false, showStats = true, showTabs = true } = widgetConfig

    const [results, setResults] = useState<SearchResultItem[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [deepSearchEnabled, setDeepSearchEnabled] = useState(enableDeepSearch)
    const [maxPages, setMaxPages] = useState(3)
    const [activeTab, setActiveTab] = useState<'search' | 'stats'>('search')

    const { search, stats } = useWebSearchWithContext()

    const handleSearch = async (params: {
        query: string
        deepSearch?: boolean
        maxPages?: number
        maxResults?: number
        domainWhitelist?: string[]
        domainBlacklist?: string[]
    }) => {
        try {
            setIsSearching(true)
            const response = await search.mutateAsync({
                query: params.query,
                maxResults: params.maxResults || 5,
                deepSearch: params.deepSearch
                    ? {
                        maxPages: params.maxPages,
                    }
                    : undefined,
            })
            setResults(response.search.results)
        } finally {
            setIsSearching(false)
        }
    }

    const heightClass = {
        small: 'h-96',
        medium: 'h-[600px]',
        large: 'h-[800px]',
        full: 'min-h-screen',
    }[widgetSize]

    const content = (
        <div className={`flex flex-col ${heightClass}`}>
            {showTabs ? (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                    <TabsList className="w-full justify-start rounded-none border-b">
                        <TabsTrigger value="search">Search</TabsTrigger>
                        {showStats && <TabsTrigger value="stats">Stats</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="search" className="flex-1 overflow-y-auto">
                        <div className="space-y-4 p-4">
                            <SearchInput onSearch={handleSearch} defaultQuery={defaultQuery} />

                            {deepSearchEnabled && (
                                <DeepSearchToggle
                                    enabled={deepSearchEnabled}
                                    maxPages={maxPages}
                                    onChange={({ enabled, maxPages }) => {
                                        setDeepSearchEnabled(enabled)
                                        setMaxPages(maxPages)
                                    }}
                                />
                            )}

                            {results.length > 0 && (
                                <SearchResults
                                    results={results}
                                    onRefresh={() => { }}
                                />
                            )}

                            {!isSearching && results.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground">Search to get started</p>
                            )}
                        </div>
                    </TabsContent>

                    {showStats && (
                        <TabsContent value="stats" className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <SearchStatistics />
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-4 p-4">
                    <SearchInput onSearch={handleSearch} defaultQuery={defaultQuery} />

                    {deepSearchEnabled && (
                        <DeepSearchToggle
                            enabled={deepSearchEnabled}
                            maxPages={maxPages}
                            onChange={({ enabled, maxPages }) => {
                                setDeepSearchEnabled(enabled)
                                setMaxPages(maxPages)
                            }}
                        />
                    )}

                    {results.length > 0 && (
                        <SearchResults
                            results={results}
                            onRefresh={() => { }}
                        />
                    )}

                    {!isSearching && results.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground">Search to get started</p>
                    )}
                </div>
            )}
        </div>
    )

    if (showHeader) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">{content}</CardContent>
            </Card>
        )
    }

    return <div className="h-full">{content}</div>
}
