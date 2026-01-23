"use client"

import { CheckSquare, RefreshCw, Loader2, Plus, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Widget } from "@/types/dashboard"
import { formatDistanceToNow } from "date-fns"
import { useTasks } from "@/hooks/use-google-workspace"
import Link from "next/link"

interface TasksSummaryWidgetProps {
  widget: Widget
  data: unknown
}

interface TasksSummaryData {
  pendingCount: number
  completedCount: number
  totalCount: number
  recentTasks: Array<{
    id: string
    title: string
    notes?: string
    status?: string
    due?: string
  }>
}

export function TasksSummaryWidget({ widget, data }: TasksSummaryWidgetProps) {
  const integrationId = (widget.config as any)?.integrationId as string | undefined
  const tasklistId = (widget.config as any)?.tasklistId as string | undefined

  const { data: tasksData, isLoading, error, refetch } = useTasks(integrationId || '', tasklistId)

  // Use provided data or fetched data
  const tasks = (data as TasksSummaryData) || tasksData
  const isLoadingData = !data && isLoading
  const hasError = !data && error

  const pendingCount = tasks?.pendingCount || 0
  const completedCount = tasks?.completedCount || 0
  const totalCount = tasks?.totalCount || 0
  const recentTasks = tasks?.recentTasks || []

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load tasks</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          <span className="font-semibold">Tasks</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg border">
          <div className="text-xl font-bold">{pendingCount}</div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="text-center p-2 rounded-lg border">
          <div className="text-xl font-bold">{completedCount}</div>
          <div className="text-xs text-muted-foreground">Done</div>
        </div>
        <div className="text-center p-2 rounded-lg border">
          <div className="text-xl font-bold">{totalCount}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>

      {recentTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No pending tasks
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <CheckSquare className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium mb-1">
                    {task.title}
                  </div>
                  {task.due && (
                    <div className="text-xs text-muted-foreground">
                      Due {formatDistanceToNow(new Date(task.due), { addSuffix: true })}
                    </div>
                  )}
                </div>
                {task.status === 'completed' && (
                  <Badge variant="secondary" className="text-xs">
                    Done
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Button variant="outline" className="flex-1" size="sm" asChild>
          <Link
            href="https://tasks.google.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Tasks
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link
            href="https://tasks.google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}







