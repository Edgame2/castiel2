"use client"

import Link from "next/link"
import { FileText, Edit, Trash2, Plus, User } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Widget } from "@/types/dashboard"
import { formatDistanceToNow } from "date-fns"

interface ActivityWidgetProps {
  widget: Widget
  data: unknown
}

interface ActivityItem {
  id: string
  action: 'create' | 'update' | 'delete' | 'view'
  shardId?: string
  shardTypeId?: string
  shardName?: string
  userId?: string
  userName?: string
  timestamp: string
}

const ACTION_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: FileText,
}

const ACTION_COLORS = {
  create: 'text-green-500 bg-green-50',
  update: 'text-blue-500 bg-blue-50',
  delete: 'text-red-500 bg-red-50',
  view: 'text-slate-500 bg-slate-50',
}

const ACTION_LABELS = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  view: 'viewed',
}

export function ActivityWidget({ widget, data }: ActivityWidgetProps) {
  const activities: ActivityItem[] = Array.isArray(data) ? data : []

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No recent activity
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">
        {activities.map((activity) => {
          const ActionIcon = ACTION_ICONS[activity.action] || FileText
          const colorClass = ACTION_COLORS[activity.action] || ACTION_COLORS.view
          const actionLabel = ACTION_LABELS[activity.action] || 'interacted with'

          return (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {activity.userName?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.userName || 'Someone'}</span>
                  {' '}
                  <span className="text-muted-foreground">{actionLabel}</span>
                  {' '}
                  {activity.shardId ? (
                    <Link
                      href={`/shards/${activity.shardId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {activity.shardName || `a ${activity.shardTypeId?.replace('c_', '') || 'shard'}`}
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {activity.shardName || 'an item'}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
              <div className={`h-6 w-6 rounded flex items-center justify-center ${colorClass}`}>
                <ActionIcon className="h-3 w-3" />
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}











