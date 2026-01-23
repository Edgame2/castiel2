/**
 * Self Healing Component
 * Displays self-healing actions and remediation status
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
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useDetectAndRemediate } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { SelfHealing } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface SelfHealingProps {
  className?: string;
}

export function SelfHealing({ className }: SelfHealingProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [issueType, setIssueType] = useState('');
  const [issueData, setIssueData] = useState('');
  const [remediation, setRemediation] = useState<SelfHealing | null>(null);

  const {
    mutate: remediate,
    isPending: isRemediating,
    error,
  } = useDetectAndRemediate();

  const handleRemediate = () => {
    if (!issueType || !issueData) return;

    let issueDataObj: any;
    try {
      issueDataObj = JSON.parse(issueData);
    } catch (e) {
      issueDataObj = { raw: issueData };
    }

    remediate(
      {
        tenantId,
        issueType,
        issueData: issueDataObj,
      },
      {
        onSuccess: (data) => {
          setRemediation(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to detect and remediate', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Self Healing
          </CardTitle>
          <CardDescription>
            Automatically detect and remediate issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-type">Issue Type</Label>
              <Input
                id="issue-type"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                placeholder="e.g., data_quality, performance, configuration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-data">Issue Data (JSON)</Label>
              <Textarea
                id="issue-data"
                placeholder='Enter issue data as JSON (e.g., {"description": "...", "severity": "high"})'
                value={issueData}
                onChange={(e) => setIssueData(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleRemediate}
              disabled={!issueType || !issueData || isRemediating}
              className="w-full"
            >
              {isRemediating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Remediating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Detect and Remediate
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Remediation Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to detect and remediate issues'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {remediation && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Remediation Results</CardTitle>
                      <CardDescription>
                        Issue detection and remediation status
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {remediation.detected && (
                        <Badge variant={remediation.remediated ? 'default' : 'secondary'}>
                          {remediation.remediated ? 'Remediated' : 'Detected'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Issue Detected</p>
                      <div className="flex items-center gap-2">
                        {remediation.detected ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-500" />
                        )}
                        <span className="font-semibold">{remediation.detected ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Remediated</p>
                      <div className="flex items-center gap-2">
                        {remediation.remediated ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                        <span className="font-semibold">{remediation.remediated ? 'Yes' : 'Pending'}</span>
                      </div>
                    </div>
                  </div>

                  {remediation.actions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Remediation Actions</h4>
                      <div className="space-y-2">
                        {remediation.actions.map((action, idx) => (
                          <Card key={idx} className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 flex-1">
                                {getActionStatusIcon(action.status)}
                                <div className="flex-1">
                                  <p className="font-medium">{action.action}</p>
                                  {action.result && (
                                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                                      {JSON.stringify(action.result, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                              <Badge variant={action.status === 'completed' ? 'default' : action.status === 'failed' ? 'destructive' : 'secondary'}>
                                {action.status}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Remediation ID</span>
                      <span className="text-sm font-mono">{remediation.remediationId}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium">Detected At</span>
                      <span className="text-sm">
                        {new Date(remediation.detectedAt).toLocaleString()}
                      </span>
                    </div>
                    {remediation.remediatedAt && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium">Remediated At</span>
                        <span className="text-sm">
                          {new Date(remediation.remediatedAt).toLocaleString()}
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
