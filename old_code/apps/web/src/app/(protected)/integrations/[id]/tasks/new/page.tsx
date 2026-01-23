'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useTenantIntegration,
  useIntegration,
  useConversionSchemas,
  useCreateSyncTask,
} from '@/hooks/use-integrations';
import { SyncTaskForm, SyncTaskFormData } from '@/components/integrations/sync-task-form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

export default function NewSyncTaskPage() {
  const params = useParams();
  const router = useRouter();
  const integrationId = params.id as string;

  const { data: tenantIntegration, isLoading: loadingTenant } = useTenantIntegration(integrationId);
  const { data: integration } = useIntegration(
    tenantIntegration?.integrationId || ''
  );
  const { data: schemas, isLoading: loadingSchemas } = useConversionSchemas(integrationId);
  const createTask = useCreateSyncTask();

  const isLoading = loadingTenant || loadingSchemas;

  const handleSubmit = async (data: SyncTaskFormData) => {
    try {
      await createTask.mutateAsync({
        integrationId,
        data: {
          name: data.name,
          description: data.description,
          conversionSchemaId: data.conversionSchemaId,
          direction: data.direction,
          schedule: data.schedule,
          config: data.config,
          conflictResolution: data.conflictResolution,
          status: 'active',
          retryConfig: data.retryConfig,
          notifications: data.notifications,
        },
      });
      router.push(`/integrations/${integrationId}/configure`);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to create sync task', 3, {
        errorMessage: errorObj.message,
        integrationId,
      })
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!schemas || schemas.schemas.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Link
          href={`/integrations/${integrationId}/configure`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Configuration
        </Link>

        <div className="text-center py-12">
          <h3 className="text-lg font-semibold">No conversion schemas found</h3>
          <p className="text-muted-foreground mb-4">
            You need to create a conversion schema before you can create a sync task.
          </p>
          <Link
            href={`/integrations/${integrationId}/schemas/new`}
            className="text-primary hover:underline"
          >
            Create a conversion schema
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/integrations/${integrationId}/configure`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Configuration
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">New Sync Task</h1>
        <p className="text-muted-foreground mt-1">
          Create a scheduled task to sync data with {integration?.displayName || 'the integration'}
        </p>
      </div>

      <SyncTaskForm
        integrationId={integrationId}
        conversionSchemas={schemas.schemas}
        onSubmit={handleSubmit}
        isSubmitting={createTask.isPending}
      />
    </div>
  );
}











