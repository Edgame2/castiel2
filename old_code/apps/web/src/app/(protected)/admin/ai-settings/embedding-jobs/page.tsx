"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  RefreshCw, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Download,
  X,
  FileJson,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { toast } from "sonner"
import { useEmbeddingJobs, useEmbeddingJobStats } from "@/hooks/use-embedding-jobs"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { EmbeddingJobStatsCard } from "./components/EmbeddingJobStatsCard"
import { EmbeddingJobList } from "./components/EmbeddingJobList"
import type { EmbeddingJob } from "@/lib/api/embedding-jobs"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SortColumn = 'status' | 'createdAt' | 'completedAt' | 'retryCount' | null;
type SortDirection = 'asc' | 'desc';

export default function EmbeddingJobsPage() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'processing' | 'completed' | 'failed' | undefined>(undefined)
  const [shardTypeFilter, setShardTypeFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'jobs' | 'stats'>('jobs')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedJob, setSelectedJob] = useState<EmbeddingJob | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const { data: statsData, isLoading: statsLoading, dataUpdatedAt: statsUpdatedAt, refetch: refetchStats, isError: statsError, error: statsErrorDetails } = useEmbeddingJobStats()
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs, isRefetching: isRefetchingJobs, dataUpdatedAt: jobsUpdatedAt, isError: jobsError, error: jobsErrorDetails } = useEmbeddingJobs({
    status: statusFilter,
    shardTypeId: shardTypeFilter || undefined,
    limit: 50,
  })

  const handleRefresh = () => {
    refetchJobs()
    refetchStats()
    toast.success('Refreshing data...')
  }

  // Track the most recent update time
  useEffect(() => {
    const updateTimes = [jobsUpdatedAt, statsUpdatedAt].filter(Boolean) as number[]
    if (updateTimes.length > 0) {
      const mostRecent = Math.max(...updateTimes)
      setLastUpdated(new Date(mostRecent))
    }
  }, [jobsUpdatedAt, statsUpdatedAt])

  const jobs = jobsData?.jobs || []
  const stats = statsData || { pending: 0, processing: 0, completed: 0, failed: 0 }

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || statusFilter !== undefined || shardTypeFilter !== '';

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter(undefined);
    setShardTypeFilter('');
  };

  // Filter jobs by search query (client-side)
  const filteredJobs = searchQuery
    ? jobs.filter(
        (job) =>
          job.shardId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.shardTypeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison = 0;

    switch (sortColumn) {
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'completedAt': {
        // Handle jobs without completedAt (null/undefined)
        if (!a.completedAt && !b.completedAt) return 0;
        if (!a.completedAt) return 1; // Jobs without completion go to end
        if (!b.completedAt) return -1;
        comparison = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
        break;
      }
      case 'retryCount':
        comparison = a.retryCount - b.retryCount;
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default descending direction
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sort icon for a column
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Pagination logic
  const totalPages = Math.ceil(sortedJobs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, shardTypeFilter, sortColumn, sortDirection]);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const handleViewDetails = (job: EmbeddingJob) => {
    setSelectedJob(job);
    setDetailsDialogOpen(true);
  };

  const exportData = (format: 'json' | 'csv') => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        statusFilter: statusFilter || 'all',
        shardTypeFilter: shardTypeFilter || 'all',
        stats,
        jobs: filteredJobs.map(job => ({
          id: job.id,
          shardId: job.shardId,
          shardTypeId: job.shardTypeId,
          status: job.status,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          retryCount: job.retryCount || 0,
          error: job.error,
          metadata: job.metadata,
        })),
      }

      if (format === 'json') {
        const jsonStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a' as any)
        a.href = url
        a.download = `embedding-jobs-${new Date().toISOString().split('T' as any)[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Embedding jobs data exported as JSON')
      } else {
        // CSV export
        const csvRows: string[] = []
        
        // Header
        csvRows.push('Job ID,Shard ID,Shard Type ID,Status,Type,Created At,Started At,Completed At,Retry Count,Error')
        
        // Data rows
        filteredJobs.forEach(job => {
          const error = job.error?.replace(/,/g, ';') || ''
          
          csvRows.push([
            job.id,
            job.shardId,
            job.shardTypeId || '',
            job.status,
            job.createdAt || '',
            job.completedAt || '',
            (job.retryCount || 0).toString(),
            error,
          ].join(','))
        })
        
        const csvStr = csvRows.join('\n')
        const blob = new Blob([csvStr], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a' as any)
        a.href = url
        a.download = `embedding-jobs-${new Date().toISOString().split('T' as any)[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Embedding jobs data exported as CSV')
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Export failed in embedding jobs page', 3, {
        errorMessage: errorObj.message,
      })
      toast.error('Failed to export embedding jobs data')
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Embedding Jobs</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Monitor and manage embedding generation jobs for shards
            </p>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportData('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={jobsLoading || statsLoading || isRefetchingJobs}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${jobsLoading || statsLoading || isRefetchingJobs ? 'animate-spin' : ''}`} />
            {isRefetchingJobs ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error States */}
      {(jobsError || statsError) && (
        <div className="space-y-2">
          {jobsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load embedding jobs</AlertTitle>
              <AlertDescription>
                {jobsErrorDetails instanceof Error 
                  ? jobsErrorDetails.message 
                  : 'An error occurred while loading embedding jobs data. Please try refreshing the page.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchJobs()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {statsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Failed to load embedding job statistics</AlertTitle>
              <AlertDescription>
                {statsErrorDetails instanceof Error 
                  ? statsErrorDetails.message 
                  : 'An error occurred while loading embedding job statistics. Please try refreshing the page.'}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetchStats()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'jobs' | 'stats')}>
        <TabsList>
          <TabsTrigger value="jobs">
            Jobs ({jobsData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          <EmbeddingJobStatsCard stats={stats} isLoading={statsLoading} />
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by shard ID, type, or job ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v as any)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Shard Type ID"
                  value={shardTypeFilter}
                  onChange={(e) => setShardTypeFilter(e.target.value)}
                  className="w-[200px]"
                />
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Jobs List */}
          <EmbeddingJobList 
            jobs={paginatedJobs} 
            isLoading={jobsLoading} 
            hasActiveFilters={hasActiveFilters}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            getSortIcon={getSortIcon}
            onViewDetails={handleViewDetails}
          />

          {/* Pagination Controls */}
          {sortedJobs.length > 0 && (
            <Card>
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Rows per page</p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedJobs.length)} of {sortedJobs.length} jobs
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Embedding Job Details</DialogTitle>
            <DialogDescription>
              Job ID: {selectedJob?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {selectedJob.status === 'pending' && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    {selectedJob.status === 'processing' && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {selectedJob.status === 'completed' && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                    {selectedJob.status === 'failed' && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                        <XCircle className="mr-1 h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Retry Count</p>
                  <p className="text-sm">{selectedJob.retryCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shard ID</p>
                  <p className="text-sm font-mono">{selectedJob.shardId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Shard Type ID</p>
                  <p className="text-sm font-mono">{selectedJob.shardTypeId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="text-sm">{new Date(selectedJob.createdAt).toLocaleString()}</p>
                </div>
                {selectedJob.completedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                    <p className="text-sm">{new Date(selectedJob.completedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated At</p>
                  <p className="text-sm">{new Date(selectedJob.updatedAt).toLocaleString()}</p>
                </div>
                {selectedJob.completedAt && selectedJob.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="text-sm">
                      {Math.round((new Date(selectedJob.completedAt).getTime() - new Date(selectedJob.createdAt).getTime()) / 1000)}s
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {selectedJob.metadata && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                  <div className="space-y-2 p-3 bg-muted rounded">
                    {selectedJob.metadata.embeddingModel && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Embedding Model</span>
                        <code className="text-sm font-mono">{selectedJob.metadata.embeddingModel}</code>
                      </div>
                    )}
                    {selectedJob.metadata.vectorCount !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Vector Count</span>
                        <span className="text-sm font-medium">{selectedJob.metadata.vectorCount.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedJob.metadata.processingTimeMs !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Processing Time</span>
                        <span className="text-sm font-medium">
                          {selectedJob.metadata.processingTimeMs < 1000
                            ? `${selectedJob.metadata.processingTimeMs}ms`
                            : `${(selectedJob.metadata.processingTimeMs / 1000).toFixed(2)}s`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {selectedJob.error && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Error</p>
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-sm text-destructive">{selectedJob.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}






