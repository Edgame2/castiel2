'use client';

/**
 * New Custom Integration Page
 * Form for creating a new custom integration
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateCustomIntegration } from '@/hooks/use-custom-integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Globe, Webhook, Zap, Save } from 'lucide-react';
import Link from 'next/link';
import { CreateCustomIntegrationRequest, AuthConfig } from '@/lib/api/custom-integrations';

export default function NewCustomIntegrationPage() {
  const router = useRouter();
  const createIntegration = useCreateCustomIntegration();

  const [formData, setFormData] = useState<{
    name: string;
    displayName: string;
    description: string;
    integrationType: 'rest_api' | 'webhook' | 'graphql';
    baseUrl: string;
    authType: string;
    timeout: number;
  }>({
    name: '',
    displayName: '',
    description: '',
    integrationType: 'rest_api',
    baseUrl: '',
    authType: 'none',
    timeout: 30000,
  });

  const [authConfig, setAuthConfig] = useState<AuthConfig>({ type: 'none' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.displayName) newErrors.displayName = 'Display name is required';
    if (!formData.baseUrl) newErrors.baseUrl = 'Base URL is required';
    
    try {
      new URL(formData.baseUrl);
    } catch {
      newErrors.baseUrl = 'Invalid URL format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const request: CreateCustomIntegrationRequest = {
      name: formData.name,
      displayName: formData.displayName,
      description: formData.description || undefined,
      integrationType: formData.integrationType,
      baseUrl: formData.baseUrl,
      authType: authConfig.type,
      authConfig,
      timeout: formData.timeout,
      endpoints: [],
    };

    const result = await createIntegration.mutateAsync(request);
    router.push(`/integrations/custom/${result.id}`);
  };

  const updateAuthConfig = (type: string) => {
    switch (type) {
      case 'none':
        setAuthConfig({ type: 'none' });
        break;
      case 'api_key':
        setAuthConfig({ type: 'api_key', keyName: 'X-API-Key', keyLocation: 'header' });
        break;
      case 'bearer':
        setAuthConfig({ type: 'bearer' });
        break;
      case 'basic':
        setAuthConfig({ type: 'basic', username: '' });
        break;
      case 'oauth2':
        setAuthConfig({ type: 'oauth2', grantType: 'client_credentials', tokenUrl: '', clientId: '' });
        break;
      case 'custom_headers':
        setAuthConfig({ type: 'custom_headers', headers: {} });
        break;
    }
    setFormData((prev) => ({ ...prev, authType: type }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/integrations/custom">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Custom Integration</h1>
          <p className="text-muted-foreground">Connect to external APIs, webhooks, or GraphQL endpoints</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>General settings for your integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Integration Type */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, integrationType: 'rest_api' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.integrationType === 'rest_api'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Globe className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="font-medium">REST API</div>
                  <div className="text-xs text-muted-foreground">Standard HTTP endpoints</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, integrationType: 'webhook' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.integrationType === 'webhook'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Webhook className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="font-medium">Webhook</div>
                  <div className="text-xs text-muted-foreground">Receive incoming data</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, integrationType: 'graphql' }))}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.integrationType === 'graphql'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="font-medium">GraphQL</div>
                  <div className="text-xs text-muted-foreground">Query language API</div>
                </button>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Internal Name *</Label>
                  <Input
                    id="name"
                    placeholder="my-api-integration"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="My API Integration"
                    value={formData.displayName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                    className={errors.displayName ? 'border-destructive' : ''}
                  />
                  {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this integration do?"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Connection Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Settings</CardTitle>
              <CardDescription>Configure how to connect to the external service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  placeholder="https://api.example.com/v1"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  className={errors.baseUrl ? 'border-destructive' : ''}
                />
                {errors.baseUrl && <p className="text-sm text-destructive">{errors.baseUrl}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Request Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1000}
                    max={120000}
                    value={formData.timeout}
                    onChange={(e) => setFormData((prev) => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Configure how to authenticate with the service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Authentication Type</Label>
                <Select value={formData.authType} onValueChange={updateAuthConfig}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Authentication</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="custom_headers">Custom Headers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* API Key Config */}
              {authConfig.type === 'api_key' && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Key Name</Label>
                      <Input
                        placeholder="X-API-Key"
                        value={(authConfig as any).keyName || ''}
                        onChange={(e) => setAuthConfig({ ...authConfig, keyName: e.target.value } as any)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Key Location</Label>
                      <Select
                        value={(authConfig as any).keyLocation || 'header'}
                        onValueChange={(v) => setAuthConfig({ ...authConfig, keyLocation: v } as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Parameter</SelectItem>
                          <SelectItem value="body">Request Body</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter your API key"
                      value={(authConfig as any).keyValue || ''}
                      onChange={(e) => setAuthConfig({ ...authConfig, keyValue: e.target.value } as any)}
                    />
                  </div>
                </div>
              )}

              {/* Bearer Token Config */}
              {authConfig.type === 'bearer' && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Bearer Token</Label>
                    <Input
                      type="password"
                      placeholder="Enter your bearer token"
                      value={(authConfig as any).token || ''}
                      onChange={(e) => setAuthConfig({ ...authConfig, token: e.target.value } as any)}
                    />
                  </div>
                </div>
              )}

              {/* Basic Auth Config */}
              {authConfig.type === 'basic' && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        placeholder="Username"
                        value={(authConfig as any).username || ''}
                        onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value } as any)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={(authConfig as any).password || ''}
                        onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value } as any)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* OAuth2 Config */}
              {authConfig.type === 'oauth2' && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Grant Type</Label>
                    <Select
                      value={(authConfig as any).grantType || 'client_credentials'}
                      onValueChange={(v) => setAuthConfig({ ...authConfig, grantType: v } as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_credentials">Client Credentials</SelectItem>
                        <SelectItem value="authorization_code">Authorization Code</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Token URL</Label>
                    <Input
                      placeholder="https://api.example.com/oauth/token"
                      value={(authConfig as any).tokenUrl || ''}
                      onChange={(e) => setAuthConfig({ ...authConfig, tokenUrl: e.target.value } as any)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        placeholder="Client ID"
                        value={(authConfig as any).clientId || ''}
                        onChange={(e) => setAuthConfig({ ...authConfig, clientId: e.target.value } as any)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        placeholder="Client Secret"
                        value={(authConfig as any).clientSecret || ''}
                        onChange={(e) => setAuthConfig({ ...authConfig, clientSecret: e.target.value } as any)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Scope (optional)</Label>
                    <Input
                      placeholder="read write"
                      value={(authConfig as any).scope || ''}
                      onChange={(e) => setAuthConfig({ ...authConfig, scope: e.target.value } as any)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/integrations/custom">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createIntegration.isPending}>
              {createIntegration.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Integration
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}











