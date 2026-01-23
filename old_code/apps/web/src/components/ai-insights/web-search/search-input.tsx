'use client'

import { useState } from 'react'
import { Search, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { SearchType } from '@/types/web-search'

export interface SearchInputProps {
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
        refreshInterval?: number
    }
    defaultQuery?: string
    defaultType?: SearchType
    enableDeepSearch?: boolean
    onSearch: (params: {
        query: string
        type: SearchType
        deepSearch: boolean
        maxPages: number
        maxResults: number
    }) => void
    isSubmitting?: boolean
}

export function SearchInput({
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
    defaultQuery = '',
    defaultType = 'web',
    enableDeepSearch = true,
    onSearch,
    isSubmitting,
}: SearchInputProps) {
    const [query, setQuery] = useState(defaultQuery)
    const [type, setType] = useState<SearchType>(defaultType)
    const [deepSearch, setDeepSearch] = useState(enableDeepSearch)
    const [maxPages, setMaxPages] = useState(3)
    const [maxResults, setMaxResults] = useState(8)

    const content = (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="query">Search query</Label>
                <div className="flex gap-2">
                    <Input
                        id="query"
                        placeholder="Ask about a topic, e.g. AI regulation 2025"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1"
                    />
                    <Button
                        onClick={() =>
                            onSearch({ query, type, deepSearch, maxPages, maxResults })
                        }
                        disabled={!query || isSubmitting}
                    >
                        {isSubmitting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                        <span className="ml-2">Search</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                    <Label>Search type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as SearchType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose search type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="academic">Academic</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Max results</Label>
                    <Input
                        type="number"
                        min={3}
                        max={20}
                        value={maxResults}
                        onChange={(e) => setMaxResults(Number(e.target.value) || 8)}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Switch
                            id="deep-search"
                            checked={deepSearch}
                            onCheckedChange={setDeepSearch}
                        />
                        <span>Enable deep search</span>
                    </Label>
                    <Input
                        type="number"
                        min={1}
                        max={10}
                        value={maxPages}
                        disabled={!deepSearch}
                        onChange={(e) => setMaxPages(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                    />
                    <p className="text-xs text-muted-foreground">
                        Scrape up to {maxPages} pages when deep search is enabled.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Supports widget embedding and manual refresh.</span>
                </div>
                {widgetConfig?.refreshInterval && (
                    <span>Auto-refresh: {widgetConfig.refreshInterval}s</span>
                )}
            </div>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[220px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Web Search'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent className="space-y-4">{content}</CardContent>
            </Card>
        )
    }

    return content
}
