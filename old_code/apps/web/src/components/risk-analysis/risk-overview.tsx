/**
 * Risk Overview Component
 * Main risk dashboard for opportunities
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, TrendingUp, DollarSign, Shield, BarChart3, Database } from 'lucide-react';
import { useRiskEvaluation, useRevenueAtRisk, useEarlyWarnings } from '@/hooks/use-risk-analysis';
import { ErrorDisplay } from './error-display';
import { TrustLevelBadge } from './trust-level-badge';
import { AssumptionDisplay } from './assumption-display';
import { ScoreBreakdown } from './score-breakdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RiskEvaluation, RevenueAtRisk, EarlyWarningSignal, RiskCategory } from '@/types/risk-analysis';

interface RiskOverviewProps {
  opportunityId: string;
  onRefresh?: () => void;
}

export function RiskOverview({ opportunityId, onRefresh }: RiskOverviewProps) {
  // Fetch risk data
  const {
    data: evaluation,
    isLoading: evaluationLoading,
    error: evaluationError,
    refetch: refetchEvaluation,
  } = useRiskEvaluation(opportunityId);

  const {
    data: revenueAtRisk,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useRevenueAtRisk(opportunityId);

  const {
    data: earlyWarnings,
    isLoading: warningsLoading,
    error: warningsError,
    refetch: refetchWarnings,
  } = useEarlyWarnings(opportunityId);

  // Calculate risk level
  const riskLevel = useMemo(() => {
    if (!evaluation) return null;
    const score = evaluation.riskScore;
    if (score >= 0.7) return { label: 'High', color: 'destructive' };
    if (score >= 0.4) return { label: 'Medium', color: 'warning' };
    return { label: 'Low', color: 'default' };
  }, [evaluation]);

  // Format currency
  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (evaluationLoading || revenueLoading || warningsLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (evaluationError || revenueError || warningsError) {
    const primaryError = evaluationError || revenueError || warningsError;
    const handleRetry = () => {
      if (evaluationError) refetchEvaluation();
      if (revenueError) refetchRevenue();
      if (warningsError) refetchWarnings();
    };
    
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorDisplay 
            error={primaryError} 
            onRetry={handleRetry}
            title="Failed to Load Risk Data"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Assessment
          </CardTitle>
          <CardDescription>
            Overall risk evaluation for this opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Risk Score */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Risk Score</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {evaluation ? formatPercent(evaluation.riskScore) : '—'}
                </div>
                {riskLevel && (
                  <Badge variant={riskLevel.color as any}>{riskLevel.label}</Badge>
                )}
              </div>
            </div>

            {/* Revenue at Risk */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Revenue at Risk</div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-semibold">
                  {revenueAtRisk
                    ? formatCurrency(revenueAtRisk.revenueAtRisk, revenueAtRisk.currency)
                    : '—'}
                </div>
              </div>
              {revenueAtRisk && (
                <div className="text-xs text-muted-foreground">
                  of {formatCurrency(revenueAtRisk.dealValue, revenueAtRisk.currency)} total
                </div>
              )}
            </div>

            {/* Risk-Adjusted Value */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Risk-Adjusted Value</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-semibold">
                  {revenueAtRisk
                    ? formatCurrency(revenueAtRisk.riskAdjustedValue, revenueAtRisk.currency)
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Trust Level and Quality Score */}
          {(evaluation?.trustLevel || evaluation?.qualityScore !== undefined) && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Trust & Quality</div>
              <div className="flex items-center gap-3">
                {evaluation.trustLevel && (
                  <TrustLevelBadge trustLevel={evaluation.trustLevel} />
                )}
                {evaluation.qualityScore !== undefined && (
                  <Badge variant={evaluation.qualityScore >= 0.7 ? 'default' : evaluation.qualityScore >= 0.5 ? 'secondary' : 'destructive'}>
                    Quality: {formatPercent(evaluation.qualityScore)}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Detected Risks Count */}
          {evaluation && evaluation.risks.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {evaluation.risks.length} risk{evaluation.risks.length !== 1 ? 's' : ''} detected
              </div>
            </div>
          )}

          {/* Category Scores */}
          {evaluation && evaluation.categoryScores && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-3">Category Scores</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {(Object.entries(evaluation.categoryScores) as [RiskCategory, number][]).map(([category, score]) => (
                  <div key={category} className="space-y-1">
                    <div className="text-xs text-muted-foreground">{category}</div>
                    <div className="text-lg font-semibold">{formatPercent(score)}</div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Breakdown and Details Tabs */}
      <Tabs defaultValue="assumptions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="breakdown">
            <BarChart3 className="h-4 w-4 mr-2" />
            Score Breakdown
          </TabsTrigger>
          <TabsTrigger value="warnings">Warnings</TabsTrigger>
        </TabsList>
        <TabsContent value="assumptions">
          {evaluation?.assumptions ? (
            <AssumptionDisplay assumptions={evaluation.assumptions} showWarnings={true} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No assumption data available for this evaluation
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="breakdown">
          <ScoreBreakdown opportunityId={opportunityId} />
        </TabsContent>
        <TabsContent value="warnings">
          {earlyWarnings && earlyWarnings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Early Warning Signals
                </CardTitle>
                <CardDescription>
                  {earlyWarnings.length} warning signal{earlyWarnings.length !== 1 ? 's' : ''} detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {earlyWarnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
                    >
                      <Badge
                        variant={
                          warning.severity === 'critical'
                            ? 'destructive'
                            : warning.severity === 'high'
                            ? 'destructive'
                            : warning.severity === 'medium'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {warning.severity}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{warning.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(warning.detectedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No early warning signals detected
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Assumptions Card - Always visible if assumptions exist */}
      {evaluation?.assumptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Evaluation Assumptions & Data Quality
            </CardTitle>
            <CardDescription>
              Transparency information about data quality and evaluation reliability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssumptionDisplay assumptions={evaluation.assumptions} showWarnings={true} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}


