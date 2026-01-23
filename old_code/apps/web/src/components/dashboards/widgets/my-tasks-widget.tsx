"use client"

import Link from "next/link"
import { CheckCircle, Circle, Clock, AlertCircle, ChevronRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Widget } from "@/types/dashboard"
import { cn } from "@/lib/utils"
import { format, isPast, isToday } from "date-fns"

interface MyTasksWidgetProps {
  widget: Widget
  data: unknown
}

interface TaskItem {
  id: string
  structuredData: {
    title?: string
    name?: string
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: string
  }
}

const STATUS_ICONS = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: AlertCircle,
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
}

export function MyTasksWidget({ widget, data }: MyTasksWidgetProps) {
  const tasks: TaskItem[] = Array.isArray(data) ? data : []

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <span>All caught up!</span>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1">
        {tasks.map((task) => {
          const { structuredData } = task
          const status = structuredData.status || 'pending'
          const StatusIcon = STATUS_ICONS[status] || Circle
          const title = structuredData.title || structuredData.name || 'Untitled Task'
          const dueDate = structuredData.dueDate ? new Date(structuredData.dueDate) : null
          const isOverdue = dueDate && isPast(dueDate) && status !== 'completed'
          const isDueToday = dueDate && isToday(dueDate)

          return (
            <Link
              key={task.id}
              href={`/shards/${task.id}`}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors group"
            >
              <StatusIcon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  status === 'completed' && "text-green-500",
                  status === 'in_progress' && "text-blue-500",
                  status === 'pending' && "text-muted-foreground",
                  status === 'cancelled' && "text-muted-foreground"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-medium text-sm truncate",
                      status === 'completed' && "line-through text-muted-foreground"
                    )}
                  >
                    {title}
                  </span>
                  {structuredData.priority && structuredData.priority !== 'medium' && (
                    <Badge
                      className={cn(
                        "text-xs",
                        PRIORITY_COLORS[structuredData.priority]
                      )}
                    >
                      {structuredData.priority}
                    </Badge>
                  )}
                </div>
                {dueDate && (
                  <p
                    className={cn(
                      "text-xs",
                      isOverdue && "text-red-500",
                      isDueToday && !isOverdue && "text-orange-500",
                      !isOverdue && !isDueToday && "text-muted-foreground"
                    )}
                  >
                    {isOverdue
                      ? `Overdue: ${format(dueDate, 'MMM d')}`
                      : isDueToday
                      ? 'Due today'
                      : `Due ${format(dueDate, 'MMM d')}`}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )
        })}
      </div>
    </ScrollArea>
  )
}











