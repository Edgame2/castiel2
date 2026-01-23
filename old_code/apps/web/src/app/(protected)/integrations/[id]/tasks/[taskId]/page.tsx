'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useTenantIntegration,
  useIntegration,
  useConversionSchemas,
  useSyncTask,
  useUpdateSyncTask,
  useDeleteSyncTask,
  useTriggerSyncTask,
  usePauseSyncTask,
  useResumeSyncTask,
  useSyncExecutions,
} from '@/hooks/use-integrations';
import { SyncTaskForm, SyncTaskFormData } from '@/components/integrations/sync-task-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Play,
  Pause,
  History,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import type { SyncTaskStatus, SyncExecutionStatus, SyncExecution } from '@/types/integration.types';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

const TASK_STATUS_CONFIG: Record<SyncTaskStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-500/10 text-green-500' },
  paused: { label: 'Paused', className: 'bg-yellow-500/10 text-yellow-500' },
  error: { label: 'Error', className: 'bg-red-500/10 text-red-500' },
  disabled: { label: 'Disabled', className: 'bg-gray-500/10 text-gray-500' },
};

const EXECUTION_STATUS_CONFIG: Record<SyncExecutionStatus, { label: string; className: string; icon: React.ReactNode }> = {
  running: { label: 'Running', className: 'bg-blue-500/10 text-blue-500', icon: <Clock className="h-4 w-4" /> },
  success: { label: 'Success', className: 'bg-green-500/10 text-green-500', icon: <CheckCircle2 className="h-4 w-4" /> },
  partial: { label: 'Partial', className: 'bg-yellow-500/10 text-yellow-500', icon: <Clock className="h-4 w-4" /> },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500', icon: <XCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-500', icon: <XCircle className="h-4 w-4" /> },
};

