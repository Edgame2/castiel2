/**
 * Scenario Comparison Component
 * Compare multiple simulation scenarios side by side
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GitCompare, Plus, AlertCircle } from 'lucide-react';
import { useCompareScenarios } from '@/hooks/use-simulation';
import { SimulationResults } from './simulation-results';
import type { SimulationScenario, ComparisonResult, SimulationModifications } from '@/types/risk-analysis';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ScenarioComparisonProps {
  opportunityId: string;
  onComparison?: (comparison: ComparisonResult) => void;
}

export function ScenarioComparison({ opportunityId, onComparison }: ScenarioComparisonProps) {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioMods, setNewScenarioMods] = useState<SimulationModifications>({});

  const compareScenarios = useCompareScenarios();

  const handleAddScenario = () => {
    if (!newScenarioName.trim()) return;
    
    const scenario: SimulationScenario = {
      modifications: newScenarioMods,
      description: newScenarioName,
    };
    
    setScenarios((prev) => [...prev, scenario]);
    setNewScenarioName('');
    setNewScenarioMods({});
    setShowBuilder(false);
  };

  const handleCompare = async () => {
    if (scenarios.length < 2) {
      return;
    }

    try {
      const comparison = await compareScenarios.mutateAsync({
        opportunityId,
        scenarios,
      });

      if (onComparison) {
        onComparison(comparison);
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to compare scenarios', 3, {
        errorMessage: errorObj.message,
        opportunityId,
        scenarioCount: scenarios.length,
      })
    }
  };

  const removeScenario = (index: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== index));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Add Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Build Scenarios
          </CardTitle>
          <CardDescription>
            Create multiple scenarios to compare outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showBuilder ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  placeholder="e.g., Optimistic Scenario"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddScenario} disabled={!newScenarioName.trim()}>
                  Add Scenario
                </Button>
                <Button variant="outline" onClick={() => setShowBuilder(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} added
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setNewScenarioName(`Scenario ${scenarios.length + 1}`);
                  setShowBuilder(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Scenario
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scenarios List */}
      {scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scenarios</CardTitle>
            <CardDescription>
              {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} ready to compare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scenarios.map((scenario, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{scenario.description || `Scenario ${index + 1}`}</div>
                    <div className="text-sm text-muted-foreground">
                      {Object.keys(scenario.modifications.dealParameters || {}).length} deal parameters,{' '}
                      {scenario.modifications.risks?.length || 0} risk modifications
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScenario(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            {scenarios.length >= 2 && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleCompare}
                  disabled={compareScenarios.isPending}
                >
                  {compareScenarios.isPending ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <GitCompare className="h-4 w-4 mr-2" />
                      Compare Scenarios
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {compareScenarios.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparison Results
            </CardTitle>
            <CardDescription>
              Side-by-side comparison of all scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Revenue at Risk</TableHead>
                    <TableHead>Best Case</TableHead>
                    <TableHead>Base Case</TableHead>
                    <TableHead>Worst Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareScenarios.data.scenarios.map((scenario, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {scenario.scenarioName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            scenario.results.riskScore >= 0.7
                              ? 'destructive'
                              : scenario.results.riskScore >= 0.4
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {formatPercent(scenario.results.riskScore)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(scenario.results.revenueAtRisk)}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(scenario.results.forecastScenarios.bestCase)}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {formatCurrency(scenario.results.forecastScenarios.baseCase)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(scenario.results.forecastScenarios.worstCase)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Recommendations */}
            {compareScenarios.data.recommendations.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium">Recommendations</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {compareScenarios.data.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

