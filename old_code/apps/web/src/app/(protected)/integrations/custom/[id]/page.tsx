'use client';

/**
 * Custom Integration Edit Page
 * Edit integration settings, configure endpoints, test, and activate
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  useCustomIntegration, 
  useUpdateCustomIntegration, 
  useTestConnection, 
  useTestEndpoint,
  useWebhookUrl,
  useRegenerateWebhookSecret,
} from '@/hooks/use-custom-integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  TestTube2, 
  Play, 
  Copy, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings,
  Code,
  Webhook,
  Link as LinkIcon,
} from 'lucide-react';
import { CustomEndpoint } from '@/lib/api/custom-integrations';

export default function EditCustomIntegrationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: integration, isLoading, error } = useCustomIntegration(id);
  const { data: webhookUrlData } = useWebhookUrl(integration?.integrationType === 'webhook' ? id : undefined);
  const updateIntegration = useUpdateCustomIntegration();
  const testConnection = useTestConnection();
  const testEndpoint = useTestEndpoint();
  const regenerateSecret = useRegenerateWebhookSecret();

  const [endpoints, setEndpoints] = useState<CustomEndpoint[]>([]);
  const [editingEndpoint, setEditingEndpoint] = useState<CustomEndpoint | null>(null);
  const [endpointDialogOpen, setEndpointDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (integration) {
      setEndpoints(integration.endpoints || []);
      setIsActive(integration.status === 'active');
    }
  }, [integration]);

  const handleSave = async () => {
    await updateIntegration.mutateAsync({
      id,
      data: {
        endpoints: endpoints as any,
        status: isActive ? 'active' : 'inactive',
      },
    });
  };

  const handleTest = async () => {
    const result = await testConnection.mutateAsync(id);
    setTestResult(result);
  };

  const handleTestEndpoint = async (endpointId: string) => {
    const result = await testEndpoint.mutateAsync({
      integrationId: id,
      endpointId,
    });
    setTestResult(result);
  };

  const addEndpoint = () => {
    const newEndpoint: CustomEndpoint = {
      id: `ep_${Date.now()}`,
      name: 'New Endpoint',
      method: 'GET',
      path: '/',
      responseMapping: {
        dataPath: '$',
        fieldMappings: [],
        identifierField: 'id',
      },
    };
    setEditingEndpoint(newEndpoint);
    setEndpointDialogOpen(true);
  };

  const saveEndpoint = () => {
    if (!editingEndpoint) return;

    const existingIndex = endpoints.findIndex((e) => e.id === editingEndpoint.id);
    if (existingIndex >= 0) {
      setEndpoints((prev) => {
        const updated = [...prev];
        updated[existingIndex] = editingEndpoint;
        return updated;
      });
    } else {
      setEndpoints((prev) => [...prev, editingEndpoint]);
    }
    setEndpointDialogOpen(false);
    setEditingEndpoint(null);
  };

  const deleteEndpoint = (endpointId: string) => {
    setEndpoints((prev) => prev.filter((e) => e.id !== endpointId));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>Integration not found</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/integrations/custom">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{integration.displayName}</h1>
            <p className="text-muted-foreground">{integration.baseUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="active">Active</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button variant="outline" onClick={handleTest} disabled={testConnection.isPending}>
            {testConnection.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube2 className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={updateIntegration.isPending}>
            {updateIntegration.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList>
          <TabsTrigger value="endpoints">
            <Code className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          {integration.integrationType === 'webhook' && (
            <TabsTrigger value="webhook">
              <Webhook className="h-4 w-4 mr-2" />
              Webhook
            </TabsTrigger>
          )}
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="testing">
            <TestTube2 className="h-4 w-4 mr-2" />
            Testing
          </TabsTrigger>
        </TabsList>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">API Endpoints</h2>
              <p className="text-sm text-muted-foreground">Configure the endpoints for this integration</p>
            </div>
            <Button onClick={addEndpoint}>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </div>

          {endpoints.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Code className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No endpoints configured</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Add endpoints to define how to fetch or send data to this integration.
                </p>
                <Button onClick={addEndpoint}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Endpoint
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {endpoints.map((endpoint) => (
                <Card key={endpoint.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <Badge variant={endpoint.method === 'GET' ? 'default' : endpoint.method === 'POST' ? 'secondary' : 'outline'}>
                        {endpoint.method}
                      </Badge>
                      <div>
                        <div className="font-medium">{endpoint.name}</div>
                        <div className="text-sm text-muted-foreground">{endpoint.path}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestEndpoint(endpoint.id)}
                        disabled={testEndpoint.isPending}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingEndpoint(endpoint);
                          setEndpointDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteEndpoint(endpoint.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Webhook Tab */}
        {integration.integrationType === 'webhook' && (
          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhook URL</CardTitle>
                <CardDescription>Use this URL to receive webhooks from external services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={webhookUrlData?.webhookUrl || 'Loading...'} readOnly className="font-mono" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrlData?.webhookUrl || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={() => regenerateSecret.mutate(id)} disabled={regenerateSecret.isPending}>
                  {regenerateSecret.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Secret
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>General configuration for this integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={integration.displayName} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Internal Name</Label>
                  <Input value={integration.name} readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input value={integration.baseUrl} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Authentication Type</Label>
                <Input value={integration.authType} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Timeout (ms)</Label>
                <Input value={integration.timeout || 30000} readOnly />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Results from the last test run</CardDescription>
            </CardHeader>
            <CardContent>
              {testResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                    {testResult.response?.latencyMs && (
                      <span className="text-sm text-muted-foreground">
                        {testResult.response.latencyMs}ms
                      </span>
                    )}
                  </div>

                  {testResult.error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{testResult.error}</p>
                    </div>
                  )}

                  {testResult.request && (
                    <div className="space-y-2">
                      <Label>Request</Label>
                      <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                        <p>{testResult.request.method} {testResult.request.url}</p>
                      </div>
                    </div>
                  )}

                  {testResult.response && (
                    <div className="space-y-2">
                      <Label>Response ({testResult.response.statusCode})</Label>
                      <ScrollArea className="h-64 p-3 bg-muted rounded-lg">
                        <pre className="font-mono text-sm">
                          {JSON.stringify(testResult.response.body, null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}

                  {testResult.mappingPreview && (
                    <div className="space-y-2">
                      <Label>Mapping Preview</Label>
                      <ScrollArea className="h-48 p-3 bg-muted rounded-lg">
                        <pre className="font-mono text-sm">
                          {JSON.stringify(testResult.mappingPreview.mappedData, null, 2)}
                        </pre>
                      </ScrollArea>
                      {testResult.mappingPreview.errors.length > 0 && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-sm font-medium text-yellow-700 mb-1">Mapping Warnings:</p>
                          <ul className="list-disc list-inside text-sm text-yellow-600">
                            {testResult.mappingPreview.errors.map((err: string, i: number) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No test results yet. Click "Test Connection" to test the integration.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Endpoint Editor Dialog */}
      <Dialog open={endpointDialogOpen} onOpenChange={setEndpointDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEndpoint?.id.startsWith('ep_') ? 'New Endpoint' : 'Edit Endpoint'}
            </DialogTitle>
            <DialogDescription>
              Configure the endpoint settings and response mapping
            </DialogDescription>
          </DialogHeader>

          {editingEndpoint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingEndpoint.name}
                    onChange={(e) => setEditingEndpoint({ ...editingEndpoint, name: e.target.value })}
                    placeholder="Get Users"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={editingEndpoint.method}
                    onValueChange={(v) => setEditingEndpoint({ ...editingEndpoint, method: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Path</Label>
                <Input
                  value={editingEndpoint.path}
                  onChange={(e) => setEditingEndpoint({ ...editingEndpoint, path: e.target.value })}
                  placeholder="/users"
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{param}'} for path parameters, e.g., /users/{'{id}'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingEndpoint.description || ''}
                  onChange={(e) => setEditingEndpoint({ ...editingEndpoint, description: e.target.value })}
                  placeholder="What does this endpoint do?"
                  rows={2}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Response Data Path</Label>
                <Input
                  value={editingEndpoint.responseMapping?.dataPath || '$'}
                  onChange={(e) =>
                    setEditingEndpoint({
                      ...editingEndpoint,
                      responseMapping: {
                        ...editingEndpoint.responseMapping,
                        dataPath: e.target.value,
                      },
                    })
                  }
                  placeholder="$.data.items"
                />
                <p className="text-xs text-muted-foreground">
                  JSONPath to the data array in the response
                </p>
              </div>

              <div className="space-y-2">
                <Label>Identifier Field</Label>
                <Input
                  value={editingEndpoint.responseMapping?.identifierField || 'id'}
                  onChange={(e) =>
                    setEditingEndpoint({
                      ...editingEndpoint,
                      responseMapping: {
                        ...editingEndpoint.responseMapping,
                        identifierField: e.target.value,
                      },
                    })
                  }
                  placeholder="id"
                />
                <p className="text-xs text-muted-foreground">
                  Field used to uniquely identify records for deduplication
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEndpointDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEndpoint}>
              Save Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}











