/**
 * Simulation Panel Component
 * Main interface for risk simulation and scenario analysis
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, GitCompare, History, AlertCircle, ShieldOff } from 'lucide-react';
import { usePermissionCheck } from '@/hooks/use-permission-check';
import { useSimulations } from '@/hooks/use-simulation';
import { ScenarioBuilder } from './scenario-builder';
import { SimulationResults as SimulationResultsComponent } from './simulation-results';
import { ScenarioComparison } from './scenario-comparison';
import { ErrorDisplay } from '@/components/risk-analysis/error-display';
import type { SimulationScenario, SimulationResults } from '@/types/risk-analysis';

interface SimulationPanelProps {
  opportunityId: string;
}

export function SimulationPanel({ opportunityId }: SimulationPanelProps) {
  const [activeTab, setActiveTab] = useState<'run' | 'compare' | 'history'>('run');
  const [currentResults, setCurrentResults] = useState<SimulationResults | null>(null);
  const [comparisonResults, setComparisonResults] = useState<any>(null);

  // Check permissions: require team or tenant risk read access
  const canReadTeamRisks = usePermissionCheck('risk:read:team');
  const canReadTenantRisks = usePermissionCheck('risk:read:tenant');
  const hasAccess = canReadTeamRisks || canReadTenantRisks;

  const {
    data: simulations = [],
    isLoading,
    error,
    refetch,
  } = useSimulations(opportunityId);

  // Permission check
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <ShieldOff className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view simulations. Manager or Director role required.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            title="Failed to Load Simulations"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Risk Simulation
          </CardTitle>
          <CardDescription>
            Run scenarios to analyze potential risk and revenue outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="run">
                <Play className="h-4 w-4 mr-2" />
                Run Simulation
              </TabsTrigger>
              <TabsTrigger value="compare">
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Scenarios
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History ({simulations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="run" className="mt-4">
              <ScenarioBuilder
                opportunityId={opportunityId}
                onResults={(results) => {
                  setCurrentResults(results);
                  setActiveTab('run');
                }}
              />
              {currentResults && (
                <div className="mt-4">
                  <SimulationResultsComponent results={currentResults} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="compare" className="mt-4">
              <ScenarioComparison
                opportunityId={opportunityId}
                onComparison={(comparison) => {
                  setComparisonResults(comparison);
                }}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {simulations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No simulations yet.</p>
                  <p className="text-sm mt-2">Run a simulation to see it here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {simulations.map((simulation) => (
                    <Card key={simulation.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{simulation.scenarioName}</CardTitle>
                        <CardDescription>
                          {new Date(simulation.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SimulationResultsComponent results={simulation.results} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


