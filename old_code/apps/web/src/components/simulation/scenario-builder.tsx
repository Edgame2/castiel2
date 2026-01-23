/**
 * Scenario Builder Component
 * Build simulation scenarios with modifications
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useRunSimulation } from '@/hooks/use-simulation';
import { useRiskEvaluation } from '@/hooks/use-risk-analysis';
import { handleApiError } from '@/lib/api/client';
import type { SimulationScenario, SimulationModifications } from '@/types/risk-analysis';

interface ScenarioBuilderProps {
  opportunityId: string;
  onResults?: (results: any) => void;
}

export function ScenarioBuilder({ opportunityId, onResults }: ScenarioBuilderProps) {
  const [scenarioName, setScenarioName] = useState('');
  const [modifications, setModifications] = useState<SimulationModifications>({
    dealParameters: {},
    risks: [],
    weights: {},
  });
  const [error, setError] = useState<string | null>(null);

  const {
    data: evaluation,
    isLoading: evaluationLoading,
  } = useRiskEvaluation(opportunityId);

  const runSimulation = useRunSimulation();

  const handleRun = async () => {
    if (!scenarioName.trim()) {
      setError('Please provide a scenario name');
      return;
    }

    setError(null);
    try {
      const scenario: SimulationScenario = {
        modifications,
        description: scenarioName,
      };

      const results = await runSimulation.mutateAsync({
        opportunityId,
        scenario,
      });

      if (onResults) {
        onResults(results);
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(typeof errorMessage === 'string' ? errorMessage : errorMessage.message);
    }
  };

  const updateDealParameter = (key: keyof NonNullable<SimulationModifications['dealParameters']>, value: any) => {
    setModifications((prev) => ({
      ...prev,
      dealParameters: {
        ...prev.dealParameters,
        [key]: value,
      },
    }));
  };

  const addRiskModification = () => {
    setModifications((prev) => ({
      ...prev,
      risks: [
        ...(prev.risks || []),
        {
          action: 'modify',
          riskId: '',
          ponderation: 0.5,
        },
      ],
    }));
  };

  const removeRiskModification = (index: number) => {
    setModifications((prev) => ({
      ...prev,
      risks: prev.risks?.filter((_, i) => i !== index) || [],
    }));
  };

  const updateRiskModification = (index: number, updates: Partial<NonNullable<SimulationModifications['risks']>[0]>) => {
    setModifications((prev) => ({
      ...prev,
      risks: (prev.risks || []).map((r, i) => (i === index ? { ...r, ...updates } : r)),
    }));
  };

  if (evaluationLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Build Scenario</CardTitle>
          <CardDescription>
            Define modifications to simulate different outcomes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Scenario Name */}
          <div className="space-y-2">
            <Label htmlFor="scenarioName">Scenario Name</Label>
            <Input
              id="scenarioName"
              value={scenarioName}
              onChange={(e) => {
                setScenarioName(e.target.value);
                setError(null); // Clear error when user types
              }}
              placeholder="e.g., Reduce risk by 20%"
            />
          </div>

          <Accordion type="multiple" className="w-full">
            {/* Deal Parameters */}
            <AccordionItem value="deal-parameters">
              <AccordionTrigger>Deal Parameters</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="value">Deal Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={modifications.dealParameters?.value || ''}
                      onChange={(e) =>
                        updateDealParameter('value', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probability">Probability (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={modifications.dealParameters?.probability ? modifications.dealParameters.probability * 100 : ''}
                      onChange={(e) =>
                        updateDealParameter(
                          'probability',
                          e.target.value ? parseFloat(e.target.value) / 100 : undefined
                        )
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closeDate">Close Date</Label>
                  <Input
                    id="closeDate"
                    type="date"
                    value={
                      modifications.dealParameters?.closeDate
                        ? new Date(modifications.dealParameters.closeDate).toISOString().split('T' as any)[0]
                        : ''
                    }
                    onChange={(e) =>
                      updateDealParameter('closeDate', e.target.value ? e.target.value : undefined)
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Risk Modifications */}
            <AccordionItem value="risks">
              <AccordionTrigger>Risk Modifications</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Modify risk weights or add/remove risks
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRiskModification}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Risk
                  </Button>
                </div>
                {modifications.risks && modifications.risks.length > 0 && (
                  <div className="space-y-3">
                    {modifications.risks.map((risk, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Select
                          value={risk.action}
                          onValueChange={(value: any) =>
                            updateRiskModification(index, { action: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add">Add</SelectItem>
                            <SelectItem value="remove">Remove</SelectItem>
                            <SelectItem value="modify">Modify</SelectItem>
                          </SelectContent>
                        </Select>
                        {evaluation && (
                          <Select
                            value={risk.riskId}
                            onValueChange={(value) =>
                              updateRiskModification(index, { riskId: value })
                            }
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select risk" />
                            </SelectTrigger>
                            <SelectContent>
                              {evaluation.risks.map((r) => (
                                <SelectItem key={r.riskId} value={r.riskId}>
                                  {r.riskName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {risk.action === 'modify' && (
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={risk.ponderation || 0}
                            onChange={(e) =>
                              updateRiskModification(index, {
                                ponderation: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24"
                            placeholder="Weight"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRiskModification(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Run Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleRun}
              disabled={!scenarioName.trim() || runSimulation.isPending}
            >
              {runSimulation.isPending ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


