/**
 * Risk Details Panel Component
 * Detailed risk view with explanations and source information
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Info, FileText, Users } from 'lucide-react';
import { useRiskEvaluation, useHistoricalPatterns } from '@/hooks/use-risk-analysis';
import type { DetectedRisk, HistoricalPattern } from '@/types/risk-analysis';
import { ErrorDisplay } from './error-display';
import { StructuredExplanation } from './structured-explanation';
import { AssumptionDisplay } from './assumption-display';
import { TrustLevelBadge } from './trust-level-badge';

interface RiskDetailsPanelProps {
  opportunityId: string;
}

export function RiskDetailsPanel({ opportunityId }: RiskDetailsPanelProps) {
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const {
    data: evaluation,
    isLoading: evaluationLoading,
    error: evaluationError,
    refetch: refetchEvaluation,
  } = useRiskEvaluation(opportunityId);

  const {
    data: historicalPatterns,
    isLoading: patternsLoading,
  } = useHistoricalPatterns(opportunityId, !!evaluation);

  // Group risks by category
  const risksByCategory = evaluation?.risks.reduce((acc, risk) => {
    if (!acc[risk.category]) {
      acc[risk.category] = [];
    }
    acc[risk.category].push(risk);
    return acc;
  }, {} as Record<string, DetectedRisk[]>) || {};

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (evaluationLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (evaluationError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={evaluationError} 
            onRetry={() => refetchEvaluation()}
            title="Failed to Load Risk Details"
          />
        </CardContent>
      </Card>
    );
  }

  if (!evaluation || evaluation.risks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Details</CardTitle>
          <CardDescription>No risks detected for this opportunity</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detected Risks
          </CardTitle>
          <CardDescription>
            {evaluation.risks.length} risk{evaluation.risks.length !== 1 ? 's' : ''} identified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Risks</TabsTrigger>
              {Object.keys(risksByCategory).map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <Accordion type="single" collapsible className="w-full">
                {evaluation.risks
                  .sort((a, b) => b.contribution - a.contribution)
                  .map((risk) => (
                    <AccordionItem key={risk.riskId} value={risk.riskId}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <Badge variant="outline">{risk.category}</Badge>
                          <span className="font-medium">{risk.riskName}</span>
                          <Badge
                            variant={
                              risk.confidence >= 0.7
                                ? 'default'
                                : risk.confidence >= 0.4
                                ? 'secondary'
                                : 'outline'
                            }
                            className="ml-auto"
                          >
                            {formatPercent(risk.confidence)} confidence
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {/* Risk Explanation */}
                          {typeof risk.explainability === 'string' ? (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Info className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Explanation</span>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                {risk.explainability}
                              </p>
                            </div>
                          ) : (
                            <StructuredExplanation explainability={risk.explainability} />
                          )}

                          {/* Risk Metrics */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground">Contribution</div>
                              <div className="text-sm font-semibold">
                                {formatPercent(risk.contribution)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Weight</div>
                              <div className="text-sm font-semibold">
                                {formatPercent(risk.ponderation)}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">State</div>
                              <Badge variant="outline" className="text-xs">
                                {risk.lifecycleState}
                              </Badge>
                            </div>
                          </div>

                          {/* Source Shards */}
                          {risk.sourceShards.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  Source Shards ({risk.sourceShards.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 pl-6">
                                {risk.sourceShards.map((shardId) => (
                                  <Badge key={shardId} variant="outline" className="text-xs">
                                    {shardId.substring(0, 8)}...
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </TabsContent>

            {Object.entries(risksByCategory).map(([category, risks]) => (
              <TabsContent key={category} value={category} className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  {risks
                    .sort((a, b) => b.contribution - a.contribution)
                    .map((risk) => (
                      <AccordionItem key={risk.riskId} value={risk.riskId}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-3 flex-1 text-left">
                            <span className="font-medium">{risk.riskName}</span>
                            <Badge
                              variant={
                                risk.confidence >= 0.7
                                  ? 'default'
                                  : risk.confidence >= 0.4
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="ml-auto"
                            >
                              {formatPercent(risk.confidence)} confidence
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            {typeof risk.explainability === 'string' ? (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Explanation</span>
                                </div>
                                <p className="text-sm text-muted-foreground pl-6">
                                  {risk.explainability}
                                </p>
                              </div>
                            ) : (
                              <StructuredExplanation explainability={risk.explainability} />
                            )}
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className="text-xs text-muted-foreground">Contribution</div>
                                <div className="text-sm font-semibold">
                                  {formatPercent(risk.contribution)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Weight</div>
                                <div className="text-sm font-semibold">
                                  {formatPercent(risk.ponderation)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">State</div>
                                <Badge variant="outline" className="text-xs">
                                  {risk.lifecycleState}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Assumptions and Data Quality */}
      {evaluation?.assumptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Evaluation Assumptions & Data Quality
            </CardTitle>
            <CardDescription>
              Transparency information about data quality and evaluation reliability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Trust Level Badge */}
              {evaluation.trustLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trust Level</span>
                  <TrustLevelBadge trustLevel={evaluation.trustLevel} />
                </div>
              )}
              <AssumptionDisplay assumptions={evaluation.assumptions} showWarnings={true} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Patterns */}
      {historicalPatterns && historicalPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historical Patterns
            </CardTitle>
            <CardDescription>
              Similar opportunities and their outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patternsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : (
              <div className="space-y-3">
                {historicalPatterns.map((pattern) => (
                  <div
                    key={pattern.similarOpportunityId}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={pattern.outcome === 'won' ? 'default' : 'destructive'}
                        >
                          {pattern.outcome === 'won' ? 'Won' : 'Lost'}
                        </Badge>
                        <span className="text-sm font-medium">
                          {formatPercent(pattern.similarityScore)} similar
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Win rate: {formatPercent(pattern.winRate)} • Avg closing: {pattern.avgClosingTime} days
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


