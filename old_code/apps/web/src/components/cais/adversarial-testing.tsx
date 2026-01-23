/**
 * Adversarial Testing Component
 * Displays test results, vulnerabilities, and robustness metrics
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
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  TestTube,
} from 'lucide-react';
import { useRunAdversarialTest } from '@/hooks/use-cais-services';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { handleApiError } from '@/lib/api/client';
import type { AdversarialTestResult } from '@/lib/api/cais-services';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface AdversarialTestingProps {
  className?: string;
}

export function AdversarialTesting({ className }: AdversarialTestingProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId || '';

  const [testType, setTestType] = useState<'input_perturbation' | 'stress_test' | 'gaming_detection'>('input_perturbation');
  const [target, setTarget] = useState('');
  const [parameters, setParameters] = useState('');
  const [testResult, setTestResult] = useState<AdversarialTestResult | null>(null);

  const {
    mutate: runTest,
    isPending: isTesting,
    error,
  } = useRunAdversarialTest();

  const handleRunTest = () => {
    if (!target) return;

    let parametersObj: Record<string, any> | undefined = undefined;
    if (parameters) {
      try {
        parametersObj = JSON.parse(parameters);
      } catch (e) {
        parametersObj = { raw: parameters };
      }
    }

    runTest(
      {
        tenantId,
        testType,
        target,
        parameters: parametersObj,
      },
      {
        onSuccess: (data) => {
          setTestResult(data);
        },
        onError: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          trackException(errorObj, 3)
          trackTrace('Failed to run adversarial test', 3, {
            errorMessage: errorObj.message,
            tenantId,
          })
        },
      }
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600';
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
      case 'critical':
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
            <TestTube className="h-5 w-5" />
            Adversarial Testing
          </CardTitle>
          <CardDescription>
            Run adversarial tests to detect vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-type">Test Type</Label>
                <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                  <SelectTrigger id="test-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="input_perturbation">Input Perturbation</SelectItem>
                    <SelectItem value="stress_test">Stress Test</SelectItem>
                    <SelectItem value="gaming_detection">Gaming Detection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g., risk_evaluation, forecast_model"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parameters">Parameters (JSON, Optional)</Label>
              <Textarea
                id="parameters"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder='Enter test parameters as JSON (e.g., {"perturbationLevel": 0.1})'
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleRunTest}
              disabled={!target || isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Test Failed</AlertTitle>
              <AlertDescription>
                {typeof handleApiError(error) === 'string'
                  ? handleApiError(error)
                  : (handleApiError(error) as any).message || 'Failed to run adversarial test'}
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {testResult && (
            <div className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Test Results</CardTitle>
                      <CardDescription>
                        Adversarial test execution results
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {testResult.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <Badge variant={testResult.passed ? 'default' : 'destructive'}>
                        {testResult.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {testResult.vulnerabilities.length > 0 ? (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Vulnerabilities Detected ({testResult.vulnerabilities.length})
                      </h4>
                      <div className="space-y-3">
                        {testResult.vulnerabilities.map((vuln, idx) => (
                          <Card key={idx} className="border-l-4" style={{ borderLeftColor: getSeverityColor(vuln.severity).replace('bg-', '') }}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h5 className="font-semibold">{vuln.type}</h5>
                                  <p className="text-sm text-muted-foreground">{vuln.description}</p>
                                </div>
                                <Badge variant={getSeverityVariant(vuln.severity)}>
                                  {vuln.severity}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold">No Vulnerabilities Detected</p>
                      <p className="text-sm text-muted-foreground">
                        The system passed all adversarial tests.
                      </p>
                    </div>
                  )}

                  {Object.keys(testResult.metrics).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Test Metrics</h4>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48">
                        {JSON.stringify(testResult.metrics, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Test ID</span>
                      <span className="text-sm font-mono">{testResult.testId}</span>
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
