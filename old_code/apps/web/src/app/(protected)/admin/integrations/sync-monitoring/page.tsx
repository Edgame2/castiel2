'use client';

import { useState, useEffect } from 'react';
import {
  useSyncExecutions,
  useSyncTasks,
  useTenantIntegrations,
  useRetrySyncExecution,
  useCancelSyncExecution,
  useTriggerSyncTask,
} from '@/hooks/use-integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Play,
  Square,
  RotateCw,
  Filter,
  Search,
  X,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Download,
  FileJson,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { SyncExecution } from '@/types/integration.types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const STATUS_CONFIG = {
  running: { 
    label: 'Running', 
    icon: <Loader2 className="h-4 w-4 animate-spin" />, 
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  completed: { 
    label: 'Completed', 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    className: 'bg-green-500/10 text-green-500 border-green-500/20' 
  },
  failed: { 
    label: 'Failed', 
    icon: <XCircle className="h-4 w-4" />, 
    className: 'bg-red-500/10 text-red-500 border-red-500/20' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: <Square className="h-4 w-4" />, 
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20' 
  },
};

type SortColumn = 'startedAt' | 'duration' | 'status' | 'records' | null;
type SortDirection = 'asc' | 'desc';

export default function SyncMonitoringPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<number>(1440); // 24 hours default
  const [selectedExecution, setSelectedExecution] = useState<SyncExecution | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: tenantIntegrations } = useTenantIntegrations();
  const integrationId = tenantIntegrations?.integrations?.[0]?.integrationId || '';
  const { data: syncExecutions, isLoading: loadingExecutions, refetch: refetchExecutions, isRefetching: isRefetchingExecutions, dataUpdatedAt: executionsUpdatedAt, isError: executionsError, error: executionsErrorDetails } = useSyncExecutions(integrationId, {
    limit: 100,
  });

  // Track the most recent update time
  useEffect(() => {
    if (executionsUpdatedAt) {
      setLastUpdated(new Date(executionsUpdatedAt));
    }
  }, [executionsUpdatedAt]);

  // Auto-refresh when there are running executions
  useEffect(() => {
    const hasRunningExecutions = syncExecutions?.executions.some(
      exec => exec.status === 'running'
    );

    if (!hasRunningExecutions) {
      return; // No running executions, no need to auto-refresh
    }

    // Auto-refresh every 5 seconds when there are running executions
    const interval = setInterval(() => {
      refetchExecutions();
    }, 5000);

    return () => clearInterval(interval);
  }, [syncExecutions?.executions, refetchExecutions]);

  const retrySyncExecution = useRetrySyncExecution();
  const cancelSyncExecution = useCancelSyncExecution();
  const triggerSyncTask = useTriggerSyncTask();

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || timeRange < 999999;

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTimeRange(999999); // All time
  };

  // Calculate time range cutoff
  const timeRangeCutoff = new Date(Date.now() - timeRange * 60 * 1000);

  // Filter executions
  const filteredExecutions = syncExecutions?.executions.filter(execution => {
    const matchesStatus = statusFilter === 'all' || execution.status === statusFilter;
    const matchesSearch = 
      execution.syncTaskId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      execution.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTimeRange = execution.startedAt 
      ? new Date(execution.startedAt) >= timeRangeCutoff
      : true; // Include executions without start time
    return matchesStatus && matchesSearch && matchesTimeRange;
  }) || [];

  // Sort executions
  const sortedExecutions = [...filteredExecutions].sort((a, b) => {
    if (!sortColumn) return 0;

    let comparison = 0;

    switch (sortColumn) {
      case 'startedAt':
        comparison = new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        break;
      case 'duration': {
        const durationA = a.completedAt && a.startedAt
          ? new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()
          : a.status === 'running' ? Infinity : -Infinity;
        const durationB = b.completedAt && b.startedAt
          ? new Date(b.completedAt).getTime() - new Date(b.startedAt).getTime()
          : b.status === 'running' ? Infinity : -Infinity;
        comparison = durationA - durationB;
        break;
      }
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'records': {
        const recordsA = a.progress?.processedRecords || 0;
        const recordsB = b.progress?.processedRecords || 0;
        comparison = recordsA - recordsB;
        break;
      }
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
  const totalPages = Math.ceil(sortedExecutions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedExecutions = sortedExecutions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, timeRange, sortColumn, sortDirection]);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  // Calculate stats from filtered executions
  const stats = {
    total: filteredExecutions.length,
    running: filteredExecutions.filter(e => e.status === 'running').length,
    completed: filteredExecutions.filter(e => e.status === 'completed').length,
    failed: filteredExecutions.filter(e => e.status === 'failed').length,
  };

  const successRate = stats.total > 0 
    ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100)
    : 0;

  const exportData = (format: 'json' | 'csv') => {
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        statusFilter,
        timeRange: `${timeRange} minutes`,
        stats,
        successRate,
        executions: filteredExecutions.map(exec => ({
          id: exec.id,
          taskId: exec.syncTaskId,
          status: exec.status,
          startedAt: exec.startedAt?.toISOString(),
          completedAt: exec.completedAt?.toISOString(),
          duration: exec.completedAt && exec.startedAt
            ? exec.completedAt.getTime() - exec.startedAt.getTime()
            : null,
          recordsCreated: exec.results?.created || 0,
          recordsUpdated: exec.results?.updated || 0,
          recordsFailed: exec.results?.failed || 0,
          recordsFetched: exec.results?.fetched || 0,
          error: exec.error?.message,
        })),
      };

      if (format === 'json') {
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a' as any);
        a.href = url;
        a.download = `sync-monitoring-${new Date().toISOString().split('T' as any)[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Sync monitoring data exported as JSON');
      } else {
        // CSV export
        const csvRows: string[] = [];
        
        // Header
        csvRows.push('Execution ID,Task ID,Status,Started At,Completed At,Duration (ms),Records Created,Records Updated,Records Failed,Records Fetched,Error');
        
        // Data rows
        filteredExecutions.forEach(exec => {
          const duration = exec.completedAt && exec.startedAt
            ? exec.completedAt.getTime() - exec.startedAt.getTime()
            : '';
          const error = exec.error?.message?.replace(/,/g, ';') || '';
          
          csvRows.push([
            exec.id,
            exec.syncTaskId || '',
            exec.status,
            exec.startedAt?.toISOString() || '',
            exec.completedAt?.toISOString() || '',
            duration.toString(),
            (exec.results?.created || 0).toString(),
            (exec.results?.updated || 0).toString(),
            (exec.results?.failed || 0).toString(),
            (exec.results?.fetched || 0).toString(),
            error,
          ].join(','));
        });
        
        const csvStr = csvRows.join('\n');
        const blob = new Blob([csvStr], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a' as any);
        a.href = url;
        a.download = `sync-monitoring-${new Date().toISOString().split('T' as any)[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Sync monitoring data exported as CSV');
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Export failed', 3, {
        errorMessage: errorObj.message,
      })
      toast.error('Failed to export sync monitoring data');
    }
  };

  const handleRetry = async (execution: SyncExecution) => {
    try {
      await retrySyncExecution.mutateAsync({
        integrationId: execution.tenantIntegrationId,
        executionId: execution.id,
      });
      toast.success('Sync retry initiated', {
        description: 'The sync task will be retried shortly',
      });
    } catch (error) {
      toast.error('Retry failed', {
        description: 'An error occurred while retrying the sync',
      });
    }
  };

  const handleCancel = async () => {
    if (!selectedExecution) return;

    try {
      await cancelSyncExecution.mutateAsync({
        integrationId: selectedExecution.tenantIntegrationId,
        executionId: selectedExecution.id,
      });
      toast.success('Sync cancelled', {
        description: 'The sync execution has been cancelled',
      });
      setCancelDialogOpen(false);
      setSelectedExecution(null);
    } catch (error) {
      toast.error('Cancel failed', {
        description: 'An error occurred while cancelling the sync',
      });
    }
  };

  const openCancelDialog = (execution: SyncExecution) => {
    setSelectedExecution(execution);
    setCancelDialogOpen(true);
  };

  const openDetailsDialog = (execution: SyncExecution) => {
    setSelectedExecution(execution);
    setDetailsDialogOpen(true);
  };

  if (loadingExecutions) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sync Monitoring</h2>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">
              Monitor synchronization tasks and executions
            </p>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">Last hour</SelectItem>
              <SelectItem value="240">Last 4 hours</SelectItem>
              <SelectItem value="1440">Last 24 hours</SelectItem>
              <SelectItem value="10080">Last 7 days</SelectItem>
              <SelectItem value="43200">Last 30 days</SelectItem>
              <SelectItem value="999999">All time</SelectItem>
            </SelectContent>
          </Select>
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
            onClick={() => {
              refetchExecutions();
              toast.success('Refreshing data...');
            }}
            variant="outline"
            disabled={isRefetchingExecutions}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetchingExecutions ? 'animate-spin' : ''}`} />
            {isRefetchingExecutions ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {executionsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load sync executions</AlertTitle>
          <AlertDescription>
            {executionsErrorDetails instanceof Error 
              ? executionsErrorDetails.message 
              : 'An error occurred while loading sync execution data. Please try refreshing the page.'}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => refetchExecutions()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Syncs</CardTitle>
            <Loader2 className={`h-4 w-4 ${stats.running > 0 ? 'text-blue-500 animate-spin' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.running}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.failed > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Executions</CardTitle>
          <CardDescription>View and manage synchronization executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by task ID or execution ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Executions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution ID</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('status' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('startedAt' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Started
                      {getSortIcon('startedAt')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('duration' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Duration
                      {getSortIcon('duration')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('records' as any)}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Records
                      {getSortIcon('records')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">No sync executions found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {searchQuery || statusFilter !== 'all' || timeRange < 999999
                            ? 'Try adjusting your filters or time range to see more results.'
                            : 'Sync executions will appear here when synchronization tasks are executed.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExecutions.map(execution => {
                    const config = STATUS_CONFIG[execution.status as keyof typeof STATUS_CONFIG];
                    const duration = execution.completedAt 
                      ? Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={execution.id}>
                        <TableCell className="font-mono text-xs">
                          {execution.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {execution.syncTaskId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.className}>
                            <span className="flex items-center gap-1">
                              {config.icon}
                              {config.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {duration ? `${duration}s` : execution.status === 'running' ? 'In progress' : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {execution.recordsProcessed || 0} / {execution.recordsTotal || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {execution.status === 'failed' && (
                                <DropdownMenuItem onClick={() => handleRetry(execution)}>
                                  <RotateCw className="h-4 w-4 mr-2" />
                                  Retry
                                </DropdownMenuItem>
                              )}
                              {execution.status === 'running' && (
                                <DropdownMenuItem 
                                  onClick={() => openCancelDialog(execution)}
                                  className="text-red-500"
                                >
                                  <Square className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => openDetailsDialog(execution)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                View Logs
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {sortedExecutions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
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
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedExecutions.length)} of {sortedExecutions.length} executions
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Sync Execution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this sync execution? 
              This action cannot be undone and any partially synced data may need to be cleaned up manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Running</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600"
            >
              Cancel Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Execution Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Execution Details</DialogTitle>
            <DialogDescription>
              Execution ID: {selectedExecution?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedExecution && (
            <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="outline" className={STATUS_CONFIG[selectedExecution.status as keyof typeof STATUS_CONFIG]?.className}>
                    <span className="flex items-center gap-1">
                      {STATUS_CONFIG[selectedExecution.status as keyof typeof STATUS_CONFIG]?.icon}
                      {STATUS_CONFIG[selectedExecution.status as keyof typeof STATUS_CONFIG]?.label}
                    </span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Task ID</p>
                  <p className="text-sm font-mono">{selectedExecution.syncTaskId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Started At</p>
                  <p className="text-sm">{new Date(selectedExecution.startedAt).toLocaleString()}</p>
                </div>
                {selectedExecution.completedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed At</p>
                    <p className="text-sm">{new Date(selectedExecution.completedAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Triggered By</p>
                  <p className="text-sm capitalize">{selectedExecution.triggeredBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Retry Count</p>
                  <p className="text-sm">{selectedExecution.retryCount}</p>
                </div>
              </div>

              {/* Progress Information */}
              {selectedExecution.progress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Progress</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Phase</span>
                      <span className="text-sm font-medium capitalize">{selectedExecution.progress.phase}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Processed Records</span>
                      <span className="text-sm font-medium">
                        {selectedExecution.progress.processedRecords} / {selectedExecution.progress.totalRecords || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Percentage</span>
                      <span className="text-sm font-medium">{selectedExecution.progress.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Results */}
              {selectedExecution.results && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Results</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Fetched</span>
                      <span className="text-sm font-medium">{selectedExecution.results.fetched}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Created</span>
                      <span className="text-sm font-medium text-green-600">{selectedExecution.results.created}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Updated</span>
                      <span className="text-sm font-medium text-blue-600">{selectedExecution.results.updated}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Skipped</span>
                      <span className="text-sm font-medium text-yellow-600">{selectedExecution.results.skipped}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Failed</span>
                      <span className="text-sm font-medium text-red-600">{selectedExecution.results.failed}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {selectedExecution.errors && selectedExecution.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Errors</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedExecution.errors.map((error, index) => (
                      <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{error.phase}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-destructive">{error.error}</p>
                        {error.recordId && (
                          <p className="text-xs text-muted-foreground mt-1">Record ID: {error.recordId}</p>
                        )}
                        {error.externalId && (
                          <p className="text-xs text-muted-foreground">External ID: {error.externalId}</p>
                        )}
                        <Badge variant={error.recoverable ? 'default' : 'destructive'} className="mt-1 text-xs">
                          {error.recoverable ? 'Recoverable' : 'Non-recoverable'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration */}
              {selectedExecution.completedAt && selectedExecution.startedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="text-sm">
                    {Math.round((new Date(selectedExecution.completedAt).getTime() - new Date(selectedExecution.startedAt).getTime()) / 1000)}s
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
