'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { ArrowLeft, Settings, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIntegration } from '@/hooks/use-integrations';
import { useIntegrationProviderByName } from '@/hooks/use-integration-providers';
import { IntegrationConnectionForm } from '@/components/integrations/integration-connection-form';
import { IntegrationDataAccessConfig } from '@/components/integrations/integration-data-access-config';
import { IntegrationSearchConfig } from '@/components/integrations/integration-search-config';
import { useTestConnection } from '@/hooks/use-integrations';

export default function IntegrationDetailPage() {
  const { t } = useTranslation(['common'] as any);
  const router = useRouter();
  const params = useParams();
  const integrationId = params.id as string;

  const { data: integration, isLoading } = useIntegration(integrationId);
  const testConnection = useTestConnection();

  // Get provider info by provider name (searches across all categories)
  const { data: providerData } = useIntegrationProviderByName(
    integration?.providerName || ''
  );

  const handleTestConnection = async () => {
    return testConnection.mutateAsync(integrationId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Integration not found</p>
      </div>
    );
  }

  const provider = providerData;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{integration.name}</h1>
          <p className="text-muted-foreground">
            {integration.description || `Manage ${integration.providerName} integration`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline">{integration.providerName}</Badge>
        <Badge
          variant={
            integration.status === 'connected'
              ? 'default'
              : integration.status === 'error'
              ? 'destructive'
              : 'secondary'
          }
        >
          {integration.status}
        </Badge>
        {integration.searchEnabled && <Badge variant="outline">Search Enabled</Badge>}
        {integration.userScoped && <Badge variant="outline">User Scoped</Badge>}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="data-access">Data Access</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{integration.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Provider</p>
                  <p className="text-sm">{integration.providerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-sm capitalize">{integration.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connection Status</p>
                  <p className="text-sm capitalize">{integration.connectionStatus || 'Unknown'}</p>
                </div>
                {integration.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {new Date(integration.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {integration.lastConnectionTestAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Tested</p>
                    <p className="text-sm">
                      {new Date(integration.lastConnectionTestAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              {integration.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{integration.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connection" className="space-y-4">
          {provider ? (
            <IntegrationConnectionForm
              integration={integration}
              provider={provider}
              onTest={handleTestConnection}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Provider information not available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data-access" className="space-y-4">
          <IntegrationDataAccessConfig
            integration={integration}
            availableShardTypes={[]} // Note: Shard types would be fetched from shard-types API
            // Example: const { data: shardTypes } = useShardTypes();
            // availableShardTypes={shardTypes?.shardTypes.map(st => ({ id: st.id, name: st.name })) || []}
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          {provider ? (
            <IntegrationSearchConfig
              integration={integration}
              availableEntities={provider.searchableEntities || []}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Provider information not available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}







