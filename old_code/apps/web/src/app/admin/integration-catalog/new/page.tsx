/**
 * Create New Integration Catalog Entry Page
 * 
 * Path: apps/web/src/app/admin/integration-catalog/new/page.tsx
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateCatalogEntry } from '@/hooks/use-integration-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CreateIntegrationPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    integrationId: '',
    name: '',
    displayName: '',
    description: '',
    category: '',
    icon: 'plug',
    color: '#6b7280',
    visibility: 'public' as const,
    requiredPlan: '',
    capabilities: [] as string[],
    supportedSyncDirections: [] as string[],
    authType: 'api_key' as const,
    supportedShardTypes: [] as string[],
    shardMappings: [] as any[],
    status: 'active' as const,
    beta: false,
    deprecated: false,
    documentationUrl: '',
    supportUrl: '',
    supportsRealtime: false,
    supportsWebhooks: false,
  });

  const createMutation = useCreateCatalogEntry();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayInput = (field: string, value: string) => {
    const array = value.split(',' as any).map(v => v.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      [field]: array,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.integrationId || !formData.name || !formData.displayName || !formData.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    createMutation.mutate(formData, {
      onSuccess: (response: any) => {
        toast.success('Integration created successfully');
        const integrationData = response.data || response;
        const integrationId = integrationData.integrationId || formData.integrationId;
        router.push(`/admin/integration-catalog/${integrationId}`);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create integration');
      },
    });
  };

  const categories = [
    'crm',
    'communication',
    'data_source',
    'storage',
    'custom',
    'ai_provider',
  ];

  const authTypes = [
    'oauth2',
    'api_key',
    'basic',
    'custom',
  ];

  const plans = [
    'free',
    'pro',
    'enterprise',
    'premium',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Integration</h1>
          <p className="text-muted-foreground">
            Add a new integration to the catalog
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General Info</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Set up the basic information for this integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Integration ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Integration ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., salesforce, hubspot"
                    value={formData.integrationId}
                    onChange={(e) => handleInputChange('integrationId', e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this integration (lowercase, no spaces)
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Salesforce"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Salesforce CRM"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Describe this integration..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Icon & Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Icon</label>
                    <Input
                      type="text"
                      placeholder="e.g., plug"
                      value={formData.icon}
                      onChange={(e) => handleInputChange('icon', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => handleInputChange('color', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Access & Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visibility */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select value={formData.visibility} onValueChange={(value) => handleInputChange('visibility', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="superadmin_only">Super Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Required Plan */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Required Plan (Optional)</label>
                  {formData.requiredPlan && (
                    <div className="flex gap-2 items-center">
                      <Select value={formData.requiredPlan} onValueChange={(value) => handleInputChange('requiredPlan', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan} value={plan}>
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInputChange('requiredPlan', '')}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  {!formData.requiredPlan && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleInputChange('requiredPlan', 'pro')}
                    >
                      Set Required Plan
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave unset to make available to all plans
                  </p>
                </div>

                {/* Auth Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Authentication Type <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.authType} onValueChange={(value) => handleInputChange('authType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select auth type" />
                    </SelectTrigger>
                    <SelectContent>
                      {authTypes.map((auth) => (
                        <SelectItem key={auth} value={auth}>
                          {auth.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="beta">Beta</SelectItem>
                      <SelectItem value="deprecated">Deprecated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Flags */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="beta"
                      checked={formData.beta}
                      onCheckedChange={(checked) => handleInputChange('beta', checked)}
                    />
                    <label htmlFor="beta" className="text-sm font-medium cursor-pointer">
                      Beta
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="deprecated"
                      checked={formData.deprecated}
                      onCheckedChange={(checked) => handleInputChange('deprecated', checked)}
                    />
                    <label htmlFor="deprecated" className="text-sm font-medium cursor-pointer">
                      Deprecated
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Capabilities */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Capabilities <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., read, write, delete (comma-separated)"
                    value={formData.capabilities.join(', ')}
                    onChange={(e) => handleArrayInput('capabilities', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of capabilities
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.capabilities.map((cap) => (
                      <Badge key={cap}>{cap}</Badge>
                    ))}
                  </div>
                </div>

                {/* Sync Directions */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Supported Sync Directions <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., pull, push, bidirectional (comma-separated)"
                    value={formData.supportedSyncDirections.join(', ')}
                    onChange={(e) => handleArrayInput('supportedSyncDirections', e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.supportedSyncDirections.map((dir) => (
                      <Badge key={dir}>{dir}</Badge>
                    ))}
                  </div>
                </div>

                {/* Supported Shard Types */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Supported Shard Types <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., contact, account, company (comma-separated)"
                    value={formData.supportedShardTypes.join(', ')}
                    onChange={(e) => handleArrayInput('supportedShardTypes', e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.supportedShardTypes.map((type) => (
                      <Badge key={type}>{type}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Features & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feature Flags */}
                <div className="space-y-3 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="realtime"
                      checked={formData.supportsRealtime}
                      onCheckedChange={(checked) => handleInputChange('supportsRealtime', checked)}
                    />
                    <label htmlFor="realtime" className="text-sm font-medium cursor-pointer">
                      Supports Real-time Sync
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="webhooks"
                      checked={formData.supportsWebhooks}
                      onCheckedChange={(checked) => handleInputChange('supportsWebhooks', checked)}
                    />
                    <label htmlFor="webhooks" className="text-sm font-medium cursor-pointer">
                      Supports Webhooks
                    </label>
                  </div>
                </div>

                {/* Documentation & Support URLs */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Documentation URL</label>
                  <Input
                    type="url"
                    placeholder="https://docs.example.com"
                    value={formData.documentationUrl}
                    onChange={(e) => handleInputChange('documentationUrl', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Support URL</label>
                  <Input
                    type="url"
                    placeholder="https://support.example.com"
                    value={formData.supportUrl}
                    onChange={(e) => handleInputChange('supportUrl', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex gap-2 justify-end border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Integration'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
