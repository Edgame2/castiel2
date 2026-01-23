/**
 * Playbook Execution Component
 * Displays playbook execution status and outcomes
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import { caisApi, type PlaybookExecution } from '@/lib/api/cais-services';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface PlaybookExecutionProps {
  playbookId?: string;
  opportunityId?: string;
  className?: string;
}

export function PlaybookExecution({ playbookId, opportunityId, className }: PlaybookExecutionProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [localPlaybookId, setLocalPlaybookId] = useState(playbookId || '');
  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');

  const {
    data: execution,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['playbook-execution', tenantId, localPlaybookId, localOpportunityId],
    queryFn: () => {
      if (!tenantId || !localPlaybookId) throw new Error('Missing tenantId or playbookId');
      return caisApi.executePlaybook({
        tenantId,
        playbookId: localPlaybookId,
        opportunityId: localOpportunityId || undefined,
        userId: user?.id || undefined,
      });
    },
    enabled: !!tenantId && !!localPlaybookId,
  });

  const statusConfig = useMemo(() => {
    if (!execution) return null;
    const status = execution.status;
    if (status === 'completed') {
      return { color: 'bg-green-500', label: 'Completed', icon: CheckCircle2 };
    }
    if (status === 'in_progress') {
      return { color: 'bg-blue-500', label: 'In Progress', icon: Loader2 };
    }
    if (status === 'failed') {
      return { color: 'bg-red-500', label: 'Failed', icon: XCircle };
    }
    if (status === 'cancelled') {
      return { color: 'bg-gray-500', label: 'Cancelled', icon: XCircle };
    }
    return { color: 'bg-yellow-500', label: 'Pending', icon: Clock };
  }, [execution]);

  const completionPercentage = useMemo(() => {
    if (!execution || execution.steps.length === 0) return 0;
    const completed = execution.steps.filter(s => s.status === 'completed').length;
    return (completed / execution.steps.length) * 100;
  }, [execution]);

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to execute playbook. Please try again.
            <button onClick={() => refetch()} className="ml-2 underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Playbook Execution</CardTitle>
            <CardDescription>Enter playbook details to execute</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="playbookId">Playbook ID</Label>
                <Input
                  id="playbookId"
                  value={localPlaybookId}
                  onChange={(e) => setLocalPlaybookId(e.target.value)}
                  placeholder="Enter playbook ID"
                />
              </div>
              <div>
                <Label htmlFor="opportunityId">Opportunity ID (Optional)</Label>
                <Input
                  id="opportunityId"
                  value={localOpportunityId}
                  onChange={(e) => setLocalOpportunityId(e.target.value)}
                  placeholder="Enter opportunity ID"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Playbook Execution
              </CardTitle>
              <CardDescription>
                Execution ID: {execution.executionId}
              </CardDescription>
            </div>
            <Badge
              variant={
                execution.status === 'completed'
                  ? 'default'
                  : execution.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig?.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-medium">
                {execution.currentStep} / {execution.steps.length} steps
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <div className="text-sm text-muted-foreground mt-1">
              {completionPercentage.toFixed(0)}% complete
            </div>
          </div>

          {/* Steps */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Execution Steps</h3>
            <div className="space-y-2">
              {execution.steps.map((step, i) => {
                const stepStatusConfig =
                  step.status === 'completed'
                    ? { color: 'text-green-600', icon: CheckCircle2 }
                    : step.status === 'failed'
                    ? { color: 'text-red-600', icon: XCircle }
                    : step.status === 'in_progress'
                    ? { color: 'text-blue-600', icon: Loader2 }
                    : { color: 'text-gray-400', icon: Clock };

                const StepIcon = stepStatusConfig.icon;

                return (
                  <Card key={i} className={i === execution.currentStep - 1 ? 'border-primary' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StepIcon className={`h-5 w-5 ${stepStatusConfig.color}`} />
                          <div>
                            <div className="font-medium">Step {i + 1}: {step.stepId}</div>
                            {step.executedAt && (
                              <div className="text-sm text-muted-foreground">
                                Executed: {new Date(step.executedAt).toLocaleString()}
                              </div>
                            )}
                            {step.result && (
                              <div className="text-sm mt-1">
                                {step.result.success ? (
                                  <span className="text-green-600">Success</span>
                                ) : (
                                  <span className="text-red-600">
                                    Failed: {step.result.error}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            step.status === 'completed'
                              ? 'default'
                              : step.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {step.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Outcome */}
          {execution.outcome && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-sm">Execution Outcome</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge variant={execution.outcome.success ? 'default' : 'destructive'}>
                      {execution.outcome.completed ? 'Completed' : 'Incomplete'}
                      {execution.outcome.success ? ' - Success' : ' - Failed'}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Steps Completed</div>
                      <div className="text-lg font-semibold">
                        {execution.outcome.metrics.stepsCompleted}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Steps Failed</div>
                      <div className="text-lg font-semibold text-destructive">
                        {execution.outcome.metrics.stepsFailed}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Total Duration</div>
                      <div className="text-lg font-semibold">
                        {execution.outcome.metrics.totalDuration} minutes
                      </div>
                    </div>
                  </div>
                  {execution.outcome.feedback && (
                    <div>
                      <div className="text-sm font-medium mb-2">Feedback</div>
                      {execution.outcome.feedback.rating && (
                        <div className="text-sm text-muted-foreground">
                          Rating: {execution.outcome.feedback.rating}/5
                        </div>
                      )}
                      {execution.outcome.feedback.comment && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {execution.outcome.feedback.comment}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timing */}
          <div className="text-sm text-muted-foreground">
            <div>Started: {new Date(execution.startedAt).toLocaleString()}</div>
            {execution.completedAt && (
              <div>Completed: {new Date(execution.completedAt).toLocaleString()}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
