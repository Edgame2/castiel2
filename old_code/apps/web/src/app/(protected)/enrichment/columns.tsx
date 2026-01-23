"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, RotateCw, X, Eye } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { JobStatusBadge } from "@/components/enrichment/job-status-badge"
import type { EnrichmentJob } from "@/types/api"

interface EnrichmentColumnsProps {
  onRetry: (jobId: string) => void
  onCancel: (jobId: string) => void
}

export function getEnrichmentColumns({
  onRetry,
  onCancel,
}: EnrichmentColumnsProps): ColumnDef<EnrichmentJob>[] {
  return [
    {
      accessorKey: "shardName",
      header: "Shard",
      cell: ({ row }) => {
        const job = row.original
        return (
          <div className="flex flex-col">
            <span className="font-medium">{job.shardName}</span>
            <span className="text-xs text-muted-foreground">{job.shardId.substring(0, 8)}...</span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const job = row.original
        return <JobStatusBadge status={job.status} progress={job.progress} />
      },
    },
    {
      accessorKey: "processors",
      header: "Processors",
      cell: ({ row }) => {
        const job = row.original
        return (
          <div className="flex flex-wrap gap-1">
            {job.processors.map((processor) => (
              <Badge key={processor} variant="outline" className="text-xs">
                {processor}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const job = row.original
        if (!job.duration) {
          if (job.startedAt) {
            const elapsed = Date.now() - new Date(job.startedAt).getTime()
            const seconds = Math.floor(elapsed / 1000)
            return <span className="text-muted-foreground">{seconds}s (running)</span>
          }
          return <span className="text-muted-foreground">-</span>
        }
        const seconds = Math.floor(job.duration / 1000)
        const minutes = Math.floor(seconds / 60)
        if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`
        }
        return `${seconds}s`
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const job = row.original
        return (
          <div className="flex flex-col">
            <span>{format(new Date(job.createdAt), "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(job.createdAt), "HH:mm:ss")}
            </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const job = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/enrichment/${job.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {job.status === 'failed' && (
                <DropdownMenuItem onClick={() => onRetry(job.id)}>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Retry
                </DropdownMenuItem>
              )}
              {(job.status === 'queued' || job.status === 'processing') && (
                <DropdownMenuItem
                  onClick={() => onCancel(job.id)}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
