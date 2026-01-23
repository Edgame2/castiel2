'use client';

import Link from 'next/link';
import { Activity, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { Widget } from '@/types/dashboard';
import { useIntegrations } from '@/hooks/use-integrations';

interface IntegrationActivityWidgetProps {
  widget: Widget;
  data?: unknown;
}

interface ActivityItem {
  id: string;
  integrationId: string;
  integrationName: string;
  providerName: string;
  action: 'connected' | 'disconnected' | 'error' | 'sync';
  timestamp: Date | string;
  status?: string;
}

export function IntegrationActivityWidget({ widget, data }: IntegrationActivityWidgetProps) {
  const { data: integrationsData, isLoading } = useIntegrations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  // Generate activity from integrations (in a real app, this would come from audit logs)
  const integrations = integrationsData?.integrations || [];
  const activities = (integrations
    .slice(0, 10)
    .map((integration) => ({
      id: integration.id,
      integrationId: integration.id,
      integrationName: integration.name,
      providerName: integration.providerName,
      action:
        integration.status === 'connected'
          ? 'connected'
          : integration.status === 'error'
          ? 'error'
          : 'sync',
      timestamp: integration.lastConnectionTestAt || integration.updatedAt || integration.createdAt,
      status: integration.status,
    }))
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )) as ActivityItem[];

  if (activities.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{widget.name || 'Integration Activity'}</CardTitle>
          <CardDescription>Recent integration activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'connected':
        return CheckCircle2;
      case 'disconnected':
        return XCircle;
      case 'error':
        return XCircle;
      case 'sync':
        return RefreshCw;
      default:
        return Activity;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'disconnected':
        return 'text-gray-600 bg-gray-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'sync':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{widget.name || 'Integration Activity'}</CardTitle>
        <CardDescription>Recent integration activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActionIcon(activity.action);
              const colorClass = getActionColor(activity.action);

              return (
                <Link
                  key={activity.id}
                  href={`/integrations/${activity.integrationId}`}
                  className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className={`h-8 w-8 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{activity.integrationName}</p>
                      <Badge variant="outline" className="text-xs">
                        {activity.providerName}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}







