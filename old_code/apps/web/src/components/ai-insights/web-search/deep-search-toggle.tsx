'use client'

import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface DeepSearchToggleProps {
    enabled: boolean
    maxPages: number
    onChange: (value: { enabled: boolean; maxPages: number }) => void
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
    }
}

export function DeepSearchToggle({
    enabled,
    maxPages,
    onChange,
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
}: DeepSearchToggleProps) {
    const body = (
        <div className="space-y-3">
            <Label className="flex items-center gap-2">
                <Switch
                    checked={enabled}
                    onCheckedChange={(val) => onChange({ enabled: val, maxPages })}
                />
                <span className="font-medium">Enable deep search</span>
            </Label>

            <div className="space-y-1">
                <Label htmlFor="max-pages">Pages to scrape</Label>
                <Input
                    id="max-pages"
                    type="number"
                    min={1}
                    max={10}
                    disabled={!enabled}
                    value={maxPages}
                    onChange={(e) => onChange({ enabled, maxPages: Math.min(Math.max(Number(e.target.value) || 1, 1), 10) })}
                />
                <p className="text-xs text-muted-foreground">
                    Scrape up to 10 pages per query. Defaults to 3 when deep search is on.
                </p>
            </div>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[180px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Deep Search'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>{body}</CardContent>
            </Card>
        )
    }

    return body
}
