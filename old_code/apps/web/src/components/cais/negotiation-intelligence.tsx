/**
 * Negotiation Intelligence Component
 * Displays negotiation analysis and recommendations
 */

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Handshake,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { caisApi, type NegotiationAnalysis } from '@/lib/api/cais-services';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface NegotiationIntelligenceProps {
  opportunityId?: string;
  className?: string;
}

export function NegotiationIntelligence({ opportunityId, className }: NegotiationIntelligenceProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');
  const [proposal, setProposal] = useState({
    value: 0,
    terms: {} as Record<string, any>,
  });

  const {
    data: analysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['negotiation-intelligence', tenantId, localOpportunityId, proposal],
    queryFn: () => {
      if (!tenantId || !localOpportunityId || proposal.value === 0) {
        throw new Error('Missing required fields');
      }
      return caisApi.analyzeNegotiation({
        tenantId,
        opportunityId: localOpportunityId,
        proposal,
      });
    },
    enabled: !!tenantId && !!localOpportunityId && proposal.value > 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
            Failed to analyze negotiation. Please try again.
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
            <CardTitle>Negotiation Intelligence</CardTitle>
            <CardDescription>Enter negotiation details to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="opportunityId">Opportunity ID</Label>
                <Input
                  id="opportunityId"
                  value={localOpportunityId}
                  onChange={(e) => setLocalOpportunityId(e.target.value)}
                  placeholder="Enter opportunity ID"
                />
              </div>
              <div>
                <Label htmlFor="proposalValue">Proposal Value</Label>
                <Input
                  id="proposalValue"
                  type="number"
                  value={proposal.value || ''}
                  onChange={(e) => {
                    setProposal({ ...proposal, value: parseFloat(e.target.value) || 0 });
                  }}
                  placeholder="Enter proposal value"
                />
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
                <Handshake className="h-5 w-5" />
                Negotiation Intelligence
              </CardTitle>
              <CardDescription>
                Strategy recommendations and analysis
              </CardDescription>
            </div>
            <Badge variant="outline">
              Confidence: {(analysis.strategy.confidence * 100).toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Recommended Strategy */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Recommended Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Strategy</div>
                  <div className="text-lg font-bold">{analysis.strategy.recommended}</div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Reasoning</div>
                  <div className="text-sm text-muted-foreground">{analysis.strategy.reasoning}</div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Confidence</span>
                    <span className="text-sm font-medium">
                      {(analysis.strategy.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={analysis.strategy.confidence * 100} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tactics */}
          {analysis.tactics.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Recommended Tactics</h3>
              <div className="space-y-3">
                {analysis.tactics.map((tactic, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="text-sm">{tactic.tactic}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-medium mb-1">Timing</div>
                          <div className="text-sm text-muted-foreground">{tactic.timing}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Expected Impact</div>
                          <div className="text-sm text-muted-foreground">{tactic.expectedImpact}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Similar Negotiations */}
          {analysis.similarNegotiations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Similar Negotiations</h3>
              <div className="space-y-3">
                {analysis.similarNegotiations.map((similar, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Opportunity {similar.opportunityId}</CardTitle>
                        <Badge variant={similar.outcome === 'won' ? 'default' : 'destructive'}>
                          {similar.outcome === 'won' ? 'Won' : 'Lost'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-medium mb-1">Strategy</div>
                          <div className="text-sm text-muted-foreground">{similar.strategy}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Final Value</div>
                          <div className="text-lg font-semibold">{formatCurrency(similar.finalValue)}</div>
                        </div>
                        {similar.lessons.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-1">Lessons</div>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {similar.lessons.map((lesson, j) => (
                                <li key={j}>{lesson}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <Alert key={i}>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
