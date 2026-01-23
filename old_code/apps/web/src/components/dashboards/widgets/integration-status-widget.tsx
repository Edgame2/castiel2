'use client';

import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Widget } from '@/types/dashboard';
import { useIntegrations } from '@/hooks/use-integrations';

interface IntegrationStatusWidgetProps {
  widget: Widget;
  data?: unknown;
}

export function IntegrationStatusWidget({ widget, data }: IntegrationStatusWidgetProps) {
  const { data: integrationsData, isLoading } = useIntegrations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  const integrations = integrationsData?.integrations || [];
  
  const statusCounts = {
    connected: integrations.filter((i) => i.status === 'connected').length,
    error: integrations.filter((i) => i.status === 'error').length,
    pending: integrations.filter((i) => i.status === 'pending').length,
    disabled: integrations.filter((i) => i.status === 'disabled').length,
  };

  const total = integrations.length;

  const statusItems = [
    {
      label: 'Connected',
      count: statusCounts.connected,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/integrations?status=connected',
    },
    {
      label: 'Pending',
      count: statusCounts.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/integrations?status=pending',
    },
    {
      label: 'Error',
      count: statusCounts.error,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/integrations?status=error',
    },
    {
      label: 'Disabled',
      count: statusCounts.disabled,
      icon: AlertCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      href: '/integrations?status=disabled',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{widget.name || 'Integration Status'}</CardTitle>
        <CardDescription>
          {total} integration{total !== 1 ? 's' : ''} configured
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} integration{item.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{item.count}</Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}







