'use client'

import { useEffect, useState } from 'react'
import { Activity, Layers, ScanLine, BookOpen, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getSearchStatistics } from '@/lib/api/web-search'
import type { SearchStatistics } from '@/types/web-search'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

const metricIcons = {
    totalSearches: Activity,
    totalWebPages: BookOpen,
    totalChunks: Layers,
    averageChunksPerPage: ScanLine,
}

export interface SearchStatisticsProps {
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
    }
}

export function SearchStatistics({
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
}: SearchStatisticsProps) {
    const [stats, setStats] = useState<SearchStatistics | null>(null)
    const [loading, setLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const data = await getSearchStatistics()
            setStats(data)
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace('Failed to load statistics in SearchStatistics', 3, {
                errorMessage: errorObj.message,
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const content = (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} /> Refresh
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {(
                    [
                        { key: 'totalSearches', label: 'Searches' },
                        { key: 'totalWebPages', label: 'Pages scraped' },
                        { key: 'totalChunks', label: 'Chunks' },
                        { key: 'averageChunksPerPage', label: 'Avg. chunks/page' },
                    ] as const
                ).map(({ key, label }) => {
                    const Icon = metricIcons[key]
                    const value = stats ? (stats as any)[key] : '—'
                    return (
                        <div key={key} className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                            </div>
                            <p className="text-2xl font-semibold mt-2">{loading ? '…' : value}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[220px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Search Statistics'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>{content}</CardContent>
            </Card>
        )
    }

    return content
}
