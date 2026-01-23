'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { shardTypeApi } from '@/lib/api/shard-types'
import type { ShardTypeUsage } from '@/types/api'

interface UsageTabProps {
    shardTypeId: string
}

export function UsageTab({ shardTypeId }: UsageTabProps) {
    const { data: usage, isLoading } = useQuery<ShardTypeUsage>({
        queryKey: ['shard-type-usage', shardTypeId],
        queryFn: () => shardTypeApi.getUsage(shardTypeId),
    })

    if (isLoading) {
        return <div>Loading...</div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <div className="text-2xl font-bold">{usage?.shardCount ?? usage?.usageCount ?? 0}</div>
                        <div className="text-sm text-muted-foreground">Total instances</div>
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-1">Status</div>
                        <div className="text-sm text-muted-foreground">
                            {usage?.inUse ? 'In use' : 'Not in use'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-1">Can be deleted</div>
                        <div className="text-sm text-muted-foreground">
                            {usage?.canDelete ? 'Yes' : 'No'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
