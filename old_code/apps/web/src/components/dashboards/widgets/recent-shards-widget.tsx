"use client"

import Link from "next/link"
import { FileText, ChevronRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Widget } from "@/types/dashboard"
import { formatDistanceToNow } from "date-fns"

interface RecentShardsWidgetProps {
  widget: Widget
  data: unknown
}

interface ShardItem {
  id: string
  shardTypeId: string
  name?: string
  createdAt: string
  updatedAt: string
  userId?: string
}

export function RecentShardsWidget({ widget, data }: RecentShardsWidgetProps) {
  const shards: ShardItem[] = Array.isArray(data) ? data : []

  if (shards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No recent shards
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1">
        {shards.map((shard) => (
          <Link
            key={shard.id}
            href={`/shards/${shard.id}`}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors group"
          >
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {shard.name || `Shard ${shard.id.slice(0, 8)}`}
                </span>
                <Badge variant="outline" className="text-xs">
                  {shard.shardTypeId?.replace('c_', '') || 'shard'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(shard.updatedAt), { addSuffix: true })}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </ScrollArea>
  )
}











