/**
 * Early Warning Panel Component
 * Display early warning signals for opportunities
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Bell, CheckCircle2, Clock, Filter } from 'lucide-react';
import { useEarlyWarnings } from '@/hooks/use-risk-analysis';
import { EarlyWarningSignal } from './early-warning-signal';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import type { EarlyWarningSignal as EarlyWarningSignalType, SignalSeverity } from '@/types/risk-analysis';

interface EarlyWarningPanelProps {
  opportunityId: string;
}

export function EarlyWarningPanel({ opportunityId }: EarlyWarningPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SignalSeverity | 'all'>('all');
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('all');

  const {
    data: signals = [],
    isLoading,
    error,
    refetch,
  } = useEarlyWarnings(opportunityId);

  // Filter signals
  const filteredSignals = signals.filter((signal) => {
    if (severityFilter !== 'all' && signal.severity !== severityFilter) {
      return false;
    }
    if (signalTypeFilter !== 'all' && signal.signalType !== signalTypeFilter) {
      return false;
    }
    return true;
  });

  // Group by severity
  const signalsBySeverity = filteredSignals.reduce((acc, signal) => {
    if (!acc[signal.severity]) {
      acc[signal.severity] = [];
    }
    acc[signal.severity].push(signal);
    return acc;
  }, {} as Record<SignalSeverity, EarlyWarningSignalType[]>);

  // Counts
  const highCount = signals.filter((s) => s.severity === 'high').length;
  const mediumCount = signals.filter((s) => s.severity === 'medium').length;
  const lowCount = signals.filter((s) => s.severity === 'low').length;
  const unacknowledgedCount = signals.filter((s) => !s.acknowledgedAt).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={error} 
            onRetry={() => refetch()}
            title="Failed to Load Early Warning Signals"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Early Warning Signals
              </CardTitle>
              <CardDescription>
                Proactive alerts for potential deal risks
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Total Signals</div>
              <div className="text-2xl font-bold">{signals.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">High Severity</div>
              <div className="text-2xl font-bold text-red-600">{highCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Medium Severity</div>
              <div className="text-2xl font-bold text-yellow-600">{mediumCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Unacknowledged</div>
              <div className="text-2xl font-bold text-blue-600">{unacknowledgedCount}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Severity:</span>
              <div className="flex gap-2">
                <Button
                  variant={severityFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={severityFilter === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter('high')}
                >
                  High
                </Button>
                <Button
                  variant={severityFilter === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter('medium')}
                >
                  Medium
                </Button>
                <Button
                  variant={severityFilter === 'low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter('low')}
                >
                  Low
                </Button>
              </div>
            </div>
          </div>

          {/* Signals List */}
          {filteredSignals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No early warning signals found.</p>
              <p className="text-sm mt-2">
                {signals.length === 0
                  ? 'Signals will appear here when detected.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">
                  All ({filteredSignals.length})
                </TabsTrigger>
                {Object.entries(signalsBySeverity).map(([severity, severitySignals]) => (
                  <TabsTrigger key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)} ({severitySignals.length})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="space-y-3">
                  {filteredSignals.map((signal) => (
                    <EarlyWarningSignal key={signal.id} signal={signal} />
                  ))}
                </div>
              </TabsContent>

              {Object.entries(signalsBySeverity).map(([severity, severitySignals]) => (
                <TabsContent key={severity} value={severity} className="mt-4">
                  <div className="space-y-3">
                    {severitySignals.map((signal) => (
                      <EarlyWarningSignal key={signal.id} signal={signal} />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


