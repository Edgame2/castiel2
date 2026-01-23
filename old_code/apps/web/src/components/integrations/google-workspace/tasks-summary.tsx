'use client';

import { useTasks } from '@/hooks/use-google-workspace';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, RefreshCw, Loader2, Plus, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface TasksSummaryProps {
  integrationId: string;
  tasklistId?: string;
}

export function TasksSummary({ integrationId, tasklistId }: TasksSummaryProps) {
  const { data, isLoading, error, refetch, isRefetching } = useTasks(integrationId, tasklistId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load tasks
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = data?.pendingCount || 0;
  const completedCount = data?.completedCount || 0;
  const totalCount = data?.totalCount || 0;
  const recentTasks = data?.recentTasks || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            <CardTitle>Tasks</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Your Google Tasks summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg border">
            <div className="text-2xl font-bold">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {recentTasks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No pending tasks
          </div>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
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
        )}

        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link
              href="https://tasks.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Tasks
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link
              href="https://tasks.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







