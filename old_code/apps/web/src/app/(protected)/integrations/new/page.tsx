'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useCreateIntegration } from '@/hooks/use-integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IntegrationProviderSelector } from '@/components/integrations/integration-provider-selector';
import { IntegrationForm } from '@/components/integrations/integration-form';
import type { IntegrationProviderDocument } from '@/types/integration';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

export default function NewIntegrationPage() {
  const { t } = useTranslation(['common']);
  const router = useRouter();
  const createIntegration = useCreateIntegration();
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProviderDocument | null>(null);
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const handleProviderSelect = (provider: IntegrationProviderDocument) => {
    setSelectedProvider(provider);
    setStep('configure');
  };

  const handleFormSubmit = async (data: {
    name: string;
    description?: string;
    searchEnabled?: boolean;
    userScoped?: boolean;
  }) => {
    if (!selectedProvider) return;

    try {
      await createIntegration.mutateAsync({
        integrationId: selectedProvider.id,
        providerName: selectedProvider.provider,
        name: data.name,
        description: data.description,
        credentialSecretName: `temp-secret-${Date.now()}`, // This should come from OAuth flow
        searchEnabled: data.searchEnabled || false,
        userScoped: data.userScoped || false,
        status: 'pending' as const,
      });
      toast.success('Integration created successfully', {
        description: `${data.name} has been created and is ready to configure.`,
      });
      router.push('/integrations');
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to create integration', 3, {
        errorMessage: errorObj.message,
        providerId: data.providerId,
        integrationName: data.name,
      })
      toast.error('Failed to create integration', {
        description: error.message || 'An error occurred while creating the integration.',
      });
      throw error;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('integrations.create', 'Add Integration')}
        </h1>
        <p className="text-muted-foreground">
          {t('integrations.createSubtitle', 'Connect a new integration to your workspace.')}
        </p>
      </div>

      {step === 'select' ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Integration Provider</CardTitle>
            <CardDescription>
              Choose an integration provider to connect to your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IntegrationProviderSelector onSelect={handleProviderSelect} />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {selectedProvider && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configure Integration</CardTitle>
                    <CardDescription>
                      Setting up {selectedProvider.displayName} integration
                    </CardDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('select')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Change provider
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <IntegrationForm
                  provider={selectedProvider}
                  onSubmit={handleFormSubmit}
                  onCancel={() => router.back()}
                  isLoading={createIntegration.isPending}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}







