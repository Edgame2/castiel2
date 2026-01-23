'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  useTenantIntegration,
  useIntegration,
  useConnectionStatus,
  useStartOAuthConnect,
  useConnectWithApiKey,
  useTestConnection,
  useDisconnect,
  useConversionSchemas,
  useSyncTasks,
  useSyncExecutions,
} from '@/hooks/use-integrations';
import {
  useUserConnections,
  useCreateUserConnection,
  useUpdateUserConnection,
  useDeleteUserConnection,
  useTestUserConnection,
  useBulkDeleteUserConnections,
  useBulkTestUserConnections,
  useConnectionUsageStats,
  type UserConnection,
} from '@/hooks/use-integration-connections';
import { isRateLimitError, type RateLimitError } from '@/lib/api/client';
import {
  useGmailInbox,
  useCalendarEvents,
  useDriveFiles,
  useContacts,
  useTasks,
} from '@/hooks/use-google-workspace';
import {
  GmailInboxPreview,
  CalendarUpcomingEvents,
  DriveRecentFiles,
  ContactsList,
  TasksSummary,
} from '@/components/integrations/google-workspace';
import { GoogleWorkspaceServiceStatus } from '@/components/integrations/google-workspace/service-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Plug,
  PlugZap,
  Settings,
  Plus,
  Play,
  Pause,
  RefreshCw,
  MoreVertical,
  Trash2,
  ExternalLink,
  Key,
  Loader2,
  ArrowRightLeft,
  History,
  FileText,
  Pencil,
  Users,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type {
  TenantIntegrationStatus,
  ConnectionStatus,
  SyncTaskStatus,
  SyncExecutionStatus,
  SyncTask,
  SyncExecution,
  ConversionSchema,
} from '@/types/integration.types';

const CONNECTION_STATUS_CONFIG: Record<ConnectionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  active: { label: 'Connected', icon: <CheckCircle2 className="h-4 w-4" />, className: 'text-green-500' },
  expired: { label: 'Expired', icon: <Clock className="h-4 w-4" />, className: 'text-yellow-500' },
  revoked: { label: 'Revoked', icon: <XCircle className="h-4 w-4" />, className: 'text-red-500' },
  error: { label: 'Error', icon: <AlertCircle className="h-4 w-4" />, className: 'text-red-500' },
};

const TASK_STATUS_CONFIG: Record<SyncTaskStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-500/10 text-green-500' },
  paused: { label: 'Paused', className: 'bg-yellow-500/10 text-yellow-500' },
  error: { label: 'Error', className: 'bg-red-500/10 text-red-500' },
  disabled: { label: 'Disabled', className: 'bg-gray-500/10 text-gray-500' },
};

const EXECUTION_STATUS_CONFIG: Record<SyncExecutionStatus, { label: string; className: string }> = {
  running: { label: 'Running', className: 'bg-blue-500/10 text-blue-500' },
  success: { label: 'Success', className: 'bg-green-500/10 text-green-500' },
  partial: { label: 'Partial', className: 'bg-yellow-500/10 text-yellow-500' },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-500' },
};

