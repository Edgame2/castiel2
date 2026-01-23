'use client'

import { ShardType } from '@/types/shard-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RelationshipGraphProps {
    shardTypeId?: string
    relationships: any[]
}

export function RelationshipGraph({ shardTypeId, relationships }: RelationshipGraphProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Relationship Graph</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {relationships.map((rel, index) => (
                        <div key={index} className="p-3 border rounded-md">
                            <div className="font-medium">{rel.name}</div>
                            <div className="text-sm text-muted-foreground">
                                {rel.type} → {rel.targetShardType}
                            </div>
                        </div>
                    ))}
                    {relationships.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            No relationships defined
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
