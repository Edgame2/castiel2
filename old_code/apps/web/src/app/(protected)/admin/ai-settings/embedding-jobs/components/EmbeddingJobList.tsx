"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  ExternalLink,
  AlertCircle,
  MoreVertical,
  Eye,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { EmbeddingJob } from "@/lib/api/embedding-jobs"
import Link from "next/link"
import type { ReactNode } from "react"

type SortColumn = 'status' | 'createdAt' | 'completedAt' | 'retryCount' | null;
type SortDirection = 'asc' | 'desc';

interface EmbeddingJobListProps {
  jobs: EmbeddingJob[]
  isLoading: boolean
  hasActiveFilters?: boolean
  sortColumn?: SortColumn
  sortDirection?: SortDirection
  onSort?: (column: SortColumn) => void
  getSortIcon?: (column: SortColumn) => ReactNode
  onViewDetails?: (job: EmbeddingJob) => void
}

export function EmbeddingJobList({ 
  jobs, 
  isLoading, 
  hasActiveFilters = false,
  sortColumn = null,
  sortDirection = 'desc',
  onSort,
  getSortIcon,
  onViewDetails,
}: EmbeddingJobListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedding Jobs</CardTitle>
          <CardDescription>List of embedding generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embedding Jobs</CardTitle>
          <CardDescription>List of embedding generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No embedding jobs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : 'Jobs will appear here when shards are created or updated'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: EmbeddingJob['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embedding Jobs</CardTitle>
        <CardDescription>
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {onSort ? (
                    <button
                      onClick={() => onSort('status' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Status
                      {getSortIcon && getSortIcon('status')}
                    </button>
                  ) : (
                    'Status'
                  )}
                </TableHead>
                <TableHead>Shard ID</TableHead>
                <TableHead>Shard Type</TableHead>
                <TableHead>
                  {onSort ? (
                    <button
                      onClick={() => onSort('createdAt' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Created
                      {getSortIcon && getSortIcon('createdAt')}
                    </button>
                  ) : (
                    'Created'
                  )}
                </TableHead>
                <TableHead>
                  {onSort ? (
                    <button
                      onClick={() => onSort('completedAt' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Completed
                      {getSortIcon && getSortIcon('completedAt')}
                    </button>
                  ) : (
                    'Completed'
                  )}
                </TableHead>
                <TableHead>
                  {onSort ? (
                    <button
                      onClick={() => onSort('retryCount' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Retries
                      {getSortIcon && getSortIcon('retryCount')}
                    </button>
                  ) : (
                    'Retries'
                  )}
                </TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {job.shardId.substring(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {job.shardTypeId}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.completedAt
                      ? formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {job.retryCount > 0 ? (
                      <Badge variant="secondary">{job.retryCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {job.metadata ? (
                      <div className="text-xs space-y-1">
                        {job.metadata.embeddingModel && (
                          <div>
                            <span className="text-muted-foreground">Model:</span>{' '}
                            <code>{job.metadata.embeddingModel}</code>
                          </div>
                        )}
                        {job.metadata.vectorCount !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Vectors:</span>{' '}
                            {job.metadata.vectorCount}
                          </div>
                        )}
                        {job.metadata.processingTimeMs !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Time:</span>{' '}
                            {job.metadata.processingTimeMs}ms
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.error && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title={job.error}
                          className="text-red-600 hover:text-red-700"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/shards/${job.shardId}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      {onViewDetails && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewDetails(job)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}