export default function EditSyncTaskPage() {
  const params = useParams();
  const router = useRouter();
  const integrationId = params.id as string;
  const taskId = params.taskId as string;

  const { data: tenantIntegration, isLoading: loadingTenant } = useTenantIntegration(integrationId);
  const { data: integration } = useIntegration(
    tenantIntegration?.integrationId || ''
  );
  const { data: schemas, isLoading: loadingSchemas } = useConversionSchemas(integrationId);
  const { data: task, isLoading: loadingTask } = useSyncTask(integrationId, taskId);
  const { data: executions } = useSyncExecutions(integrationId, { taskId, limit: 20 });

  const updateTask = useUpdateSyncTask();
  const deleteTask = useDeleteSyncTask();
  const triggerTask = useTriggerSyncTask();
  const pauseTask = usePauseSyncTask();
  const resumeTask = useResumeSyncTask();

  const isLoading = loadingTenant || loadingSchemas || loadingTask;

  const handleSubmit = async (data: SyncTaskFormData) => {
    try {
      await updateTask.mutateAsync({
        integrationId,
        taskId,
        data: {
          name: data.name,
          description: data.description,
          conversionSchemaId: data.conversionSchemaId,
          direction: data.direction,
          schedule: data.schedule,
          config: data.config,
          conflictResolution: data.conflictResolution,
          retryConfig: data.retryConfig,
          notifications: data.notifications,
        },
      });
      toast.success('Task updated successfully');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to update task', 3, {
        errorMessage: errorObj.message,
        integrationId,
        taskId,
      })
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync({ integrationId, taskId });
      toast.success('Task deleted');
      router.push(`/integrations/${integrationId}/configure`);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to delete task', 3, {
        errorMessage: errorObj.message,
        integrationId,
        taskId,
      })
      toast.error('Failed to delete task');
    }
  };

  const handleRunNow = async () => {
    try {
      await triggerTask.mutateAsync({ integrationId, taskId });
      toast.success('Sync task started');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to trigger task', 3, {
        errorMessage: errorObj.message,
        integrationId,
        taskId,
      })
      toast.error('Failed to start sync');
    }
  };

  const handlePause = async () => {
    try {
      await pauseTask.mutateAsync({ integrationId, taskId });
      toast.success('Task paused');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to pause task', 3, {
        errorMessage: errorObj.message,
        integrationId,
        taskId,
      })
      toast.error('Failed to pause task');
    }
  };

  const handleResume = async () => {
    try {
      await resumeTask.mutateAsync({ integrationId, taskId });
      toast.success('Task resumed');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to resume task', 3, {
        errorMessage: errorObj.message,
        integrationId,
        taskId,
      })
      toast.error('Failed to resume task');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">Task not found</h3>
          <p className="text-muted-foreground mb-4">
            This task may have been deleted.
          </p>
          <Button asChild>
            <Link href={`/integrations/${integrationId}/configure`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configuration
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/integrations/${integrationId}/configure`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Configuration
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{task.name}</h1>
              <Badge className={TASK_STATUS_CONFIG[task.status].className}>
                {TASK_STATUS_CONFIG[task.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {task.description || 'Sync task configuration'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {task.status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={pauseTask.isPending}
              >
                {pauseTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Pause className="h-4 w-4 mr-2" />
                )}
                Pause
              </Button>
            ) : task.status === 'paused' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                disabled={resumeTask.isPending}
              >
                {resumeTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Resume
              </Button>
            ) : null}

            <Button
              size="sm"
              onClick={handleRunNow}
              disabled={triggerTask.isPending}
            >
              {triggerTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Now
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Sync Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this sync task? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{task.stats.totalRuns}</div>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {task.stats.totalRuns > 0
                ? `${Math.round((task.stats.successfulRuns / task.stats.totalRuns) * 100)}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{task.stats.recordsProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Records Processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {task.nextRunAt
                ? formatDistanceToNow(new Date(task.nextRunAt), { addSuffix: true })
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Next Run</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {!executions || executions.executions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No sync history</h3>
                <p className="text-muted-foreground mb-4">
                  Run this task to see execution history.
                </p>
                <Button onClick={handleRunNow} disabled={triggerTask.isPending}>
                  {triggerTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {executions.executions.map((execution: SyncExecution) => (
                <Card key={execution.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Badge className={EXECUTION_STATUS_CONFIG[execution.status].className}>
                          {EXECUTION_STATUS_CONFIG[execution.status].icon}
                          <span className="ml-1">{EXECUTION_STATUS_CONFIG[execution.status].label}</span>
                        </Badge>
                        <div>
                          <p className="font-medium">
                            {format(new Date(execution.startedAt), 'MMM d, yyyy h:mm a')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {execution.triggeredBy === 'manual' ? 'Manual run' :
                             execution.triggeredBy === 'schedule' ? 'Scheduled' :
                             execution.triggeredBy === 'webhook' ? 'Webhook' : 'Retry'}
                          </p>
                        </div>
                      </div>

                      {execution.status === 'running' && execution.progress ? (
                        <div className="w-48">
                          <Progress value={execution.progress.percentage} />
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            {execution.progress.processedRecords} / {execution.progress.totalRecords || '?'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-medium text-green-500">{execution.results.created}</p>
                            <p className="text-muted-foreground">Created</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-blue-500">{execution.results.updated}</p>
                            <p className="text-muted-foreground">Updated</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-yellow-500">{execution.results.skipped}</p>
                            <p className="text-muted-foreground">Skipped</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-red-500">{execution.results.failed}</p>
                            <p className="text-muted-foreground">Failed</p>
                          </div>
                          {execution.durationMs && (
                            <div className="text-center">
                              <p className="font-medium">{(execution.durationMs / 1000).toFixed(1)}s</p>
                              <p className="text-muted-foreground">Duration</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {execution.errors.length > 0 && (
                      <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                        <p className="text-sm text-destructive font-medium mb-2">
                          {execution.errors.length} error{execution.errors.length > 1 ? 's' : ''}
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {execution.errors.slice(0, 5).map((err, idx) => (
                            <p key={idx} className="text-sm text-destructive/80">
                              {err.externalId && <span className="font-mono">[{err.externalId}]</span>} {err.error}
                            </p>
                          ))}
                          {execution.errors.length > 5 && (
                            <p className="text-sm text-destructive/60 italic">
                              +{execution.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          {schemas && (
            <SyncTaskForm
              integrationId={integrationId}
              conversionSchemas={schemas.schemas}
              initialData={task}
              onSubmit={handleSubmit}
              isSubmitting={updateTask.isPending}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}











