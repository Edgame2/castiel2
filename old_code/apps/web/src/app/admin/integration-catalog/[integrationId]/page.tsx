/**
 * Integration Catalog Detail/Edit Page
 * 
 * Path: apps/web/src/app/admin/integration-catalog/[integrationId]/page.tsx
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  useCatalogEntry,
  useUpdateCatalogEntry,
  useShardMappings,
  useUpdateShardMappings,
} from '@/hooks/use-integration-catalog';
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
import { IntegrationStatus } from '@/types/integration.types';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CatalogDetailPageProps {
  params: {
    integrationId: string;
  };
}

export default function CatalogDetailPage({ params }: CatalogDetailPageProps) {
  const router = useRouter();
  const { integrationId } = params;
  const [isEditing, setIsEditing] = useState(false);

  // Queries
  const { data: entry, isLoading } = useCatalogEntry(integrationId);
  const { data: shardMappings } = useShardMappings(integrationId);

  // Mutations
  const updateMutation = useUpdateCatalogEntry(integrationId);
  const updateShardMutation = useUpdateShardMappings(integrationId);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    icon: '',
    color: '#6b7280',
    audience: 'tenant' as const,
    requiredPlan: '',
    capabilities: [] as string[],
    supportedSyncDirections: [] as string[],
    status: 'active' as IntegrationStatus,
    documentationUrl: '',
    supportUrl: '',
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        displayName: entry.displayName,
        description: entry.description || '',
        icon: entry.icon,
        color: entry.color,
        audience: (entry.audience as any) || 'tenant',
        requiredPlan: entry.requiredPlan || '',
        capabilities: (entry.capabilities as string[]) || [],
        supportedSyncDirections: (entry.supportedSyncDirections as string[]) || [],
        status: entry.status || 'active',
        documentationUrl: entry.documentationUrl || '',
        supportUrl: entry.supportUrl || '',
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Integration updated successfully');
        setIsEditing(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update integration');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Integration not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{entry.displayName}</h1>
            <p className="text-muted-foreground">{entry.id}</p>
          </div>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? 'default' : 'outline'}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
          <TabsTrigger value="shards">Shard Mappings</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {!isEditing ? (
            // View Mode
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Display Name</label>
                    <p className="text-base mt-2">{entry.displayName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-base mt-2">{entry.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Badge className="mt-2">{entry.category}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Badge className="mt-2">{entry.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Audience</label>
                      <p className="text-base mt-2 capitalize">{entry.audience === 'system' ? 'System (Super Admin)' : 'Tenant (Public)'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Required Plan</label>
                      <p className="text-base mt-2">{entry.requiredPlan || 'Any'}</p>
                    </div>
                  </div>
                  {entry.allowedTenants && (
                    <div>
                      <label className="text-sm font-medium">Allowed Tenants</label>
                      <p className="text-base mt-2">{entry.allowedTenants.length} tenants whitelisted</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Documentation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {entry.documentationUrl && (
                    <a href={entry.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Documentation
                    </a>
                  )}
                  {entry.supportUrl && (
                    <a href={entry.supportUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Support
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            // Edit Mode
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Display Name */}
                  <div>
                    <label className="text-sm font-medium">Display Name</label>
                    <Input
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  {/* Audience & Plan */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Audience</label>
                      <Select
                        value={formData.audience}
                        onValueChange={(value: any) => setFormData({ ...formData, audience: value })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant">Tenant (Public)</SelectItem>
                          <SelectItem value="system">System (Super Admin Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Required Plan</label>
                      <Select value={formData.requiredPlan} onValueChange={(value) => setFormData({ ...formData, requiredPlan: value })}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="beta">Beta</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* URLs */}
                  <div>
                    <label className="text-sm font-medium">Documentation URL</label>
                    <Input
                      type="url"
                      value={formData.documentationUrl}
                      onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Support URL</label>
                    <Input
                      type="url"
                      value={formData.supportUrl}
                      onChange={(e) => setFormData({ ...formData, supportUrl: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  <Button type="submit" disabled={updateMutation.isPending} className="w-full">
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Visibility Tab */}
        <TabsContent value="visibility">
          <Card>
            <CardHeader>
              <CardTitle>Visibility Management</CardTitle>
              <CardDescription>
                Click "Manage Visibility" button to configure rules for individual tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/admin/integration-catalog/${integrationId}/visibility`)}
              >
                Manage Visibility Rules
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shards Tab */}
        <TabsContent value="shards">
          <Card>
            <CardHeader>
              <CardTitle>Shard Type Mappings</CardTitle>
              <CardDescription>
                Define how this integration maps to Castiel shard types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/admin/integration-catalog/${integrationId}/shard-mappings`)}
              >
                Edit Shard Mappings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Capabilities & Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Capabilities</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {entry.capabilities.map((cap: string) => (
                    <Badge key={cap}>{cap}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Sync Directions</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {entry.supportedSyncDirections.map((dir: string) => (
                    <Badge key={dir}>{dir}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium">Supports Realtime</label>
                  <p className="text-base mt-2">{entry.supportsRealtime ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Supports Webhooks</label>
                  <p className="text-base mt-2">{entry.supportsWebhooks ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
