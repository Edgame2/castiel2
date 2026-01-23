'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import type { IntegrationDocument, IntegrationProviderDocument } from '@/types/integration';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface IntegrationConnectionFormProps {
  integration: IntegrationDocument;
  provider: IntegrationProviderDocument;
  onConnect?: () => void;
  onTest?: () => Promise<{ success: boolean; error?: string }>;
}

export function IntegrationConnectionForm({
  integration,
  provider,
  onConnect,
  onTest,
}: IntegrationConnectionFormProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleOAuthConnect = async () => {
    if (provider.authType !== 'oauth2') {
      return;
    }

    setIsConnecting(true);
    try {
      // Get token from httpOnly cookies
      const tokenResponse = await fetch('/api/auth/token', { credentials: 'include' })
      const tokenData = tokenResponse.ok ? await tokenResponse.json() : null
      const token = tokenData?.token || ''

      // Start OAuth flow
      const response = await fetch(`/api/integrations/${integration.id}/oauth/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (response.ok) {
        const { authorizationUrl } = await response.json();
        if (authorizationUrl && authorizationUrl !== '#') {
          toast.info('Redirecting to OAuth provider', {
            description: 'You will be redirected to authorize the connection.',
          });
          // Redirect to OAuth provider
          window.location.href = authorizationUrl;
        } else {
          throw new Error('OAuth flow not yet fully implemented');
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start OAuth flow');
      }
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('OAuth connection failed', 3, {
        errorMessage: errorObj.message,
        providerId: provider.id,
        integrationId: integration?.id,
      })
      toast.error('OAuth connection failed', {
        description: error.message || 'Failed to start OAuth connection. Please try again.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApiKeyConnect = async () => {
    // For API key auth, show a form to enter the key
    // This would typically be handled in a modal or separate step
    onConnect?.();
  };

  const handleTestConnection = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTest();
      setTestResult(result);
      if (result.success) {
        toast.success('Connection test successful', {
          description: 'The integration connection is working correctly.',
        });
      } else {
        toast.error('Connection test failed', {
          description: result.error || 'Unable to connect to the integration.',
        });
      }
    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message || 'Connection test failed',
      };
      setTestResult(errorResult);
      toast.error('Connection test failed', {
        description: error.message || 'An error occurred while testing the connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getConnectionStatus = () => {
    if (integration.connectionStatus === 'active') {
      return { status: 'connected', icon: CheckCircle2, color: 'text-green-600' };
    }
    if (integration.connectionStatus === 'error') {
      return { status: 'error', icon: XCircle, color: 'text-red-600' };
    }
    return { status: 'not_connected', icon: null, color: 'text-muted-foreground' };
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection</CardTitle>
        <CardDescription>
          Connect to {provider.displayName} to enable data synchronization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            {StatusIcon && <StatusIcon className={`h-5 w-5 ${connectionStatus.color}`} />}
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-xs text-muted-foreground capitalize">
                {connectionStatus.status.replace('_', ' ')}
              </p>
            </div>
          </div>
          {integration.lastConnectionTestAt && (
            <p className="text-xs text-muted-foreground">
              Last tested:{' '}
              {new Date(integration.lastConnectionTestAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Auth Type Specific Actions */}
        {provider.authType === 'oauth2' && (
          <div className="space-y-2">
            <Button
              onClick={handleOAuthConnect}
              disabled={isConnecting || integration.connectionStatus === 'active'}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with OAuth
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              You will be redirected to {provider.displayName} to authorize the connection.
            </p>
          </div>
        )}

        {provider.authType === 'api_key' && (
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="Enter your API key"
              disabled={integration.connectionStatus === 'active'}
            />
            <Button
              onClick={handleApiKeyConnect}
              disabled={integration.connectionStatus === 'active'}
              className="w-full"
            >
              Save API Key
            </Button>
          </div>
        )}

        {/* Test Connection */}
        {integration.connectionStatus === 'active' && onTest && (
          <div className="space-y-2">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  {testResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Connection test successful
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {testResult.error || 'Connection test failed'}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Connection Info */}
        {integration.credentialSecretName && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium mb-1">Credential Reference</p>
            <p className="text-xs text-muted-foreground font-mono">
              {integration.credentialSecretName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}







