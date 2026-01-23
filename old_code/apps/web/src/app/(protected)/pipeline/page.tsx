/**
 * Pipeline Page
 * Displays pipeline view with different visualization options
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePipelineView } from '@/hooks/use-opportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, Kanban, List, TrendingUp, LineChart, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { PipelineView } from '@/lib/api/opportunities';

export default function PipelinePage() {
  const router = useRouter();
  const [viewType, setViewType] = useState<'all' | 'active' | 'stage' | 'kanban'>('all');

  const { data: pipelineView, isLoading, error, refetch } = usePipelineView(viewType);
  const errorMessage = error ? handleApiError(error) : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">View and manage your sales pipeline</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/pipeline/forecast')}>
          <LineChart className="h-4 w-4 mr-2" />
          Revenue Forecast
        </Button>
      </div>

      {/* Summary Cards */}
      {pipelineView && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(pipelineView.summary.totalValue, 'USD')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expected Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(pipelineView.summary.totalExpectedRevenue, 'USD')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revenue at Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(pipelineView.summary.totalRevenueAtRisk, 'USD')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pipelineView.summary.opportunityCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Type Selector */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            <List className="h-4 w-4 mr-2" />
            All
          </TabsTrigger>
          <TabsTrigger value="active">
            <TrendingUp className="h-4 w-4 mr-2" />
            Active
          </TabsTrigger>
          <TabsTrigger value="stage">
            <BarChart3 className="h-4 w-4 mr-2" />
            By Stage
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <Kanban className="h-4 w-4 mr-2" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value={viewType} className="mt-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          ) : pipelineView ? (
            <div className="space-y-4">
              {viewType === 'kanban' || viewType === 'stage' ? (
                // Kanban/Stage View
                pipelineView.stages?.map((stage) => (
                  <Card key={stage.stage}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{stage.stage}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {stage.count} opportunities · {formatCurrency(stage.totalValue, 'USD')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {stage.opportunities.map((opp) => {
                          const data = opp.structuredData as any;
                          return (
                            <div
                              key={opp.id}
                              className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => router.push(`/opportunities/${opp.id}`)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{data?.name || 'Unnamed'}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatCurrency(data?.value || 0, data?.currency || 'USD')}
                                  </div>
                                </div>
                                {data?.riskEvaluation?.riskScore && (
                                  <div className="text-sm">
                                    Risk: {(data.riskEvaluation.riskScore * 100).toFixed(0)}%
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // List View
                <div className="grid gap-4">
                  {pipelineView.opportunities.map((opp) => {
                    const data = opp.structuredData as any;
                    return (
                      <Card
                        key={opp.id}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => router.push(`/opportunities/${opp.id}`)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">
                                {data?.name || 'Unnamed Opportunity'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {data?.stage || 'Unknown Stage'} ·{' '}
                                {formatCurrency(data?.value || 0, data?.currency || 'USD')}
                              </p>
                            </div>
                            {data?.riskEvaluation && (
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">Risk Score</div>
                                <div className="text-lg font-semibold">
                                  {(data.riskEvaluation.riskScore * 100).toFixed(0)}%
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <p className="text-muted-foreground">No pipeline data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

