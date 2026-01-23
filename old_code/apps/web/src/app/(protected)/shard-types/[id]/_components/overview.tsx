'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShardType } from '@/types/shard-types'
import { ShardTypeIcon } from '@/components/shard-types/shard-type-icon'

interface OverviewTabProps {
    shardType: ShardType
}

export function OverviewTab({ shardType }: OverviewTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>General Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <ShardTypeIcon icon={shardType.icon} color={shardType.color} size="lg" />
                        <div>
                            <div className="text-2xl font-bold">{shardType.displayName}</div>
                            <div className="text-muted-foreground">{shardType.name}</div>
                        </div>
                    </div>
                    {shardType.description && (
                        <div>
                            <div className="text-sm font-medium mb-1">Description</div>
                            <div className="text-muted-foreground">{shardType.description}</div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm font-medium mb-1">Category</div>
                            <Badge variant="outline">{shardType.category}</Badge>
                        </div>
                        <div>
                            <div className="text-sm font-medium mb-1">Status</div>
                            <Badge>{shardType.status}</Badge>
                        </div>
                    </div>
                    {shardType.tags && shardType.tags.length > 0 && (
                        <div>
                            <div className="text-sm font-medium mb-1">Tags</div>
                            <div className="flex flex-wrap gap-1">
                                {shardType.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <div className="text-sm font-medium mb-1">Created</div>
                            <div className="text-sm text-muted-foreground">
                                {new Date(shardType.createdAt).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium mb-1">Updated</div>
                            <div className="text-sm text-muted-foreground">
                                {new Date(shardType.updatedAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
