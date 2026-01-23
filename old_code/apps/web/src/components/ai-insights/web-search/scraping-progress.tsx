'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ScrapingProgressEvent } from '@/types/web-search'

const STATUS_COLOR: Record<ScrapingProgressEvent['status'], string> = {
    fetching: 'bg-sky-100 text-sky-800',
    parsing: 'bg-amber-100 text-amber-800',
    chunking: 'bg-indigo-100 text-indigo-800',
    embedding: 'bg-emerald-100 text-emerald-800',
    complete: 'bg-emerald-100 text-emerald-800',
    error: 'bg-rose-100 text-rose-800',
}

export interface ScrapingProgressProps {
    events: ScrapingProgressEvent[]
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
    }
}

export function ScrapingProgress({
    events,
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
}: ScrapingProgressProps) {
    const latest = events[events.length - 1]

    const body = (
        <div className="space-y-3">
            {latest && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{latest.currentUrl || 'Loading...'}</span>
                        <Badge className={cn('capitalize', STATUS_COLOR[latest.status])}>
                            {latest.status}
                        </Badge>
                    </div>
                    <Progress value={Math.min(latest.progress, 100)} />
                    {latest.message && (
                        <p className="text-xs text-muted-foreground">{latest.message}</p>
                    )}
                </div>
            )}

            <ScrollArea className="h-48 rounded-md border bg-muted/30 p-3">
                <div className="space-y-2 text-xs">
                    {events.length === 0 && (
                        <p className="text-muted-foreground">Waiting for scraping to start...</p>
                    )}
                    {events.map((event, idx) => (
                        <div key={`${event.currentUrl}-${idx}`} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="truncate font-medium">{event.currentUrl}</span>
                                <span className="text-muted-foreground">{event.progress}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Badge className={cn('capitalize', STATUS_COLOR[event.status])}>
                                    {event.status}
                                </Badge>
                                <span>{event.message || 'Processing...'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[220px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Scraping Progress'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>{body}</CardContent>
            </Card>
        )
    }

    return body
}
