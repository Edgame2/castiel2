'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save } from 'lucide-react';
import { useUpdateDataAccess } from '@/hooks/use-integrations';
import type { IntegrationDocument } from '@/types/integration';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface IntegrationDataAccessConfigProps {
  integration: IntegrationDocument;
  availableShardTypes?: Array<{ id: string; name: string; description?: string }>;
  onSuccess?: () => void;
}

export function IntegrationDataAccessConfig({
  integration,
  availableShardTypes = [],
  onSuccess,
}: IntegrationDataAccessConfigProps) {
  const [selectedShardTypes, setSelectedShardTypes] = useState<string[]>(
    integration.allowedShardTypes || []
  );
  const updateDataAccess = useUpdateDataAccess();

  useEffect(() => {
    setSelectedShardTypes(integration.allowedShardTypes || []);
  }, [integration.allowedShardTypes]);

  const handleShardTypeToggle = (shardTypeId: string) => {
    setSelectedShardTypes((prev) =>
      prev.includes(shardTypeId)
        ? prev.filter((id) => id !== shardTypeId)
        : [...prev, shardTypeId]
    );
  };

  const handleSave = async () => {
    try {
      await updateDataAccess.mutateAsync({
        id: integration.id,
        allowedShardTypes: selectedShardTypes,
      });
      toast.success('Data access configuration updated', {
        description: `Access permissions for ${integration.name} have been updated.`,
      });
      onSuccess?.();
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to update data access', 3, {
        errorMessage: errorObj.message,
        integrationId: integration.id,
      })
      toast.error('Failed to update data access', {
        description: error.message || 'An error occurred while updating data access configuration.',
      });
    }
  };

  const hasChanges = JSON.stringify(selectedShardTypes.sort()) !== JSON.stringify((integration.allowedShardTypes || []).sort());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Access Configuration</CardTitle>
        <CardDescription>
          Configure which shard types this integration can access and sync data to.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableShardTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No shard types available. Shard types must be created first.
          </p>
        ) : (
          <div className="space-y-3">
            {availableShardTypes.map((shardType) => (
              <div
                key={shardType.id}
                className="flex items-start space-x-3 rounded-lg border p-3"
              >
                <Checkbox
                  id={shardType.id}
                  checked={selectedShardTypes.includes(shardType.id)}
                  onCheckedChange={() => handleShardTypeToggle(shardType.id)}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={shardType.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {shardType.name}
                  </Label>
                  {shardType.description && (
                    <p className="text-xs text-muted-foreground">{shardType.description}</p>
                  )}
                </div>
                {selectedShardTypes.includes(shardType.id) && (
                  <Badge variant="default">Enabled</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateDataAccess.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateDataAccess.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







