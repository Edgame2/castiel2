/**
 * Social Signal Component
 * Processes and displays social signals for sales intelligence
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Share2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Signal,
} from 'lucide-react';
import { useProcessSocialSignal } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { SocialSignal } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface SocialSignalProps {
  className?: string;
  opportunityId?: string;
}

export function SocialSignal({ className, opportunityId }: SocialSignalProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [source, setSource] = useState('');
  const [signalType, setSignalType] = useState('');
  const [content, setContent] = useState('');
  const [localOpportunityId, setLocalOpportunityId] = useState(opportunityId || '');
  const [processedData, setProcessedData] = useState<SocialSignal | null>(null);

  const {
    mutate: process,
    isPending: isProcessing,
    error,
  } = useProcessSocialSignal();

  const handleProcess = () => {
    if (!source || !signalType || !content) return;

    try {
      const contentObj = JSON.parse(content);
      process(
        {
          tenantId,
          source,
          signalType,
          content: contentObj,
          opportunityId: localOpportunityId || undefined,
        },
        {
          onSuccess: (data) => {
            setProcessedData(data);
          },
          onError: (err) => {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace('Failed to process social signal', 3, {
              errorMessage: errorObj.message,
              tenantId,
              source,
              signalType,
            })
          },
        }
      );
    } catch (e) {
      // If not valid JSON, treat as plain text
      process(
        {
          tenantId,
          source,
          signalType,
          content: { text: content },
          opportunityId: localOpportunityId || undefined,
        },
        {
          onSuccess: (data) => {
            setProcessedData(data);
          },
          onError: (err) => {
            const errorObj = err instanceof Error ? err : new Error(String(err))
            trackException(errorObj, 3)
            trackTrace('Failed to process social signal', 3, {
              errorMessage: errorObj.message,
              tenantId,
              source,
              signalType,
            })
          },
        }
      );
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            Social Signal Processing
          </CardTitle>
          <CardDescription>
            Process external social signals for sales intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., LinkedIn, Twitter, News"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signal-type">Signal Type</Label>
                <Select value={signalType} onValueChange={setSignalType}>
                  <SelectTrigger id="signal-type">
                    <SelectValue placeholder="Select signal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="risk">Risk</SelectItem>
                  </SelectContent>
                </Select>
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
              <Label htmlFor="content">Content (JSON or Text)</Label>
              <Textarea
                id="content"
                placeholder='Enter signal content as JSON (e.g., {"text": "...", "url": "..."}) or plain text'
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleProcess}
              disabled={!source || !signalType || !content || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Process Signal
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Processing Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to process social signal'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {processedData && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Processed Signal</CardTitle>
                  <CardDescription>Signal processing results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Signal ID</p>
                      <p className="text-sm font-mono">{processedData.signalId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Source</p>
                      <Badge variant="outline">{processedData.source}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Signal Type</p>
                      <Badge variant="secondary">{processedData.signalType}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Processed At</p>
                      <p className="text-sm">
                        {new Date(processedData.processedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {processedData.opportunityId && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Opportunity ID</p>
                      <p className="text-sm font-mono">{processedData.opportunityId}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Content</p>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
                      {JSON.stringify(processedData.content, null, 2)}
                    </pre>
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
