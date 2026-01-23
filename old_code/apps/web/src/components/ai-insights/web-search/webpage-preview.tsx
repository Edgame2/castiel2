'use client'

import { Globe2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { WebPagePreviewData } from '@/types/web-search'

export interface WebPagePreviewProps {
    page: WebPagePreviewData
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
    }
}

export function WebPagePreview({
    page,
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
}: WebPagePreviewProps) {
    const body = (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-primary" />
                    <div>
                        <a href={page.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline">
                            {page.title || page.url}
                        </a>
                        <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {page.searchType && <Badge variant="outline">{page.searchType}</Badge>}
                    {page.sourceQuery && <Badge variant="secondary">Query: {page.sourceQuery}</Badge>}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {page.author && <Badge variant="outline">Author: {page.author}</Badge>}
                {page.publishDate && <Badge variant="outline">{new Date(page.publishDate).toLocaleDateString()}</Badge>}
                {page.scrapedAt && <Badge variant="outline">Scraped {new Date(page.scrapedAt).toLocaleString()}</Badge>}
            </div>

            <ScrollArea className="h-64 rounded-md border bg-muted/30 p-3">
                <div className="space-y-3 text-sm leading-relaxed">
                    {page.content ? (
                        <p className="whitespace-pre-wrap text-muted-foreground">{page.content}</p>
                    ) : (
                        <p className="text-muted-foreground">No content captured.</p>
                    )}

                    {page.chunks && page.chunks.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Semantic chunks ({page.chunks.length})</p>
                            <div className="space-y-2">
                                {page.chunks.slice(0, 6).map((chunk, index) => (
                                    <div key={chunk.id || index} className="rounded-md bg-card border p-2 shadow-sm">
                                        <p className="text-xs text-muted-foreground leading-relaxed">{chunk.text}</p>
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {chunk.tokenCount ? `${chunk.tokenCount} tokens` : ''}
                                            {typeof chunk.similarity === 'number' && ` · ${Math.round(chunk.similarity * 100)}% relevant`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[280px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Web Page Preview'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>{body}</CardContent>
            </Card>
        )
    }

    return body
}
