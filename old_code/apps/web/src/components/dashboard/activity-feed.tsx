"use client"

import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Activity, Edit, Plus, Share2, Trash } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"

interface ActivityItem {
  id: string
  type: "created" | "updated" | "deleted" | "shared"
  shardName: string
  shardId: string
  userName: string
  userId: string
  timestamp: string
}

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "created":
      return Plus
    case "updated":
      return Edit
    case "deleted":
      return Trash
    case "shared":
      return Share2
    default:
      return Activity
  }
}

function getActivityColor(type: ActivityItem["type"]) {
  switch (type) {
    case "created":
      return "text-green-600"
    case "updated":
      return "text-blue-600"
    case "deleted":
      return "text-red-600"
    case "shared":
      return "text-purple-600"
    default:
      return "text-gray-600"
  }
}

function getActivityMessage(item: ActivityItem) {
  switch (item.type) {
    case "created":
      return `created shard "${item.shardName}"`
    case "updated":
      return `updated shard "${item.shardName}"`
    case "deleted":
      return `deleted shard "${item.shardName}"`
    case "shared":
      return `shared shard "${item.shardName}"`
    default:
      return `performed action on "${item.shardName}"`
  }
}

function ActivityLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const { data } = await apiClient.get<ActivityItem[]>("/api/v1/dashboard/activity")
      return data
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <ActivityLoadingSkeleton />
          ) : !activities || activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">
                Activity will appear here when users interact with shards
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                const colorClass = getActivityColor(activity.type)

                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-full bg-secondary ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.userName}</span>
                        {" "}
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
