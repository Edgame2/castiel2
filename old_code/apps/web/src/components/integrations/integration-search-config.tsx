'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { useUpdateSearchConfig } from '@/hooks/use-integrations';
import type { IntegrationDocument } from '@/types/integration';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface IntegrationSearchConfigProps {
  integration: IntegrationDocument;
  availableEntities?: string[];
  onSuccess?: () => void;
}

export function IntegrationSearchConfig({
  integration,
  availableEntities = [],
  onSuccess,
}: IntegrationSearchConfigProps) {
  const [searchEnabled, setSearchEnabled] = useState(integration.searchEnabled || false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>(
    integration.searchableEntities || []
  );
  const updateSearchConfig = useUpdateSearchConfig();

  useEffect(() => {
    setSearchEnabled(integration.searchEnabled || false);
    setSelectedEntities(integration.searchableEntities || []);
  }, [integration.searchEnabled, integration.searchableEntities]);

  const handleEntityToggle = (entity: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entity)
        ? prev.filter((e) => e !== entity)
        : [...prev, entity]
    );
  };

  const handleSave = async () => {
    try {
      await updateSearchConfig.mutateAsync({
        id: integration.id,
        searchEnabled,
        searchableEntities: searchEnabled ? selectedEntities : [],
        searchFilters: integration.searchFilters,
      });
      toast.success('Search configuration updated', {
        description: `Search settings for ${integration.name} have been updated.`,
      });
      onSuccess?.();
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Failed to update search config', 3, {
        errorMessage: errorObj.message,
        integrationId: integration.id,
      })
      toast.error('Failed to update search configuration', {
        description: error.message || 'An error occurred while updating search configuration.',
      });
    }
  };

  const hasChanges =
    searchEnabled !== (integration.searchEnabled || false) ||
    JSON.stringify(selectedEntities.sort()) !==
      JSON.stringify((integration.searchableEntities || []).sort());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Configuration</CardTitle>
        <CardDescription>
          Configure search capabilities for this integration. Enable search to allow users to search
          across this integration's data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="searchEnabled"
            checked={searchEnabled}
            onCheckedChange={(checked) => setSearchEnabled(checked === true)}
          />
          <Label htmlFor="searchEnabled" className="text-sm font-medium">
            Enable Search
          </Label>
        </div>

        {searchEnabled && (
          <div className="space-y-3 pl-6">
            <Label>Searchable Entities</Label>
            {availableEntities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No entities available. Entities are defined by the integration provider.
              </p>
            ) : (
              <div className="space-y-2">
                {availableEntities.map((entity) => (
                  <div key={entity} className="flex items-center space-x-2">
                    <Checkbox
                      id={entity}
                      checked={selectedEntities.includes(entity)}
                      onCheckedChange={() => handleEntityToggle(entity)}
                    />
                    <Label
                      htmlFor={entity}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {entity}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {selectedEntities.length > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">
                  {selectedEntities.length} entit{selectedEntities.length === 1 ? 'y' : 'ies'}{' '}
                  selected for search
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSearchConfig.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateSearchConfig.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}







