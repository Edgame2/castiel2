"use client"

import { useRouter } from "next/navigation"
import { Layers, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useShardTypes } from "@/hooks/use-shard-types"
import { Skeleton } from "@/components/ui/skeleton"

export function MyShardTypes() {
    const router = useRouter()
    const { data, isLoading } = useShardTypes({
        limit: 5,
    })

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        My Shard Types
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded" />
                            <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    const shardTypes = data?.items || []

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    My Shard Types
                </CardTitle>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/shard-types")}
                >
                    View All
                </Button>
            </CardHeader>
            <CardContent>
                {shardTypes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Layers className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">
                            No shard types yet
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/shard-types/new")}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Create Your First Type
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shardTypes.map((type) => (
                            <div
                                key={type.id}
                                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                                onClick={() => router.push(`/shard-types/${type.id}`)}
                            >
                                <div
                                    className="h-10 w-10 rounded flex items-center justify-center text-white font-semibold text-sm"
                                    style={{ backgroundColor: type.color || "#6366f1" }}
                                >
                                    {type.icon || type.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">
                                            {type.displayName || type.name}
                                        </p>
                                        <Badge variant="secondary" className="text-xs">
                                            {type.category}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {type.description || "No description"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
