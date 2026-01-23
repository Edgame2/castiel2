/**
 * Federated Learning Component
 * Displays federated learning rounds, contributions, and aggregation
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
  Network,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useStartFederatedLearningRound } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { FederatedLearning } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface FederatedLearningProps {
  className?: string;
}

export function FederatedLearning({ className }: FederatedLearningProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [modelType, setModelType] = useState('');
  const [roundConfig, setRoundConfig] = useState('');
  const [round, setRound] = useState<FederatedLearning | null>(null);

  const {
    mutate: startRound,
    isPending: isStarting,
    error,
  } = useStartFederatedLearningRound();

  const handleStartRound = () => {
    if (!modelType || !roundConfig) return;

    let roundConfigObj: any;
    try {
      roundConfigObj = JSON.parse(roundConfig);
    } catch (e) {
      roundConfigObj = { raw: roundConfig };
    }

    startRound(
      {
        tenantId,
        modelType,
        roundConfig: roundConfigObj,
      },
      {
        onSuccess: (data) => {
          setRound(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to start federated learning round', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Federated Learning
          </CardTitle>
          <CardDescription>
            Start federated learning rounds for collaborative model training
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-type">Model Type</Label>
              <Input
                id="model-type"
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                placeholder="e.g., risk_prediction, forecast_model"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="round-config">Round Configuration (JSON)</Label>
              <Textarea
                id="round-config"
                placeholder='Enter round configuration as JSON (e.g., {"epochs": 10, "batchSize": 32, "learningRate": 0.01})'
                value={roundConfig}
                onChange={(e) => setRoundConfig(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleStartRound}
              disabled={!modelType || !roundConfig || isStarting}
              className="w-full"
            >
              {isStarting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting Round...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Start Learning Round
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Round Start Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to start federated learning round'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {round && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Federated Learning Round</CardTitle>
                      <CardDescription>
                        Round status and contribution details
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(round.status)}
                      <Badge variant={getStatusVariant(round.status)} className="capitalize">
                        {round.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Round ID</p>
                      <p className="text-sm font-mono">{round.roundId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Model Type</p>
                      <Badge variant="outline">{round.modelType}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Contributors</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-semibold">{round.contributors}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Aggregated</p>
                      <div className="flex items-center gap-2">
                        {round.aggregated ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-semibold">{round.aggregated ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Started At</span>
                      <span className="text-sm">
                        {new Date(round.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {round.completedAt && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium">Completed At</span>
                        <span className="text-sm">
                          {new Date(round.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
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
