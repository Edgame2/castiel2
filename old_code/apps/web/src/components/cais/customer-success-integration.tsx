/**
 * Customer Success Integration Component
 * Integrates customer success data with sales intelligence
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
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useIntegrateCustomerSuccess } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { CustomerSuccessIntegration } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface CustomerSuccessIntegrationProps {
  className?: string;
  accountId?: string;
}

export function CustomerSuccessIntegration({ className, accountId }: CustomerSuccessIntegrationProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [localAccountId, setLocalAccountId] = useState(accountId || '');
  const [csData, setCsData] = useState('');
  const [integration, setIntegration] = useState<CustomerSuccessIntegration | null>(null);

  const {
    mutate: integrate,
    isPending: isIntegrating,
    error,
  } = useIntegrateCustomerSuccess();

  const handleIntegrate = () => {
    if (!localAccountId || !csData) return;

    let csDataObj: any;
    try {
      csDataObj = JSON.parse(csData);
    } catch (e) {
      csDataObj = { raw: csData };
    }

    integrate(
      {
        tenantId,
        accountId: localAccountId,
        csData: csDataObj,
      },
      {
        onSuccess: (data) => {
          setIntegration(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to integrate customer success data', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getAlignmentIcon = (alignment: string) => {
    switch (alignment) {
      case 'aligned':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'misaligned':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Success Integration
          </CardTitle>
          <CardDescription>
            Integrate customer success data with sales intelligence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
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
              <Label htmlFor="cs-data">Customer Success Data (JSON)</Label>
              <Textarea
                id="cs-data"
                placeholder='Enter CS data as JSON (e.g., {"healthScore": 0.8, "usage": {...}, "supportTickets": [...]})'
                value={csData}
                onChange={(e) => setCsData(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleIntegrate}
              disabled={!localAccountId || !csData || isIntegrating}
              className="w-full"
            >
              {isIntegrating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Integrating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Integrate CS Data
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Integration Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to integrate customer success data'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {integration && (
            <div className="space-y-4 mt-6">
              {/* Alignment */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales-CS Alignment</CardTitle>
                  <CardDescription>Alignment between sales and customer success activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 border rounded-lg">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      {getAlignmentIcon(integration.alignment.level)}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Alignment Level</p>
                        <p className="text-2xl font-bold capitalize">{integration.alignment.level}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Alignment Score</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${integration.alignment.score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{(integration.alignment.score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {integration.alignment.factors.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Alignment Factors</p>
                      <div className="space-y-1">
                        {integration.alignment.factors.map((factor, idx) => (
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

              {/* Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Health</CardTitle>
                  <CardDescription>Overall account health metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Overall Health</p>
                      <p className="text-2xl font-bold">{(integration.health.overall * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Sales Activity</p>
                      <Badge variant="outline" className="capitalize">
                        {integration.health.salesActivity}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">CS Activity</p>
                      <Badge variant="outline" className="capitalize">
                        {integration.health.csActivity}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Insights</CardTitle>
                  <CardDescription>Key insights and recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{integration.insights.summary}</p>
                  </div>

                  {integration.insights.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {integration.insights.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Integration ID</span>
                  <span className="text-sm font-mono">{integration.integrationId}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium">Integrated At</span>
                  <span className="text-sm">
                    {new Date(integration.integratedAt).toLocaleString()}
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
