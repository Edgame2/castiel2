/**
 * Score Breakdown Component
 * Visualizes risk score calculation breakdown showing category scores and risk contributions
 * Phase 2.2: Risk Score Transparency
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calculator, TrendingUp, Info, BookOpen } from 'lucide-react';
import { useScoreBreakdown } from '@/hooks/use-risk-analysis';
import { ErrorDisplay } from './error-display';
import { ScoreFormulaDocumentation } from './score-formula-documentation';
import type { RiskCategory } from '@/types/risk-analysis';

interface ScoreBreakdownProps {
  opportunityId: string;
  className?: string;
}

/**
 * Custom tooltip for category scores chart
 */
const CategoryScoreTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">{data.category}</p>
        <p className="text-sm text-muted-foreground">
          Score: <span className="font-medium">{(data.score * 100).toFixed(1)}%</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Contribution: <span className="font-medium">{(data.contribution * 100).toFixed(1)}%</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Risks: <span className="font-medium">{data.riskCount}</span>
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Custom tooltip for risk contributions chart
 */
const RiskContributionTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold">{data.riskName}</p>
        <p className="text-sm text-muted-foreground">
          Contribution: <span className="font-medium">{(data.contribution * 100).toFixed(1)}%</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Confidence: <span className="font-medium">{(data.confidence * 100).toFixed(1)}%</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Weight: <span className="font-medium">{(data.ponderation * 100).toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function ScoreBreakdown({ opportunityId, className }: ScoreBreakdownProps) {
  const {
    data: breakdown,
    isLoading,
    error,
    refetch,
  } = useScoreBreakdown(opportunityId);

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Prepare category scores data for chart
  const categoryScoresData = useMemo(() => {
    if (!breakdown?.scoreCalculation?.categoryScores) return [];
    
    return Object.entries(breakdown.scoreCalculation.categoryScores).map(([category, data]) => ({
      category,
      score: data.score,
      contribution: data.contribution,
      riskCount: data.risks.length,
    }));
  }, [breakdown]);

  // Prepare risk contributions data for chart (top 10 by contribution)
  const riskContributionsData = useMemo(() => {
    if (!breakdown?.scoreCalculation?.categoryScores) return [];
    
    const allRisks: Array<{
      riskId: string;
      riskName: string;
      category: RiskCategory;
      contribution: number;
      confidence: number;
      ponderation: number;
    }> = [];

    Object.entries(breakdown.scoreCalculation.categoryScores).forEach(([category, data]) => {
      data.risks.forEach((risk) => {
        allRisks.push({
          riskId: risk.riskId,
          riskName: risk.riskId, // We'll need to get the actual name from evaluation
          category: category as RiskCategory,
          contribution: risk.contribution,
          confidence: risk.confidence,
          ponderation: risk.ponderation,
        });
      });
    });

    return allRisks
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 10)
      .map((risk, index) => ({
        ...risk,
        riskName: `Risk ${index + 1}`, // Placeholder - would need risk catalog lookup
      }));
  }, [breakdown]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <ErrorDisplay
            error={error}
            onRetry={() => refetch()}
            title="Failed to Load Score Breakdown"
          />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown) {
    return null;
  }

  const { scoreCalculation } = breakdown;

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Score Calculation Breakdown
          </CardTitle>
          <CardDescription>
            Detailed breakdown of how the risk score was calculated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Final Score and Formula */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Final Risk Score</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {formatPercent(scoreCalculation.finalScore)}
                </div>
                <Badge variant="outline" className="text-xs">
                  Calculated
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                Formula
              </div>
              <div className="text-sm font-mono bg-muted p-2 rounded">
                {scoreCalculation.formula || 'Σ(ponderation × confidence × contribution)'}
              </div>
            </div>
          </div>

          {/* Category Scores Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Category Scores</h3>
              <Badge variant="outline">
                {categoryScoresData.length} categories
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryScoresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(value) => formatPercent(value)}
                  domain={[0, 1]}
                />
                <Tooltip content={<CategoryScoreTooltip />} />
                <Legend />
                <Bar
                  dataKey="score"
                  name="Category Score"
                  fill="#0088FE"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="contribution"
                  name="Contribution to Final Score"
                  fill="#00C49F"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Scores Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Category Details</h3>
            <div className="space-y-2">
              {categoryScoresData.map((category) => {
                const categoryData = scoreCalculation.categoryScores[category.category as RiskCategory];
                return (
                  <div
                    key={category.category}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{category.category}</div>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Score: </span>
                          <span className="font-semibold">{formatPercent(category.score)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Contribution: </span>
                          <span className="font-semibold">{formatPercent(category.contribution)}</span>
                        </div>
                      </div>
                    </div>
                    {categoryData.risks.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-2">
                          {categoryData.risks.length} risk{categoryData.risks.length !== 1 ? 's' : ''} contributing:
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {categoryData.risks.map((risk) => (
                            <div
                              key={risk.riskId}
                              className="text-xs bg-muted p-2 rounded"
                            >
                              <div className="font-medium truncate">{risk.riskId}</div>
                              <div className="text-muted-foreground mt-1">
                                Contrib: {formatPercent(risk.contribution)} | Conf: {formatPercent(risk.confidence)} | Weight: {formatPercent(risk.ponderation)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confidence Adjustments */}
          {scoreCalculation.confidenceAdjustments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Confidence Adjustments
              </h3>
              <div className="space-y-2">
                {scoreCalculation.confidenceAdjustments.map((adjustment, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{adjustment.factor}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {adjustment.reason}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Source: {adjustment.source}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Badge
                        variant={adjustment.adjustment >= 0 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {adjustment.adjustment >= 0 ? '+' : ''}
                        {formatPercent(Math.abs(adjustment.adjustment))}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calculation Steps (Collapsible) */}
          {scoreCalculation.steps.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Calculation Steps</h3>
              <div className="space-y-2">
                {scoreCalculation.steps.map((step, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">
                        Step {index + 1}: {step.step}
                      </div>
                      {step.category && (
                        <Badge variant="outline" className="text-xs">
                          {step.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {step.description}
                    </div>
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      {step.formula}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        Inputs: {Object.entries(step.inputValues).map(([key, value]) => (
                          <span key={key} className="ml-2">
                            {key}={value.toFixed(3)}
                          </span>
                        ))}
                      </div>
                      <div className="font-semibold">
                        Result: {step.result.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formula Documentation */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Formula Documentation</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Comprehensive guide to understanding how risk scores are calculated, including all formulas,
              normalization logic, and calculation methods.
            </p>
            <ScoreFormulaDocumentation />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
