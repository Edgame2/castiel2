"use client"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface JobStatusBadgeProps {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  showProgress?: boolean
}

export function JobStatusBadge({ status, progress = 0, showProgress = true }: JobStatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'processing':
        return 'default'
      case 'queued':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusVariant(status)}>
        {status === 'processing' && (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        )}
        {getStatusLabel(status)}
      </Badge>
      {showProgress && status === 'processing' && (
        <div className="flex items-center gap-2">
          <Progress value={progress} className="w-24 h-2" />
          <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}
