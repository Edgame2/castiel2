'use client'

import { useState } from 'react'
import { CalendarClock, Save, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { RecurringSearchRequest, RecurringSearchResponse, SearchType } from '@/types/web-search'
import { createRecurringSearch } from '@/lib/api/web-search'

export interface RecurringSearchFormProps {
    isWidget?: boolean
    widgetSize?: 'small' | 'medium' | 'large' | 'full'
    widgetConfig?: {
        title?: string
        showHeader?: boolean
    }
    defaultQuery?: string
    projectId?: string
    onCreated?: (response: RecurringSearchResponse) => void
}

export function RecurringSearchForm({
    isWidget = false,
    widgetSize = 'medium',
    widgetConfig,
    defaultQuery = '',
    projectId,
    onCreated,
}: RecurringSearchFormProps) {
    const [query, setQuery] = useState(defaultQuery)
    const [searchType, setSearchType] = useState<SearchType>('web')
    const [cron, setCron] = useState('0 9 * * MON')
    const [deepSearch, setDeepSearch] = useState(true)
    const [deepSearchPages, setDeepSearchPages] = useState(3)
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        setError(null)
        if (!query.trim()) {
            setError('Query is required')
            return
        }
        setIsSubmitting(true)
        try {
            const payload: RecurringSearchRequest = {
                query,
                searchType,
                deepSearch,
                deepSearchPages,
                schedule: cron,
                projectId,
            }
            const response = await createRecurringSearch(payload)
            onCreated?.(response)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create recurring search'
            setError(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const body = (
        <div className="space-y-4">
            {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="recurring-query">Query</Label>
                <Input
                    id="recurring-query"
                    placeholder="e.g. AI agents weekly market news"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label>Search type</Label>
                    <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Search type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="web">Web</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="academic">Academic</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Schedule (cron)</Label>
                    <Input
                        value={cron}
                        onChange={(e) => setCron(e.target.value)}
                        placeholder="0 9 * * MON"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> Runs with cron syntax
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Switch checked={deepSearch} onCheckedChange={setDeepSearch} />
                <Label className="font-medium">Enable deep search</Label>
                <Input
                    type="number"
                    min={1}
                    max={10}
                    className="w-20 ml-2"
                    disabled={!deepSearch}
                    value={deepSearchPages}
                    onChange={(e) => setDeepSearchPages(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                />
                <span className="text-xs text-muted-foreground">pages</span>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes / purpose (optional)</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Context for this recurring search"
                    rows={3}
                />
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Saving...' : 'Save schedule'}
                </Button>
            </div>
        </div>
    )

    if (isWidget) {
        return (
            <Card className={cn('h-full', widgetSize === 'small' && 'min-h-[280px]')}>
                {widgetConfig?.showHeader !== false && (
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">
                            {widgetConfig?.title || 'Recurring Search'}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent className="space-y-4">{body}</CardContent>
            </Card>
        )
    }

    return body
}
