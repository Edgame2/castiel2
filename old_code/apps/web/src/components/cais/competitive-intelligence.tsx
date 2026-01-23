/**
 * Competitive Intelligence Component
 * Analyzes competitive intelligence and provides threat detection
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Target,
  AlertTriangle,
  TrendingUp,
  Shield,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { useAnalyzeCompetition } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { CompetitiveIntelligence } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface CompetitiveIntelligenceProps {
  className?: string;
  opportunityId?: string;
}

export function CompetitiveIntelligence({ className, opportunityId }: CompetitiveIntelligenceProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');
  const [competitorData, setCompetitorData] = useState('');
  const [intelligence, setIntelligence] = useState<CompetitiveIntelligence | null>(null);

  const {
    mutate: analyze,
    isPending: isAnalyzing,
    error,
  } = useAnalyzeCompetition();

  const handleAnalyze = () => {
    if (!localOpportunityId || !competitorData) return;

    let competitorDataObj: any;
    try {
      competitorDataObj = JSON.parse(competitorData);
    } catch (e) {
      competitorDataObj = { raw: competitorData };
    }

    analyze(
      {
        tenantId,
        opportunityId: localOpportunityId,
        competitorData: competitorDataObj,
      },
      {
        onSuccess: (data) => {
          setIntelligence(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to analyze competitive intelligence', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getThreatLevelVariant = (level: string): 'default' | 'destructive' | 'secondary' => {
    switch (level) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitive Intelligence
          </CardTitle>
          <CardDescription>
            Analyze competitive intelligence and detect threats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="opportunity-id">Opportunity ID</Label>
              <Input
                id="opportunity-id"
                value={localOpportunityId}
                onChange={(e) => setLocalOpportunityId(e.target.value)}
                placeholder="Enter opportunity ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor-data">Competitor Data (JSON)</Label>
              <Textarea
                id="competitor-data"
                placeholder='Enter competitor data as JSON (e.g., {"competitor": "Company X", "products": [...], "pricing": {...}})'
                value={competitorData}
                onChange={(e) => setCompetitorData(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!localOpportunityId || !competitorData || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Analyze Competition
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to analyze competitive intelligence'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {intelligence && (
            <div className="space-y-4 mt-6">
              {/* Threats */}
              {intelligence.threats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Threats Detected
                    </CardTitle>
                    <CardDescription>
                      {intelligence.threats.length} competitive threat(s) identified
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {intelligence.threats.map((threat, idx) => (
                      <Card key={idx} className="border-l-4" style={{ borderLeftColor: getThreatLevelColor(threat.threatLevel).replace('bg-', '') }}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{threat.competitor}</h4>
                              <p className="text-sm text-muted-foreground">{threat.description}</p>
                            </div>
                            <Badge variant={getThreatLevelVariant(threat.threatLevel)}>
                              {threat.threatLevel}
                            </Badge>
                          </div>
                          {threat.evidence.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Evidence:</p>
                              <ul className="list-disc list-inside text-xs space-y-1">
                                {threat.evidence.map((ev, evIdx) => (
                                  <li key={evIdx}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Positioning */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Market Positioning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Our Position</p>
                    <p className="font-semibold">{intelligence.positioning.ourPosition}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Market Position</p>
                    <p className="font-semibold">{intelligence.positioning.marketPosition}</p>
                  </div>
                  {intelligence.positioning.differentiators.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Differentiators</p>
                      <div className="flex flex-wrap gap-2">
                        {intelligence.positioning.differentiators.map((diff, idx) => (
                          <Badge key={idx} variant="outline">{diff}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recommendations */}
              {intelligence.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>Actionable recommendations based on competitive analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {intelligence.recommendations.map((rec, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'default'}>
                                  {rec.priority}
                                </Badge>
                              </div>
                              <p className="font-medium">{rec.action}</p>
                              <p className="text-sm text-muted-foreground mt-1">{rec.rationale}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Intelligence ID</span>
                  <span className="text-sm font-mono">{intelligence.intelligenceId}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium">Analyzed At</span>
                  <span className="text-sm">
                    {new Date(intelligence.analyzedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
