'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateProvider } from '@/hooks/use-integration-providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function NewIntegrationProviderPage() {
  const { t } = useTranslation(['common'] as any);
  const router = useRouter();
  const createProvider = useCreateProvider();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const data = {
        category: formData.get('category' as any) as string,
        provider: formData.get('provider' as any) as string,
        name: formData.get('name' as any) as string,
        displayName: formData.get('displayName' as any) as string,
        description: formData.get('description' as any) as string || undefined,
        status: 'active' as const,
        audience: 'tenant' as const,
        capabilities: [] as string[],
        supportedSyncDirections: ['pull'] as ('pull' | 'push' | 'bidirectional')[],
        supportsRealtime: false,
        supportsWebhooks: false,
        supportsNotifications: false,
        supportsSearch: false,
        requiresUserScoping: false,
        authType: 'oauth2' as const,
        availableEntities: [],
        icon: '🔌',
        color: '#6b7280',
        version: '1.0.0',
      };
      
      await createProvider.mutateAsync(data);
      toast.success('Integration provider created successfully', {
        description: `${data.displayName} has been added to the catalog.`,
      });
      router.push('/admin/integrations');
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to create provider', 3, {
        errorMessage: errorObj.message,
        providerName: data.displayName,
      })
      toast.error('Failed to create provider', {
        description: error.message || 'An error occurred while creating the provider.',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('admin.integrations.create', 'Create Integration Provider')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.integrations.createSubtitle', 'Add a new integration provider to the catalog.')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Details</CardTitle>
          <CardDescription>Configure the integration provider settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crm">CRM</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="data_source">Data Source</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider ID</Label>
                <Input
                  id="provider"
                  name="provider"
                  placeholder="e.g., salesforce"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Internal Name</Label>
                <Input id="name" name="name" placeholder="e.g., Salesforce" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="e.g., Salesforce CRM"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provider description..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProvider.isPending}>
                {createProvider.isPending ? 'Creating...' : 'Create Provider'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}







