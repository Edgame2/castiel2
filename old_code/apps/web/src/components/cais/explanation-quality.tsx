/**
 * Explanation Quality Component
 * Assesses and displays explanation quality metrics
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
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  TrendingUp,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAssessExplanationQuality } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { ExplanationQuality } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface ExplanationQualityProps {
  className?: string;
  explanationId?: string;
}

export function ExplanationQuality({ className, explanationId }: ExplanationQualityProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localExplanationId, setLocalExplanationId] = useState(explanationId || '');
  const [explanation, setExplanation] = useState('');
  const [quality, setQuality] = useState<ExplanationQuality | null>(null);

  const {
    mutate: assess,
    isPending: isAssessing,
    error,
  } = useAssessExplanationQuality();

  const handleAssess = () => {
    if (!localExplanationId || !explanation) return;

    let explanationObj: any;
    try {
      explanationObj = JSON.parse(explanation);
    } catch (e) {
      explanationObj = { text: explanation };
    }

    assess(
      {
        tenantId,
        explanation: explanationObj,
        explanationId: localExplanationId,
      },
      {
        onSuccess: (data) => {
          setQuality(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to assess explanation quality', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreVariant = (score: number): 'default' | 'destructive' | 'secondary' => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Explanation Quality Assessment
          </CardTitle>
          <CardDescription>
            Assess the quality of AI explanations
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
              <Label htmlFor="explanation">Explanation (JSON or Text)</Label>
              <Textarea
                id="explanation"
                placeholder='Enter explanation as JSON or plain text'
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleAssess}
              disabled={!localExplanationId || !explanation || isAssessing}
              className="w-full"
            >
              {isAssessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assessing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Assess Quality
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Assessment Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to assess explanation quality'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {quality && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quality Assessment Results</CardTitle>
                  <CardDescription>
                    Explanation quality scores and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Score */}
                  <div className="text-center p-6 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Overall Quality</p>
                    <div className="flex items-center justify-center gap-4">
                      <div className={cn('text-4xl font-bold', getScoreColor(quality.scores.overall))}>
                        {(quality.scores.overall * 100).toFixed(0)}%
                      </div>
                      <Badge variant={getScoreVariant(quality.scores.overall)}>
                        {quality.style}
                      </Badge>
                    </div>
                    <Progress value={quality.scores.overall * 100} className="mt-4" />
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(quality.scores).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{key}</span>
                          <span className={cn('text-sm font-bold', getScoreColor(value))}>
                            {(value * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={value * 100} className="h-2" />
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Quality ID</span>
                      <span className="text-sm font-mono">{quality.qualityId}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium">Assessed At</span>
                      <span className="text-sm">
                        {new Date(quality.createdAt).toLocaleString()}
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
