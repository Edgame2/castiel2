/**
 * Anomaly Detection Component
 * Detects and displays anomalies in opportunity data
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Send,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { useDetectAnomalies } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { AnomalyDetection } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface AnomalyDetectionProps {
  className?: string;
  opportunityId?: string;
}

export function AnomalyDetection({ className, opportunityId }: AnomalyDetectionProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');
  const [data, setData] = useState('');
  const [detectedData, setDetectedData] = useState<AnomalyDetection | null>(null);

  const {
    mutate: detect,
    isPending: isDetecting,
    error,
  } = useDetectAnomalies();

  const handleDetect = () => {
    if (!localOpportunityId || !data) return;

    let dataObj: Record<string, any>;
    try {
      dataObj = JSON.parse(data);
    } catch (e) {
      dataObj = { raw: data };
    }

    detect(
      {
        tenantId,
        opportunityId: localOpportunityId,
        data: dataObj,
      },
      {
        onSuccess: (result) => {
          setDetectedData(result);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to detect anomalies', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityVariant = (severity: string): 'default' | 'destructive' | 'secondary' => {
    switch (severity) {
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
            <Shield className="h-5 w-5" />
            Anomaly Detection
          </CardTitle>
          <CardDescription>
            Detect anomalies in opportunity data
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
              <Label htmlFor="data">Data (JSON)</Label>
              <Textarea
                id="data"
                placeholder='Enter opportunity data as JSON (e.g., {"field": "value", ...})'
                value={data}
                onChange={(e) => setData(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleDetect}
              disabled={!localOpportunityId || !data || isDetecting}
              className="w-full"
            >
              {isDetecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Detect Anomalies
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Detection Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to detect anomalies'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {detectedData && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Anomaly Detection Results</CardTitle>
                      <CardDescription>
                        Detected {detectedData.anomalies.length} anomaly(ies)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Overall Risk:</span>
                      <Badge variant={detectedData.overallRisk > 0.7 ? 'destructive' : detectedData.overallRisk > 0.4 ? 'secondary' : 'default'}>
                        {(detectedData.overallRisk * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detectedData.anomalies.length > 0 ? (
                    <div className="space-y-3">
                      {detectedData.anomalies.map((anomaly, idx) => (
                        <Card key={idx} className="border-l-4" style={{ borderLeftColor: getSeverityColor(anomaly.severity).replace('bg-', '') }}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className={cn('h-5 w-5', getSeverityColor(anomaly.severity))} />
                                <h4 className="font-semibold">{anomaly.field}</h4>
                              </div>
                              <Badge variant={getSeverityVariant(anomaly.severity)}>
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Detected Value:</p>
                                <p className="font-mono">{JSON.stringify(anomaly.value)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Expected Range:</p>
                                <p className="font-mono">
                                  {JSON.stringify(anomaly.expectedRange.min)} - {JSON.stringify(anomaly.expectedRange.max)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Description:</p>
                                <p>{anomaly.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold">No Anomalies Detected</p>
                      <p className="text-sm text-muted-foreground">
                        The opportunity data appears to be within expected ranges.
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Detection ID</span>
                      <span className="text-sm font-mono">{detectedData.detectionId}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium">Detected At</span>
                      <span className="text-sm">
                        {new Date(detectedData.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
