"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Clock, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api/client"

interface RecentShard {
  id: string
  name: string
  shardTypeName: string
  isPublic: boolean
  lastAccessedAt: string
  recordCount: number
}

function RecentShardsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RecentShards() {
  const router = useRouter()

  const { data: recentShards, isLoading } = useQuery({
    queryKey: ["dashboard", "recent-shards"],
    queryFn: async () => {
      const { data } = await apiClient.get<RecentShard[]>("/api/v1/dashboard/recent-shards")
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Accessed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <RecentShardsLoadingSkeleton />
          ) : !recentShards || recentShards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent shards</p>
              <p className="text-sm mt-2">
                Shards you access will appear here for quick access
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentShards.map((shard) => (
                <button
                  key={shard.id}
                  onClick={() => router.push(`/shards/${shard.id}`)}
                  className="w-full flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="p-2 rounded bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{shard.name}</p>
                      <Badge variant={shard.isPublic ? "default" : "secondary"}>
                        {shard.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {shard.shardTypeName} • {shard.recordCount} records
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Accessed{" "}
                      {formatDistanceToNow(new Date(shard.lastAccessedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {recentShards && recentShards.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => router.push("/shards")}
          >
            View All Shards
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
