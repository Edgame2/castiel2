'use client';

import { useState } from 'react';
import {
  useTenantIntegrations,
  useConnectionStatus,
  useTestConnection,
  useDisconnect,
  useConnectWithApiKey,
} from '@/hooks/use-integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Trash2,
  Key,
  Shield,
  Loader2,
} from 'lucide-react';
import type { TenantIntegration } from '@/types/integration.types';
import { toast } from 'sonner';

export default function ConnectionsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<TenantIntegration | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const { data: tenantIntegrations, isLoading } = useTenantIntegrations();
  const testConnection = useTestConnection();
  const disconnect = useDisconnect();
  const connectWithApiKey = useConnectWithApiKey();

  const handleTestConnection = async (integration: TenantIntegration) => {
    try {
      const result = await testConnection.mutateAsync(integration.id);
      
      if (result.success) {
        toast.success('Connection test successful', {
          description: `${integration.integrationId} is connected and responding`,
        });
      } else {
        toast.error('Connection test failed', {
          description: result.error || 'Unable to connect to integration',
        });
      }
    } catch (error) {
      toast.error('Test failed', {
        description: 'An error occurred while testing the connection',
      });
    }
  };

  const handleDisconnect = async () => {
    if (!selectedIntegration) return;

    try {
      await disconnect.mutateAsync({ integrationId: selectedIntegration.id });
      toast.success('Integration disconnected', {
        description: `${selectedIntegration.integrationId} has been disconnected`,
      });
      setDisconnectDialogOpen(false);
      setSelectedIntegration(null);
    } catch (error) {
      toast.error('Disconnect failed', {
        description: 'An error occurred while disconnecting',
      });
    }
  };

  const handleConnect = async () => {
    if (!selectedIntegration || !apiKey) return;

    try {
      await connectWithApiKey.mutateAsync({
        integrationId: selectedIntegration.id,
        apiKey,
      });
      toast.success('Connection successful', {
        description: `${selectedIntegration.integrationId} is now connected`,
      });
      setConfigDialogOpen(false);
      setSelectedIntegration(null);
      setApiKey('');
    } catch (error) {
      toast.error('Connection failed', {
        description: 'Invalid API key or configuration',
      });
    }
  };

  const openConfigDialog = (integration: TenantIntegration) => {
    setSelectedIntegration(integration);
    setConfigDialogOpen(true);
  };

  const openDisconnectDialog = (integration: TenantIntegration) => {
    setSelectedIntegration(integration);
    setDisconnectDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Connection Management</h2>
        <p className="text-muted-foreground">
          Configure and test integration connections
        </p>
      </div>

      {/* Connections Grid */}
      <div className="grid gap-4">
        {tenantIntegrations?.integrations.map(integration => (
          <Card key={integration.integrationId || integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    integration.status === 'connected' ? 'bg-green-500/10' :
                    integration.status === 'error' ? 'bg-red-500/10' :
                    'bg-gray-500/10'
                  }`}>
                    {integration.status === 'connected' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : integration.status === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <CardTitle>{integration.integrationId}</CardTitle>
                    <CardDescription>
                      {integration.status === 'connected' 
                        ? 'Active connection' 
                        : integration.status === 'error'
                        ? 'Connection error'
                        : 'Not configured'}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant="outline"
                  className={
                    integration.status === 'connected' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    integration.status === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-gray-500/10 text-gray-500 border-gray-500/20'
                  }
                >
                  {integration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Connection Details */}
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last sync:</span>
                    <span className="font-medium">
                      {integration.lastSyncAt 
                        ? new Date(integration.lastSyncAt).toLocaleString() 
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Authentication:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {integration.settings?.authType || 'API Key'}
                    </span>
                  </div>
                  {integration.settings?.endpoint && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Endpoint:</span>
                      <span className="font-medium text-xs">
                        {integration.settings.endpoint}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {integration.status === 'connected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(integration)}
                      disabled={testConnection.isPending}
                    >
                      {testConnection.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-2">Test Connection</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openConfigDialog(integration)}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="ml-2">Configure</span>
                  </Button>
                  {integration.status === 'connected' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDisconnectDialog(integration)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2">Disconnect</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tenantIntegrations?.integrations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No integrations enabled</h3>
              <p className="text-muted-foreground mb-4">
                Enable integrations to manage connections
              </p>
              <Button asChild>
                <a href="/integrations">Browse Integrations</a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {selectedIntegration?.integrationId}</DialogTitle>
            <DialogDescription>
              Update connection settings and credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is encrypted and stored securely in Azure Key Vault
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={!apiKey || connectWithApiKey.isPending}>
              {connectWithApiKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {selectedIntegration?.integrationId}? 
              This will stop all active syncs and remove stored credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisconnect}
              className="bg-red-500 hover:bg-red-600"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
