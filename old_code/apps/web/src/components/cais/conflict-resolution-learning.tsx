/**
 * Conflict Resolution Learning Component
 * Resolves conflicts between detection methods using learned strategies
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
  GitMerge,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Brain,
} from 'lucide-react';
import { useResolveConflict } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { ConflictResolution } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ConflictResolutionLearningProps {
  className?: string;
}

export function ConflictResolutionLearning({ className }: ConflictResolutionLearningProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [contextKey, setContextKey] = useState('');
  const [method1, setMethod1] = useState('');
  const [method2, setMethod2] = useState('');
  const [conflictType, setConflictType] = useState('');
  const [conflictDescription, setConflictDescription] = useState('');
  const [resolution, setResolution] = useState<ConflictResolution | null>(null);

  const {
    mutate: resolve,
    isPending: isResolving,
    error,
  } = useResolveConflict();

  const handleResolve = () => {
    if (!contextKey || !method1 || !method2 || !conflictType) return;

    resolve(
      {
        tenantId,
        contextKey,
        method1,
        method2,
        conflictType,
        conflictDescription: conflictDescription || undefined,
      },
      {
        onSuccess: (data) => {
          setResolution(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to resolve conflict', 3, {
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
            <GitMerge className="h-5 w-5" />
            Conflict Resolution Learning
          </CardTitle>
          <CardDescription>
            Resolve conflicts between detection methods using learned strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="context-key">Context Key</Label>
              <Input
                id="context-key"
                value={contextKey}
                onChange={(e) => setContextKey(e.target.value)}
                placeholder="e.g., opportunity:12345"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method1">Method 1</Label>
                <Input
                  id="method1"
                  value={method1}
                  onChange={(e) => setMethod1(e.target.value)}
                  placeholder="First detection method"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method2">Method 2</Label>
                <Input
                  id="method2"
                  value={method2}
                  onChange={(e) => setMethod2(e.target.value)}
                  placeholder="Second detection method"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conflict-type">Conflict Type</Label>
              <Input
                id="conflict-type"
                value={conflictType}
                onChange={(e) => setConflictType(e.target.value)}
                placeholder="e.g., detection_disagreement, value_mismatch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conflict-description">Conflict Description (Optional)</Label>
              <Textarea
                id="conflict-description"
                value={conflictDescription}
                onChange={(e) => setConflictDescription(e.target.value)}
                placeholder="Describe the conflict..."
                rows={4}
              />
            </div>

            <Button
              onClick={handleResolve}
              disabled={!contextKey || !method1 || !method2 || !conflictType || isResolving}
              className="w-full"
            >
              {isResolving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Resolve Conflict
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Resolution Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to resolve conflict'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {resolution && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conflict Resolution</CardTitle>
                  <CardDescription>Resolution strategy and reasoning</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Resolution ID</p>
                      <p className="text-sm font-mono">{resolution.resolutionId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Strategy</p>
                      <Badge variant="outline">{resolution.strategy}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${resolution.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{(resolution.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Reasoning
                    </h4>
                    <p className="text-sm text-muted-foreground">{resolution.reasoning}</p>
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
