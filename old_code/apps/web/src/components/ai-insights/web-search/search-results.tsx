'use client'

import { useMemo } from 'react'
import { ExternalLink, Globe2, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SearchResultItem, SearchCostBreakdown } from '@/types/web-search'

export interface SearchResultsProps {
    results: SearchResultItem[]
    cost?: SearchCostBreakdown
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
    }
    onRefresh?: () => void
}

function toCSV(rows: SearchResultItem[]): string {
    const header = ['title', 'url', 'provider', 'relevanceScore', 'publishedDate']
    const values = rows.map((r) => [
        JSON.stringify(r.title || ''),
        JSON.stringify(r.url || ''),
        JSON.stringify(r.provider || ''),
        r.relevanceScore ?? '',
        r.publishedDate ?? '',
    ])
    return [header.join(','), ...values.map((r) => r.join(','))].join('\n')
}

export function SearchResults({
    results,
    cost,
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
    onRefresh,
}: SearchResultsProps) {
    const costSummary = useMemo(() => {
        if (!cost) return null
        return `${cost.totalCost.toFixed(4)}$ total (${cost.searchCost.toFixed(4)} search${cost.deepSearchCost ? `, ${cost.deepSearchCost.toFixed(4)} deep` : ''
            })`
    }, [cost])

    const body = (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{results.length} results</span>
                {costSummary && <span>Cost: {costSummary}</span>}
            </div>
            <ScrollArea className="h-72 rounded-md border bg-muted/30 p-3">
                <div className="space-y-3">
                    {results.length === 0 && <p className="text-sm text-muted-foreground">No results yet. Try a new query.</p>}
                    {results.map((result) => (
                        <div key={result.url} className="space-y-1 rounded-lg border bg-card p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Globe2 className="h-4 w-4 text-primary" />
                                    <a
                                        className="text-sm font-semibold hover:underline"
                                        href={result.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {result.title}
                                    </a>
                                </div>
                                {result.provider && (
                                    <Badge variant="secondary" className="text-[10px]">
                                        {result.provider}
                                    </Badge>
                                )}
                            </div>
                            {result.snippet && <p className="text-sm text-muted-foreground line-clamp-2">{result.snippet}</p>}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    {result.domain && <Badge variant="outline">{result.domain}</Badge>}
                                    {typeof result.relevanceScore === 'number' && (
                                        <span>Relevance: {(result.relevanceScore * 100).toFixed(0)}%</span>
                                    )}
                                    {result.publishedDate && <span>{new Date(result.publishedDate).toLocaleDateString()}</span>}
                                </div>
                                <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary"
                                >
                                    Open <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <CardFooter className="flex items-center justify-between p-0">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a' as any)
                            a.href = url
                            a.download = 'web-search-results.json'
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >
                        <Download className="h-4 w-4 mr-2" /> JSON
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const blob = new Blob([toCSV(results)], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a' as any)
                            a.href = url
                            a.download = 'web-search-results.csv'
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >
                        <Download className="h-4 w-4 mr-2" /> CSV
                    </Button>
                </div>
                {onRefresh && (
                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                )}
            </CardFooter>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[260px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Search Results'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent className="space-y-3">{body}</CardContent>
            </Card>
        )
    }

    return body
}