export default function IntegrationConfigurePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const integrationId = params.id as string;

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showCreateConnectionDialog, setShowCreateConnectionDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<UserConnection | null>(null);
  const [connectionDisplayName, setConnectionDisplayName] = useState('');
  const [connectionCredentials, setConnectionCredentials] = useState<Record<string, any>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConnectionDialog, setDeleteConnectionDialog] = useState<UserConnection | null>(null);
  const [connectionSortBy, setConnectionSortBy] = useState<'name' | 'date' | 'status'>('date');
  const [connectionSortOrder, setConnectionSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<boolean>(false);

  const { data: tenantIntegration, isLoading: loadingTenant } = useTenantIntegration(integrationId);
  const { data: integration } = useIntegration(
    (tenantIntegration as any)?.integrationId || ''
  );
  const { data: connectionStatus, isLoading: loadingConnection } = useConnectionStatus(integrationId);
  const { data: schemas } = useConversionSchemas(integrationId);
  const { data: tasks } = useSyncTasks(integrationId);
  const { data: executions } = useSyncExecutions(integrationId, { limit: 10 });

  // User connections hooks (only for user-scoped integrations)
  const { data: userConnections, isLoading: loadingUserConnections } = useUserConnections(
    integrationId,
    { enabled: !!(tenantIntegration as any)?.userScoped }
  );
  const { data: connectionStats, isLoading: loadingStats } = useConnectionUsageStats(integrationId, {
    enabled: !!(tenantIntegration as any)?.userScoped && !!userConnections && userConnections.length > 0,
  });
  const createUserConnection = useCreateUserConnection();
  const updateUserConnection = useUpdateUserConnection();
  const deleteUserConnection = useDeleteUserConnection();
  const testUserConnection = useTestUserConnection();
  const bulkDeleteUserConnections = useBulkDeleteUserConnections();
  const bulkTestUserConnections = useBulkTestUserConnections();
  const queryClient = useQueryClient();

  const startOAuth = useStartOAuthConnect();

  // Handle OAuth callback from URL parameters
  useEffect(() => {
    const oauthStatus = searchParams.get('oauth' as any);
    if (oauthStatus === 'success') {
      toast.success('Connection successful', {
        description: 'Your OAuth connection has been established',
      });
      // Refresh user connections list
      queryClient.invalidateQueries({ queryKey: ['userConnections', integrationId] });
      // Remove oauth parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('oauth');
      newUrl.searchParams.delete('connectionId');
      router.replace(newUrl.pathname + newUrl.search);
    } else if (oauthStatus === 'error') {
      const error = searchParams.get('error' as any);
      toast.error('OAuth connection failed', {
        description: error || 'Failed to complete OAuth flow',
      });
      // Remove oauth parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('oauth');
      newUrl.searchParams.delete('error');
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, queryClient, integrationId, router]);
  const connectWithApiKey = useConnectWithApiKey();
  const testConnection = useTestConnection();
  const disconnect = useDisconnect();

  // Pre-populate form when editing a connection
  useEffect(() => {
    if (editingConnection) {
      setConnectionDisplayName(editingConnection.displayName || '');
      // Note: We don't pre-populate credentials for security reasons
      // Users need to re-enter credentials when updating
      setConnectionCredentials({});
    } else if (!showCreateConnectionDialog) {
      // Reset form when dialog is closed
      setConnectionDisplayName('');
      setConnectionCredentials({});
    }
  }, [editingConnection, showCreateConnectionDialog]);

  if (loadingTenant) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenantIntegration) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Integration not found</h3>
          <p className="text-muted-foreground mb-4">
            This integration may have been disabled or doesn't exist.
          </p>
          <Button onClick={() => router.push('/integrations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>
      </div>
    );
  }

  const handleConnect = async () => {
    if ((integration as any)?.authType === 'oauth2') {
      try {
        const result = await startOAuth.mutateAsync({
          integrationId,
          returnUrl: window.location.href,
        });
        window.location.href = result.authorizationUrl;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error))
        trackException(errorObj, 3)
        trackTrace('Failed to start OAuth', 3, {
          errorMessage: errorObj.message,
          integrationId,
        })
      }
    } else if ((integration as any)?.authType === 'api_key') {
      setShowApiKeyDialog(true);
    }
  };

  const handleApiKeySubmit = async () => {
    try {
      await connectWithApiKey.mutateAsync({
        integrationId,
        apiKey,
      });
      setShowApiKeyDialog(false);
      setApiKey('');
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to connect with API key', 3, {
        errorMessage: errorObj.message,
        integrationId,
      })
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync(integrationId);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to test connection', 3, {
        errorMessage: errorObj.message,
        integrationId,
      })
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync({ integrationId });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to disconnect', 3, {
        errorMessage: errorObj.message,
        integrationId,
      })
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/integrations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Integrations
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${integration?.color || '#6366f1'}20` }}
            >
              <Plug className="h-8 w-8" style={{ color: integration?.color || '#6366f1' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {integration?.displayName || 'Integration'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {integration?.description || 'Configure your integration settings'}
              </p>
            </div>
          </div>

          {integration?.documentationUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={integration.documentationUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Documentation
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConnection ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Checking connection...</span>
            </div>
          ) : connectionStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {CONNECTION_STATUS_CONFIG[(connectionStatus.status || 'active') as ConnectionStatus].icon}
                  <span className={CONNECTION_STATUS_CONFIG[(connectionStatus.status || 'active') as ConnectionStatus].className}>
                    {CONNECTION_STATUS_CONFIG[(connectionStatus.status || 'active') as ConnectionStatus].label}
                  </span>
                  {connectionStatus.displayName && (
                    <span className="text-muted-foreground">
                      • {connectionStatus.displayName}
                    </span>
                  )}
                  {/* Google Workspace: Show connected email */}
                  {integration?.id === 'google-workspace' && connectionStatus.details?.email && (
                    <span className="text-muted-foreground">
                      • {connectionStatus.details.email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnect.isPending}
                  >
                    {disconnect.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Google Workspace Service Status Indicators */}
              {integration?.id === 'google-workspace' && connectionStatus?.connected && (
                <div className="mt-4 pt-4 border-t">
                  <GoogleWorkspaceServiceStatus integrationId={integrationId} />
                </div>
              )}

              {connectionStatus.lastValidatedAt && (
                <p className="text-sm text-muted-foreground">
                  Last validated {formatDistanceToNow(new Date(connectionStatus.lastValidatedAt), { addSuffix: true })}
                </p>
              )}

              {connectionStatus.expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Token expires {formatDistanceToNow(new Date(connectionStatus.expiresAt), { addSuffix: true })}
                </p>
              )}

              {connectionStatus.error && (
                <div className="p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                  {connectionStatus.error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4" />
                <span>Not connected</span>
              </div>
              <Button onClick={handleConnect} disabled={startOAuth.isPending}>
                {startOAuth.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (integration as any)?.authType === 'oauth2' ? (
                  <Plug className="h-4 w-4 mr-2" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {(integration as any)?.authType === 'oauth2' ? 'Connect with OAuth' : 'Connect with API Key'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Workspace Quick Preview */}
      {integration?.id === 'google-workspace' && connectionStatus?.connected && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Google Workspace Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GmailInboxPreview integrationId={integrationId} limit={3} />
            <CalendarUpcomingEvents integrationId={integrationId} limit={3} days={7} />
            <DriveRecentFiles integrationId={integrationId} limit={5} />
            <ContactsList integrationId={integrationId} limit={5} />
            <TasksSummary integrationId={integrationId} />
          </div>
        </div>
      )}

      {/* Tabs for schemas, tasks, and history */}
      <Tabs defaultValue="schemas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schemas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data Mapping
            {schemas && schemas.schemas.length > 0 && (
              <Badge variant="secondary">{schemas.schemas.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Sync Tasks
            {tasks && tasks.tasks.length > 0 && (
              <Badge variant="secondary">{tasks.tasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Sync History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Conversion Schemas Tab */}
        <TabsContent value="schemas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Conversion Schemas</h3>
              <p className="text-sm text-muted-foreground">
                Define how data from the integration maps to your Shard types
              </p>
            </div>
            <Button asChild>
              <Link href={`/integrations/${integrationId}/schemas/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Schema
              </Link>
            </Button>
          </div>

          {!schemas || schemas.schemas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No conversion schemas</h3>
                <p className="text-muted-foreground mb-4">
                  Create a schema to map data from the integration to your Shard types.
                </p>
                <Button asChild>
                  <Link href={`/integrations/${integrationId}/schemas/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Schema
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {schemas.schemas.map((schema: ConversionSchema) => (
                <Card key={schema.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {schema.name}
                          {!schema.isActive && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {schema.source.entity} → {schema.target.shardTypeId}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/integrations/${integrationId}/schemas/${schema.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{schema.fieldMappings.length} field mappings</span>
                      <span>•</span>
                      <span>Updated {formatDistanceToNow(new Date(schema.updatedAt), { addSuffix: true })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sync Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Sync Tasks</h3>
              <p className="text-sm text-muted-foreground">
                Schedule automatic data synchronization
              </p>
            </div>
            <Button asChild>
              <Link href={`/integrations/${integrationId}/tasks/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Link>
            </Button>
          </div>

          {!tasks || tasks.tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No sync tasks</h3>
                <p className="text-muted-foreground mb-4">
                  Create a task to schedule automatic data synchronization.
                </p>
                <Button asChild>
                  <Link href={`/integrations/${integrationId}/tasks/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tasks.tasks.map((task: SyncTask) => (
                <Card key={task.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {task.name}
                          <Badge className={TASK_STATUS_CONFIG[task.status].className}>
                            {TASK_STATUS_CONFIG[task.status].label}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {task.direction === 'pull' ? 'Pull' : task.direction === 'push' ? 'Push' : 'Bidirectional'}
                          {' • '}
                          {task.schedule.type === 'manual' ? 'Manual' :
                           task.schedule.type === 'interval' ? `Every ${task.schedule.config.interval} ${task.schedule.config.unit}` :
                           task.schedule.type === 'cron' ? task.schedule.config.expression :
                           'Real-time'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'active' ? (
                          <Button variant="outline" size="sm">
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        <Button variant="default" size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Run Now
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/integrations/${integrationId}/tasks/${task.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Runs</p>
                        <p className="font-medium">{task.stats.totalRuns}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-medium">
                          {task.stats.totalRuns > 0
                            ? `${Math.round((task.stats.successfulRuns / task.stats.totalRuns) * 100)}%`
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Records Processed</p>
                        <p className="font-medium">{task.stats.recordsProcessed.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Run</p>
                        <p className="font-medium">
                          {task.nextRunAt
                            ? formatDistanceToNow(new Date(task.nextRunAt), { addSuffix: true })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {task.lastError && (
                      <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                        {task.lastError.message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sync History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Sync History</h3>
            <p className="text-sm text-muted-foreground">
              View recent sync executions and their results
            </p>
          </div>

          {!executions || executions.executions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No sync history</h3>
                <p className="text-muted-foreground">
                  Run a sync task to see execution history here.
                </p>
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
                          {EXECUTION_STATUS_CONFIG[execution.status].label}
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
                        <p className="text-sm text-destructive font-medium">
                          {execution.errors.length} error{execution.errors.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-destructive/80 mt-1">
                          {execution.errors[0].error}
                          {execution.errors.length > 1 && ` (+${execution.errors.length - 1} more)`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* User Connections Tab (only for user-scoped integrations) */}
        {(tenantIntegration as any)?.userScoped && (
          <TabsContent value="connections" className="space-y-4">
            {(() => {
              if (loadingUserConnections) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Loading connections...</p>
                    </CardContent>
                  </Card>
                );
              }
              if (!userConnections || userConnections.length === 0) {
                return (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No connections</h3>
                      <p className="text-muted-foreground mb-4">
                        Create a connection to access this integration with your credentials.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        {(integration as any)?.authType === 'oauth2' ? (
                          <Button
                            onClick={async () => {
                              try {
                                const result = await startOAuth.mutateAsync({
                                  integrationId,
                                  returnUrl: window.location.href,
                                });
                                window.location.href = result.authorizationUrl;
                              } catch (error: any) {
                                toast.error('Failed to start OAuth', {
                                  description: error.message || 'Unable to start OAuth flow',
                                });
                              }
                            }}
                            disabled={startOAuth.isPending}
                          >
                            {startOAuth.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Connect with OAuth
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button onClick={() => setShowCreateConnectionDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Connection
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return (
                <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">My Connections</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your personal connections to this integration
                </p>
              </div>
              <div className="flex items-center gap-2">
                {integration?.authType === 'oauth2' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const result = await startOAuth.mutateAsync({
                          integrationId,
                          returnUrl: window.location.href,
                        });
                        window.location.href = result.authorizationUrl;
                      } catch (error: any) {
                        toast.error('Failed to start OAuth', {
                          description: error.message || 'Unable to start OAuth flow',
                        });
                      }
                    }}
                    disabled={startOAuth.isPending}
                  >
                    {startOAuth.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect with OAuth
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setEditingConnection(null);
                    setConnectionDisplayName('');
                    setConnectionCredentials({});
                    setShowCreateConnectionDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Connection
                </Button>
              </div>
            </div>
                  {/* Connection Usage Statistics */}
                  {connectionStats && !loadingStats && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Connection Usage Statistics
                      </CardTitle>
                      <CardDescription>
                        Overview of your connection usage and activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Total Connections</p>
                          <p className="text-2xl font-bold">{connectionStats.totalConnections}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Active</p>
                          <p className="text-2xl font-bold text-green-600">{connectionStats.activeConnections}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                          <p className="text-2xl font-bold">{connectionStats.totalUsageCount}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Unused</p>
                          <p className="text-2xl font-bold text-orange-600">{connectionStats.unusedConnections.length}</p>
                        </div>
                      </div>
                      
                      {connectionStats.connectionsByStatus && (
                        <div className="mt-6 pt-6 border-t">
                          <p className="text-sm font-medium mb-3">Connection Health</p>
                          <div className="grid gap-3 md:grid-cols-5">
                            <div className="flex items-center justify-between p-2 rounded-md bg-green-500/10">
                              <span className="text-sm text-muted-foreground">Active</span>
                              <Badge variant="outline" className="bg-green-500/20 text-green-700">
                                {connectionStats.connectionsByStatus.active}
                              </Badge>
                            </div>
                            {connectionStats.connectionsByStatus.expired > 0 && (
                              <div className="flex items-center justify-between p-2 rounded-md bg-orange-500/10">
                                <span className="text-sm text-muted-foreground">Expired</span>
                                <Badge variant="outline" className="bg-orange-500/20 text-orange-700">
                                  {connectionStats.connectionsByStatus.expired}
                                </Badge>
                              </div>
                            )}
                            {connectionStats.connectionsByStatus.error > 0 && (
                              <div className="flex items-center justify-between p-2 rounded-md bg-red-500/10">
                                <span className="text-sm text-muted-foreground">Error</span>
                                <Badge variant="outline" className="bg-red-500/20 text-red-700">
                                  {connectionStats.connectionsByStatus.error}
                                </Badge>
                              </div>
                            )}
                            {connectionStats.connectionsByStatus.revoked > 0 && (
                              <div className="flex items-center justify-between p-2 rounded-md bg-gray-500/10">
                                <span className="text-sm text-muted-foreground">Revoked</span>
                                <Badge variant="outline" className="bg-gray-500/20 text-gray-700">
                                  {connectionStats.connectionsByStatus.revoked}
                                </Badge>
                              </div>
                            )}
                            {connectionStats.connectionsByStatus.archived > 0 && (
                              <div className="flex items-center justify-between p-2 rounded-md bg-gray-500/10">
                                <span className="text-sm text-muted-foreground">Archived</span>
                                <Badge variant="outline" className="bg-gray-500/20 text-gray-700">
                                  {connectionStats.connectionsByStatus.archived}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {connectionStats.mostUsedConnections.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <p className="text-sm font-medium">Most Used Connections</p>
                          <div className="space-y-2">
                            {connectionStats.mostUsedConnections.slice(0, 5).map((conn) => (
                              <div key={conn.connectionId} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{conn.displayName || 'Unnamed Connection'}</p>
                                  {conn.lastUsedAt && (
                                    <p className="text-xs text-muted-foreground">
                                      Last used {formatDistanceToNow(new Date(conn.lastUsedAt), { addSuffix: true })}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="secondary" className="ml-2">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {conn.usageCount} uses
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {connectionStats.unusedConnections.length > 0 && (
                        <div className="mt-6 space-y-2">
                          <p className="text-sm font-medium text-orange-600">Unused Connections</p>
                          <p className="text-xs text-muted-foreground">
                            {connectionStats.unusedConnections.length} connection{connectionStats.unusedConnections.length > 1 ? 's' : ''} haven't been used in the last 30 days
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bulk Actions and Sort Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {userConnections.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedConnections.size === userConnections.length && userConnections.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedConnections(new Set(userConnections.map((c) => c.id)));
                            } else {
                              setSelectedConnections(new Set());
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          Select all
                        </span>
                      </div>
                    )}
                    {selectedConnections.size > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {selectedConnections.size} selected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const result = await bulkTestUserConnections.mutateAsync({
                                integrationId,
                                connectionIds: Array.from(selectedConnections),
                              });
                              toast.success(
                                `Tested ${result.successCount} of ${selectedConnections.size} connections`,
                                {
                                  description:
                                    result.failureCount > 0
                                      ? `${result.failureCount} failed`
                                      : 'All connections tested successfully',
                                }
                              );
                              setSelectedConnections(new Set());
                            } catch (error: any) {
                              if (isRateLimitError(error)) {
                                const rateLimitError = error as RateLimitError;
                                toast.error('Too many requests', {
                                  description: rateLimitError.message,
                                });
                              } else {
                                toast.error('Bulk test failed', {
                                  description: error.message || 'An error occurred while testing connections',
                                });
                              }
                            }
                          }}
                          disabled={bulkTestUserConnections.isPending}
                        >
                          {bulkTestUserConnections.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Test Selected
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setBulkDeleteDialog(true)}
                          disabled={bulkDeleteUserConnections.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConnections(new Set())}
                        >
                          Clear Selection
                        </Button>
                      </>
                    )}
                  </div>
                  {userConnections.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={connectionSortBy}
                        onValueChange={(value: 'name' | 'date' | 'status') => setConnectionSortBy(value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setConnectionSortOrder(connectionSortOrder === 'asc' ? 'desc' : 'asc')}
                        title={connectionSortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
                      >
                        {connectionSortOrder === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {userConnections.length > 0 && selectedConnections.size === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {userConnections.length} connection{userConnections.length > 1 ? 's' : ''}
                  </p>
                )}

                {/* Connections List */}
                <div className="grid gap-4">
                  {[...userConnections]
                    .sort((a, b) => {
                      let comparison = 0;
                      switch (connectionSortBy) {
                        case 'name':
                          comparison = (a.displayName || '').localeCompare(b.displayName || '');
                          break;
                        case 'date':
                          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                          break;
                        case 'status':
                          comparison = a.status.localeCompare(b.status);
                          break;
                      }
                      return connectionSortOrder === 'asc' ? comparison : -comparison;
                    })
                    .map((connection: UserConnection) => (
                  <Card key={connection.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedConnections.has(connection.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedConnections);
                              if (checked) {
                                newSelected.add(connection.id);
                              } else {
                                newSelected.delete(connection.id);
                              }
                              setSelectedConnections(newSelected);
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {connection.displayName || 'Unnamed Connection'}
                              <Badge className={CONNECTION_STATUS_CONFIG[connection.status as ConnectionStatus]?.className || 'bg-gray-500/10 text-gray-500'}>
                                {CONNECTION_STATUS_CONFIG[connection.status as ConnectionStatus]?.label || connection.status}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-1">
                            {connection.authType} • {connection.scope}
                            {connection.lastValidatedAt && (
                              <> • Last validated {formatDistanceToNow(new Date(connection.lastValidatedAt), { addSuffix: true })}</>
                            )}
                            {connection.lastUsedAt && (
                              <> • Last used {formatDistanceToNow(new Date(connection.lastUsedAt), { addSuffix: true })}</>
                            )}
                            {connection.usageCount !== undefined && connection.usageCount > 0 && (
                              <> • Used {connection.usageCount} time{connection.usageCount !== 1 ? 's' : ''}</>
                            )}
                            {(connection as any).authType === 'oauth2' && connection.oauthExpiresAt && (
                              <> • Token expires {formatDistanceToNow(new Date(connection.oauthExpiresAt), { addSuffix: true })}</>
                            )}
                            {connection.status === 'error' && connection.validationError && (
                              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-600">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                {connection.validationError}
                              </div>
                            )}
                            {connection.status === 'expired' && (connection as any).authType === 'oauth2' && (
                              <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-md text-sm text-orange-600">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>OAuth token has expired. Please reconnect to continue using this integration.</span>
                                  </div>
                                  {(integration as any)?.authType === 'oauth2' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-shrink-0"
                                      onClick={async () => {
                                        try {
                                          const result = await startOAuth.mutateAsync({
                                            integrationId,
                                            returnUrl: window.location.href,
                                          });
                                          window.location.href = result.authorizationUrl;
                                        } catch (error: any) {
                                          toast.error('Failed to reconnect', {
                                            description: error.message || 'Unable to start OAuth flow',
                                          });
                                        }
                                      }}
                                      disabled={startOAuth.isPending}
                                    >
                                      {startOAuth.isPending ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Reconnecting...
                                        </>
                                      ) : (
                                        <>
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Reconnect
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            {(connection as any).authType === 'oauth2' && connection.oauthExpiresAt && new Date(connection.oauthExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && new Date(connection.oauthExpiresAt).getTime() > Date.now() && connection.status !== 'expired' && (
                              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-600">
                                <Clock className="h-4 w-4 inline mr-1" />
                                OAuth token expires soon. Consider reconnecting to avoid interruption.
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const result = await testUserConnection.mutateAsync({
                                  integrationId,
                                  connectionId: connection.id,
                                });
                                if (result.success) {
                                  toast.success('Connection test successful', {
                                    description: 'Your connection is working correctly',
                                  });
                                } else {
                                  toast.error('Connection test failed', {
                                    description: result.error || 'Unable to connect',
                                  });
                                }
                              } catch (error: any) {
                                if (isRateLimitError(error)) {
                                  toast.error('Too many requests', {
                                    description: error.message,
                                    duration: error.retryAfter ? error.retryAfter * 1000 : 5000,
                                  });
                                } else {
                                  toast.error('Test failed', {
                                    description: error.message || 'An error occurred while testing the connection',
                                  });
                                }
                              }
                            }}
                            disabled={testUserConnection.isPending}
                          >
                            {testUserConnection.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingConnection(connection);
                              setShowCreateConnectionDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteConnectionDialog(connection)}
                            disabled={deleteUserConnection.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created {formatDistanceToNow(new Date(connection.createdAt), { addSuffix: true })}</span>
                        <span>•</span>
                        <span>Updated {formatDistanceToNow(new Date(connection.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Configure general settings for this integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Integration ID</Label>
                <Input value={tenantIntegration.id} disabled />
              </div>
              <div className="space-y-2">
                <Label>Enabled At</Label>
                <Input
                  value={format(new Date(tenantIntegration.enabledAt), 'PPpp')}
                  disabled
                />
              </div>
              <Separator />
              <div className="pt-2">
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disable Integration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit User Connection Dialog */}
      <Dialog open={showCreateConnectionDialog} onOpenChange={setShowCreateConnectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConnection ? 'Edit Connection' : 'Create New Connection'}
            </DialogTitle>
            <DialogDescription>
              {editingConnection
                ? 'Update your connection credentials'
                : `Create a personal connection to ${integration?.displayName || 'this integration'}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name (Optional)</Label>
              <Input
                value={connectionDisplayName}
                onChange={(e) => setConnectionDisplayName(e.target.value)}
                placeholder="My Connection"
              />
            </div>
            {integration?.authType === 'oauth2' && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm text-blue-600">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                OAuth connections cannot be edited. You can only change the display name. To update credentials, please reconnect using the "Reconnect" button.
              </div>
            )}
            {(integration as any)?.authType === 'api_key' && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={connectionCredentials.apiKey || ''}
                    onChange={(e) => setConnectionCredentials({ ...connectionCredentials, apiKey: e.target.value })}
                    placeholder={editingConnection ? '(Leave empty to keep existing)' : 'Enter your API key...'}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {editingConnection && (
                  <p className="text-xs text-muted-foreground">
                    Credentials are not displayed for security. Leave empty to keep existing credentials, or enter new ones to update.
                  </p>
                )}
              </div>
            )}
            {(integration as any)?.authType === 'basic' && (
              <>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={connectionCredentials.username || ''}
                    onChange={(e) => setConnectionCredentials({ ...connectionCredentials, username: e.target.value })}
                    placeholder="Enter your username..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={connectionCredentials.password || ''}
                      onChange={(e) => setConnectionCredentials({ ...connectionCredentials, password: e.target.value })}
                      placeholder={editingConnection ? '(Leave empty to keep existing)' : 'Enter your password...'}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {editingConnection && (
                    <p className="text-xs text-muted-foreground">
                      Credentials are not displayed for security. Leave empty to keep existing credentials, or enter new ones to update.
                    </p>
                  )}
                </div>
              </>
            )}
            {(integration as any)?.authType === 'custom' && (
              <div className="space-y-2">
                <Label>Credentials (JSON)</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={JSON.stringify(connectionCredentials, null, 2)}
                  onChange={(e) => {
                    try {
                      setConnectionCredentials(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder={editingConnection ? '{} (Leave empty to keep existing)' : '{"key": "value"}'}
                />
                {editingConnection && (
                  <p className="text-xs text-muted-foreground">
                    Credentials are not displayed for security. Leave empty to keep existing credentials, or enter new ones to update.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateConnectionDialog(false);
                setEditingConnection(null);
                setConnectionDisplayName('');
                setConnectionCredentials({});
                setShowApiKey(false);
                setShowPassword(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (editingConnection) {
                    // For OAuth connections, only allow updating display name
                    const updateData: { displayName?: string; credentials?: any } = {
                      displayName: connectionDisplayName || undefined,
                    };
                    
                    // Only include credentials for non-OAuth connections
                    if ((integration as any)?.authType !== 'oauth2' && Object.keys(connectionCredentials).length > 0) {
                      updateData.credentials = connectionCredentials;
                    }
                    
                    await updateUserConnection.mutateAsync({
                      integrationId,
                      connectionId: editingConnection.id,
                      data: updateData,
                    });
                    toast.success('Connection updated', {
                      description: 'Your connection has been updated successfully',
                    });
                  } else {
                    await createUserConnection.mutateAsync({
                      integrationId,
                      data: {
                        displayName: connectionDisplayName || undefined,
                        credentials: connectionCredentials,
                      },
                    });
                    toast.success('Connection created', {
                      description: 'Your connection has been created successfully',
                    });
                  }
                  setShowCreateConnectionDialog(false);
                  setEditingConnection(null);
                  setConnectionDisplayName('');
                  setConnectionCredentials({});
                  setShowApiKey(false);
                  setShowPassword(false);
                } catch (error: any) {
                  if (isRateLimitError(error)) {
                    toast.error('Too many requests', {
                      description: error.message,
                      duration: error.retryAfter ? error.retryAfter * 1000 : 5000,
                    });
                  } else {
                    toast.error(editingConnection ? 'Update failed' : 'Create failed', {
                      description: error.message || 'An error occurred while saving the connection',
                    });
                  }
                }
              }}
              disabled={
                (createUserConnection.isPending || updateUserConnection.isPending) ||
                ((integration as any)?.authType === 'api_key' && !connectionCredentials.apiKey) ||
                ((integration as any)?.authType === 'basic' && (!connectionCredentials.username || !connectionCredentials.password))
              }
            >
              {(createUserConnection.isPending || updateUserConnection.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              {editingConnection ? 'Update' : 'Create'} Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter API Key</DialogTitle>
            <DialogDescription>
              Enter your API key to connect to {integration?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApiKeySubmit}
              disabled={!apiKey || connectWithApiKey.isPending}
            >
              {connectWithApiKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Connection Confirmation Dialog */}
      <AlertDialog open={!!deleteConnectionDialog} onOpenChange={(open) => !open && setDeleteConnectionDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the connection "{deleteConnectionDialog?.displayName || 'Unnamed Connection'}"?
              This action cannot be undone. The credentials will be removed from secure storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteConnectionDialog) return;
                
                try {
                  await deleteUserConnection.mutateAsync({
                    integrationId,
                    connectionId: deleteConnectionDialog.id,
                  });
                  toast.success('Connection deleted', {
                    description: 'Your connection has been removed',
                  });
                  setDeleteConnectionDialog(null);
                } catch (error: any) {
                  if (isRateLimitError(error)) {
                    toast.error('Too many requests', {
                      description: error.message,
                      duration: error.retryAfter ? error.retryAfter * 1000 : 5000,
                    });
                  } else {
                    toast.error('Delete failed', {
                      description: error.message || 'An error occurred while deleting the connection',
                    });
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserConnection.isPending}
            >
              {deleteUserConnection.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Connections?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedConnections.size} connection{selectedConnections.size > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  const result = await bulkDeleteUserConnections.mutateAsync({
                    integrationId,
                    connectionIds: Array.from(selectedConnections),
                  });
                  toast.success(
                    `Deleted ${result.successCount} of ${selectedConnections.size} connections`,
                    {
                      description:
                        result.failureCount > 0
                          ? `${result.failureCount} failed to delete`
                          : 'All connections deleted successfully',
                    }
                  );
                  setSelectedConnections(new Set());
                  setBulkDeleteDialog(false);
                } catch (error: any) {
                  if (isRateLimitError(error)) {
                    const rateLimitError = error as RateLimitError;
                    toast.error('Too many requests', {
                      description: rateLimitError.message,
                    });
                  } else {
                    toast.error('Bulk delete failed', {
                      description: error.message || 'An error occurred while deleting connections',
                    });
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteUserConnections.isPending}
            >
              {bulkDeleteUserConnections.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




