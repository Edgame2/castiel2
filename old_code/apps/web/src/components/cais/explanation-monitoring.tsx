/**
 * Explanation Monitoring Component
 * Tracks explanation usage and monitoring metrics
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Eye,
  X,
  MessageSquare,
  RefreshCw,
  Send,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { useTrackExplanationUsage } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { ExplanationMonitoring } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ExplanationMonitoringProps {
  className?: string;
  explanationId?: string;
}

export function ExplanationMonitoring({ className, explanationId }: ExplanationMonitoringProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';
  const userId = user?.id || '';

  const [localExplanationId, setLocalExplanationId] = useState(explanationId || '');
  const [action, setAction] = useState<'viewed' | 'dismissed' | 'feedback'>('viewed');
  const [feedback, setFeedback] = useState('');
  const [trackedData, setTrackedData] = useState<ExplanationMonitoring | null>(null);

  const {
    mutate: track,
    isPending: isTracking,
    error,
  } = useTrackExplanationUsage();

  const handleTrack = () => {
    if (!localExplanationId) return;

    let feedbackObj: any = undefined;
    if (action === 'feedback' && feedback) {
      try {
        feedbackObj = JSON.parse(feedback);
      } catch (e) {
        feedbackObj = { comment: feedback };
      }
    }

    track(
      {
        tenantId,
        explanationId: localExplanationId,
        userId,
        action,
        feedback: feedbackObj,
      },
      {
        onSuccess: (data) => {
          setTrackedData(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to track explanation usage', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'viewed':
        return Eye;
      case 'dismissed':
        return X;
      case 'feedback':
        return MessageSquare;
      default:
        return BarChart3;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Explanation Usage Tracking
          </CardTitle>
          <CardDescription>
            Track how users interact with AI explanations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="explanation-id">Explanation ID</Label>
              <Input
                id="explanation-id"
                value={localExplanationId}
                onChange={(e) => setLocalExplanationId(e.target.value)}
                placeholder="Enter explanation ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select value={action} onValueChange={(value: any) => setAction(value)}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action === 'feedback' && (
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback (JSON or Text)</Label>
                <Textarea
                  id="feedback"
                  placeholder='Enter feedback as JSON or plain text'
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <Button
              onClick={handleTrack}
              disabled={!localExplanationId || isTracking}
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
                  : (handleApiError(error) as any).message || 'Failed to track explanation usage'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {trackedData && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Tracking Result</CardTitle>
                  <CardDescription>Explanation usage tracking confirmation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Tracking ID</p>
                      <p className="text-sm font-mono">{trackedData.trackingId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Action</p>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = getActionIcon(trackedData.action);
                          return <Icon className="h-4 w-4" />;
                        })()}
                        <Badge variant="outline" className="capitalize">{trackedData.action}</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Explanation ID</p>
                      <p className="text-sm font-mono">{trackedData.explanationId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Tracked At</p>
                      <p className="text-sm">
                        {new Date(trackedData.trackedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {trackedData.feedback && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Feedback</p>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
                        {JSON.stringify(trackedData.feedback, null, 2)}
                      </pre>
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
