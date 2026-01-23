'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntegration } from '@/hooks/use-integrations';
import { useIntegrationProviderByName } from '@/hooks/use-integration-providers';
import { IntegrationConnectionForm } from '@/components/integrations/integration-connection-form';
import { useTestConnection } from '@/hooks/use-integrations';

export default function IntegrationConnectPage() {
  const { t } = useTranslation(['common']);
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
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Connect Integration</h1>
          <p className="text-muted-foreground">
            Connect your personal account to {integration.name}
          </p>
        </div>
      </div>

      {provider ? (
        <IntegrationConnectionForm
          integration={integration}
          provider={provider}
          onTest={handleTestConnection}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Provider information not available</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Unable to load provider information. Please try again later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}







