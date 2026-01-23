/**
 * Forecast Commitment Component
 * Analyzes forecast commitment levels and detects issues
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
} from 'lucide-react';
import { caisApi, type ForecastCommitment } from '@/lib/api/cais-services';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface ForecastCommitmentProps {
  periodKey?: string;
  className?: string;
}

export function ForecastCommitment({ periodKey, className }: ForecastCommitmentProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [localPeriodKey, setLocalPeriodKey] = useState(periodKey || '');
  const [commitment, setCommitment] = useState({
    commit: 0,
    bestCase: 0,
    upside: 0,
    risk: 0,
    total: 0,
  });

  const {
    data: analysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['forecast-commitment', tenantId, localPeriodKey, commitment],
    queryFn: () => {
      if (!tenantId || !localPeriodKey || !user?.id) {
        throw new Error('Missing required fields');
      }
      return caisApi.analyzeForecastCommitment({
        tenantId,
        periodKey: localPeriodKey,
        commitment,
        userId: user.id,
      });
    },
    enabled: !!tenantId && !!localPeriodKey && !!user?.id && commitment.total > 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const commitmentScoreColor = useMemo(() => {
    if (!analysis) return 'default';
    const score = analysis.scoring.commitmentScore;
    if (score >= 0.7) return 'default';
    if (score >= 0.4) return 'secondary';
    return 'destructive';
  }, [analysis]);

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to analyze forecast commitment. Please try again.
            <button onClick={() => refetch()} className="ml-2 underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Forecast Commitment Analysis</CardTitle>
            <CardDescription>Enter commitment values to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="periodKey">Period Key (e.g., 2024-Q1)</Label>
                <Input
                  id="periodKey"
                  value={localPeriodKey}
                  onChange={(e) => setLocalPeriodKey(e.target.value)}
                  placeholder="2024-Q1"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="commit">Commit</Label>
                  <Input
                    id="commit"
                    type="number"
                    value={commitment.commit || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setCommitment({ ...commitment, commit: value, total: value + commitment.bestCase });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="bestCase">Best Case</Label>
                  <Input
                    id="bestCase"
                    type="number"
                    value={commitment.bestCase || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setCommitment({ ...commitment, bestCase: value, total: commitment.commit + value });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="upside">Upside</Label>
                  <Input
                    id="upside"
                    type="number"
                    value={commitment.upside || ''}
                    onChange={(e) => {
                      setCommitment({ ...commitment, upside: parseFloat(e.target.value) || 0 });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="risk">Risk</Label>
                  <Input
                    id="risk"
                    type="number"
                    value={commitment.risk || ''}
                    onChange={(e) => {
                      setCommitment({ ...commitment, risk: parseFloat(e.target.value) || 0 });
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Forecast Commitment Analysis
              </CardTitle>
              <CardDescription>
                Commitment level scoring and issue detection
              </CardDescription>
            </div>
            <Badge variant={commitmentScoreColor as any}>
              Commitment Score: {(analysis.scoring.commitmentScore * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Commitment Values */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Commit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analysis.commitment.commit)}</div>
                <div className="text-sm text-muted-foreground mt-1">High confidence (80%+)</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Best Case</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analysis.commitment.bestCase)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Optimistic scenario</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Upside</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analysis.commitment.upside)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Additional potential</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(analysis.commitment.risk)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">At-risk amount</div>
              </CardContent>
            </Card>
          </div>

          {/* Scoring */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Scoring</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Commitment Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analysis.scoring.commitmentScore * 100).toFixed(0)}%
                  </div>
                  <Progress value={analysis.scoring.commitmentScore * 100} className="mt-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sandbagging Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analysis.scoring.sandbaggingScore * 100).toFixed(0)}%
                  </div>
                  <Progress value={analysis.scoring.sandbaggingScore * 100} className="mt-2" />
                  {analysis.scoring.sandbaggingScore > 0.5 && (
                    <div className="text-xs text-destructive mt-1">High likelihood</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Happy Ears Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analysis.scoring.happyEarsScore * 100).toFixed(0)}%
                  </div>
                  <Progress value={analysis.scoring.happyEarsScore * 100} className="mt-2" />
                  {analysis.scoring.happyEarsScore > 0.5 && (
                    <div className="text-xs text-destructive mt-1">High likelihood</div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Accuracy Prediction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(analysis.scoring.accuracyPrediction * 100).toFixed(0)}%
                  </div>
                  <Progress value={analysis.scoring.accuracyPrediction * 100} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detection */}
          {(analysis.detection.sandbagging.detected || analysis.detection.happyEars.detected) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Issue Detection</h3>
              <div className="space-y-4">
                {analysis.detection.sandbagging.detected && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Sandbagging Detected</div>
                      <div className="text-sm">
                        Confidence: {(analysis.detection.sandbagging.confidence * 100).toFixed(0)}%
                      </div>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {analysis.detection.sandbagging.indicators.map((indicator, i) => (
                          <li key={i}>{indicator}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {analysis.detection.happyEars.detected && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Happy Ears Detected</div>
                      <div className="text-sm">
                        Confidence: {(analysis.detection.happyEars.confidence * 100).toFixed(0)}%
                      </div>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {analysis.detection.happyEars.indicators.map((indicator, i) => (
                          <li key={i}>{indicator}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
              <div className="space-y-4">
                {analysis.recommendations.map((rec, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{rec.description}</CardTitle>
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : rec.priority === 'medium'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <div className="mb-2">
                          <span className="font-medium">Type:</span> {rec.type}
                        </div>
                        <div>
                          <span className="font-medium">Expected Impact:</span> {rec.expectedImpact}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
