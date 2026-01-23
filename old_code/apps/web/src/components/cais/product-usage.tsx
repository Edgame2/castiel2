/**
 * Product Usage Component
 * Tracks and displays product usage intelligence
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
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  RefreshCw,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { useTrackProductUsage } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { ProductUsageIntelligence } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ProductUsageProps {
  className?: string;
  accountId?: string;
  opportunityId?: string;
}

export function ProductUsage({ className, accountId, opportunityId }: ProductUsageProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localAccountId, setLocalAccountId] = useState(accountId || '');
  const [eventType, setEventType] = useState('');
  const [eventData, setEventData] = useState('');
  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');
  const [intelligence, setIntelligence] = useState<ProductUsageIntelligence | null>(null);

  const {
    mutate: track,
    isPending: isTracking,
    error,
  } = useTrackProductUsage();

  const handleTrack = () => {
    if (!localAccountId || !eventType || !eventData) return;

    let eventDataObj: Record<string, any>;
    try {
      eventDataObj = JSON.parse(eventData);
    } catch (e) {
      eventDataObj = { raw: eventData };
    }

    track(
      {
        tenantId,
        accountId: localAccountId,
        eventType,
        eventData: eventDataObj,
        opportunityId: localOpportunityId || undefined,
      },
      {
        onSuccess: (data) => {
          setIntelligence(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to track product usage', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Usage Tracking
          </CardTitle>
          <CardDescription>
            Track product usage events for sales intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-id">Account ID</Label>
                <Input
                  id="account-id"
                  value={localAccountId}
                  onChange={(e) => setLocalAccountId(e.target.value)}
                  placeholder="Enter account ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type</Label>
                <Input
                  id="event-type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="e.g., feature_used, login, upgrade"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity-id">Opportunity ID (Optional)</Label>
              <Input
                id="opportunity-id"
                value={localOpportunityId}
                onChange={(e) => setLocalOpportunityId(e.target.value)}
                placeholder="Enter opportunity ID if applicable"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-data">Event Data (JSON)</Label>
              <Textarea
                id="event-data"
                placeholder='Enter event data as JSON (e.g., {"feature": "analytics", "usage": 100})'
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleTrack}
              disabled={!localAccountId || !eventType || !eventData || isTracking}
              className="w-full"
            >
              {isTracking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Track Usage
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Tracking Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to track product usage'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {intelligence && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Intelligence</CardTitle>
                  <CardDescription>Product usage patterns and insights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Adoption Rate</p>
                      <p className="text-2xl font-bold">
                        {(intelligence.insights.adoptionRate * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Churn Risk</p>
                      <p className="text-2xl font-bold">
                        {(intelligence.insights.churnRiskScore * 100).toFixed(0)}%
                      </p>
                      {intelligence.insights.churnRiskScore > 0.5 && (
                        <Badge variant="destructive" className="mt-1">High Risk</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Expansion Opportunity</p>
                      <p className="text-2xl font-bold">
                        {(intelligence.insights.expansionOpportunityScore * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Patterns Detected</p>
                      <p className="text-2xl font-bold">{intelligence.patterns.length}</p>
                    </div>
                  </div>

                  {intelligence.patterns.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Usage Patterns</h4>
                      <div className="space-y-2">
                        {intelligence.patterns.map((pattern, idx) => (
                          <Card key={idx} className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{pattern.patternType}</span>
                              <Badge variant="outline">{pattern.patternType}</Badge>
                            </div>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(pattern.pattern, null, 2)}
                            </pre>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {intelligence.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <div className="space-y-2">
                        {intelligence.recommendations.map((rec, idx) => (
                          <Card key={idx} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'default'}>
                                    {rec.priority}
                                  </Badge>
                                  <Badge variant="outline">{rec.type}</Badge>
                                </div>
                                <p className="text-sm">{rec.description}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
