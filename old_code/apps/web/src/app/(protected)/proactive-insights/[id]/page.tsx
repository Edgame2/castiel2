'use client';

/**
 * Proactive Insight Detail Page
 * Displays a single proactive insight with full details and actions
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  Calendar,
  Target,
  CheckCircle,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useProactiveInsight,
  useAcknowledgeProactiveInsight,
  useDismissProactiveInsight,
  useActionProactiveInsight,
} from '@/hooks/use-proactive-insights';
import { cn } from '@/lib/utils';
import type { ProactiveInsightType } from '@/lib/api/proactive-insights';

interface ProactiveInsightDetailPageProps {
  params: Promise<{ id: string }>;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'delivered':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'acknowledged':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'actioned':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'dismissed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getTypeIcon(type: ProactiveInsightType) {
  switch (type) {
    case 'deal_at_risk':
      return TrendingDown;
    case 'milestone_approaching':
      return Calendar;
    case 'stale_opportunity':
      return Clock;
    case 'missing_follow_up':
      return Target;
    case 'relationship_cooling':
      return TrendingDown;
    case 'action_required':
      return AlertTriangle;
    default:
      return Bell;
  }
}

function getTypeLabel(type: ProactiveInsightType): string {
  const labels: Record<ProactiveInsightType, string> = {
    deal_at_risk: 'Deal at Risk',
    milestone_approaching: 'Milestone Approaching',
    stale_opportunity: 'Stale Opportunity',
    missing_follow_up: 'Missing Follow-up',
    relationship_cooling: 'Relationship Cooling',
    action_required: 'Action Required',
  };
  return labels[type] || type;
}

export default function ProactiveInsightDetailPage({ params }: ProactiveInsightDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: insight, isLoading, error } = useProactiveInsight(id);

  const acknowledgeMutation = useAcknowledgeProactiveInsight();
  const dismissMutation = useDismissProactiveInsight();
  const actionMutation = useActionProactiveInsight();

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate(id, {
      onSuccess: () => {
        router.push('/proactive-insights');
      },
    });
  };

  const handleDismiss = () => {
    dismissMutation.mutate(
      { insightId: id },
      {
        onSuccess: () => {
          router.push('/proactive-insights');
        },
      }
    );
  };

  const handleAction = () => {
    actionMutation.mutate(id, {
      onSuccess: () => {
        router.push('/proactive-insights');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 p-6">
        <Bell className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Insight not found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : 'The proactive insight you are looking for does not exist or has been deleted.'}
        </p>
        <Button onClick={() => router.push('/proactive-insights')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Insights
        </Button>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(insight.type);
  const canTakeAction = insight.status === 'delivered' || insight.status === 'pending';

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/proactive-insights')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Proactive Insight
            </h1>
            <p className="text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Actions */}
        {canTakeAction && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAcknowledge}
              disabled={acknowledgeMutation.isPending}
              variant="outline"
            >
              {acknowledgeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Acknowledge
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionMutation.isPending}
              variant="default"
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark as Actioned
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={dismissMutation.isPending}>
                  {dismissMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Dismiss
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Dismiss Insight</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to dismiss this insight? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDismiss}>Dismiss</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Metadata */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 mb-4">
                <CardTitle className="text-2xl">{insight.title}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn('text-xs', getPriorityColor(insight.priority))}>
                    {insight.priority}
                  </Badge>
                  <Badge className={cn('text-xs', getStatusColor(insight.status))}>
                    {insight.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <TypeIcon className="h-3 w-3" />
                    {getTypeLabel(insight.type)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-base whitespace-pre-wrap">{insight.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          {insight.recommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm">{insight.recommendation}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insight.shardId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Related Shard</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{insight.shardName || insight.shardId}</Badge>
                    {insight.shardId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/shards/${insight.shardId}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Trigger ID</p>
                <p className="text-sm font-mono">{insight.triggerId}</p>
              </div>

              {insight.metadata && Object.keys(insight.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Additional Metadata</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                    {JSON.stringify(insight.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm font-medium">
                  {format(new Date(insight.createdAt), 'PPpp')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}
                </p>
              </div>

              {insight.deliveredAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                  <p className="text-sm font-medium">
                    {format(new Date(insight.deliveredAt), 'PPpp')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(insight.deliveredAt), { addSuffix: true })}
                  </p>
                </div>
              )}

              {insight.acknowledgedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Acknowledged</p>
                  <p className="text-sm font-medium">
                    {format(new Date(insight.acknowledgedAt), 'PPpp')}
                  </p>
                  {insight.acknowledgedBy && (
                    <p className="text-xs text-muted-foreground">by {insight.acknowledgedBy}</p>
                  )}
                </div>
              )}

              {insight.actionedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Actioned</p>
                  <p className="text-sm font-medium">
                    {format(new Date(insight.actionedAt), 'PPpp')}
                  </p>
                  {insight.actionedBy && (
                    <p className="text-xs text-muted-foreground">by {insight.actionedBy}</p>
                  )}
                </div>
              )}

              {insight.dismissedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Dismissed</p>
                  <p className="text-sm font-medium">
                    {format(new Date(insight.dismissedAt), 'PPpp')}
                  </p>
                  {insight.dismissedBy && (
                    <p className="text-xs text-muted-foreground">by {insight.dismissedBy}</p>
                  )}
                  {insight.dismissedReason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Reason: {insight.dismissedReason}
                    </p>
                  )}
                </div>
              )}

              {insight.expiresAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expires</p>
                  <p className="text-sm font-medium">
                    {format(new Date(insight.expiresAt), 'PPpp')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(insight.expiresAt), { addSuffix: true })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm font-medium">
                  {format(new Date(insight.updatedAt), 'PPpp')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(insight.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions (if applicable) */}
          {canTakeAction && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleAcknowledge}
                  disabled={acknowledgeMutation.isPending}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {acknowledgeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Acknowledge
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={actionMutation.isPending}
                  variant="default"
                  className="w-full justify-start"
                >
                  {actionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Actioned
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={dismissMutation.isPending}
                      className="w-full justify-start"
                    >
                      {dismissMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Dismiss
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Dismiss Insight</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to dismiss this insight? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDismiss}>Dismiss</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}









