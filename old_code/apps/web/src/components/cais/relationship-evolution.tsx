/**
 * Relationship Evolution Component
 * Tracks relationship evolution and health over time
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Send,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { useTrackRelationshipEvolution } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { RelationshipEvolution } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface RelationshipEvolutionProps {
  className?: string;
  sourceShardId?: string;
  targetShardId?: string;
}

export function RelationshipEvolution({ className, sourceShardId, targetShardId }: RelationshipEvolutionProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localSourceShardId, setLocalSourceShardId] = useState(sourceShardId || '');
  const [localTargetShardId, setLocalTargetShardId] = useState(targetShardId || '');
  const [relationshipType, setRelationshipType] = useState('');
  const [evolution, setEvolution] = useState<RelationshipEvolution | null>(null);

  const {
    mutate: track,
    isPending: isTracking,
    error,
  } = useTrackRelationshipEvolution();

  const handleTrack = () => {
    if (!localSourceShardId || !localTargetShardId || !relationshipType) return;

    track(
      {
        tenantId,
        sourceShardId: localSourceShardId,
        targetShardId: localTargetShardId,
        relationshipType,
      },
      {
        onSuccess: (data) => {
          setEvolution(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to track relationship evolution', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 0.7) return 'text-green-500';
    if (score >= 0.4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Relationship Evolution Tracking
          </CardTitle>
          <CardDescription>
            Track relationship evolution and health over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-shard-id">Source Shard ID</Label>
                <Input
                  id="source-shard-id"
                  value={localSourceShardId}
                  onChange={(e) => setLocalSourceShardId(e.target.value)}
                  placeholder="Enter source shard ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-shard-id">Target Shard ID</Label>
                <Input
                  id="target-shard-id"
                  value={localTargetShardId}
                  onChange={(e) => setLocalTargetShardId(e.target.value)}
                  placeholder="Enter target shard ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship-type">Relationship Type</Label>
              <Input
                id="relationship-type"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                placeholder="e.g., customer, partner, competitor"
              />
            </div>

            <Button
              onClick={handleTrack}
              disabled={!localSourceShardId || !localTargetShardId || !relationshipType || isTracking}
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
                  Track Evolution
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
                  : (handleApiError(error) as any).message || 'Failed to track relationship evolution'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {evolution && (
            <div className="space-y-4 mt-6">
              {/* Health Score */}
              <Card>
                <CardHeader>
                  <CardTitle>Relationship Health</CardTitle>
                  <CardDescription>Current relationship health metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 border rounded-lg">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      {getTrendIcon(evolution.health.trend)}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                        <p className={cn('text-4xl font-bold', getHealthColor(evolution.health.score))}>
                          {(evolution.health.score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">{evolution.health.trend}</Badge>
                  </div>

                  {evolution.health.factors.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Health Factors</p>
                      <div className="space-y-1">
                        {evolution.health.factors.map((factor, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span>{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Evolution Changes */}
              {evolution.evolution.changes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evolution Changes</CardTitle>
                    <CardDescription>Relationship changes over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {evolution.evolution.changes.map((change, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{change.change}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(change.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={change.impact > 0.5 ? 'default' : change.impact > 0.2 ? 'secondary' : 'outline'}>
                              Impact: {(change.impact * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Patterns */}
              {evolution.evolution.patterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evolution Patterns</CardTitle>
                    <CardDescription>Detected relationship patterns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {evolution.evolution.patterns.map((pattern, idx) => (
                        <Badge key={idx} variant="outline">{pattern}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Evolution ID</span>
                  <span className="text-sm font-mono">{evolution.evolutionId}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium">Tracked At</span>
                  <span className="text-sm">
                    {new Date(evolution.trackedAt).toLocaleString()}
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
