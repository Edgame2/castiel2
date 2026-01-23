'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IntegrationSearchBar } from '@/components/integrations/integration-search-bar';
import { IntegrationSearchResults } from '@/components/integrations/integration-search-results';
import { IntegrationSearchFilters } from '@/components/integrations/integration-search-filters';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIntegrations } from '@/hooks/use-integrations';
import { useIntegrationSearch } from '@/hooks/use-integration-search';
import type { IntegrationSearchResult } from '@/types/integration';

export default function IntegrationSearchPage() {
  const { t } = useTranslation(['common']);
  const [searchResults, setSearchResults] = useState<IntegrationSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    entities?: string[];
    dateRange?: { start?: Date; end?: Date };
    integrationIds?: string[];
  }>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Get available integrations for filter
  const { data: integrationsData } = useIntegrations({ searchEnabled: true });
  const availableIntegrations =
    integrationsData?.integrations.map((i) => ({ id: i.id, name: i.name })) || [];

  const handleSearch = (results: IntegrationSearchResult) => {
    setSearchResults(results);
    setSearchError(null);
  };

  const handleSearchError = (error: Error) => {
    setSearchError(error.message || 'An error occurred while searching');
    setSearchResults(null);
  };

  // Extract available entities from integrations
  const availableEntities = Array.from(
    new Set(
      integrationsData?.integrations.flatMap((i) => i.searchableEntities || []) || []
    )
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('search.title', 'Integration Search')}
        </h1>
        <p className="text-muted-foreground">
          {t('search.subtitle', 'Search across all your connected integrations.')}
        </p>
      </div>

      <div className="space-y-4">
        <IntegrationSearchBar onSearch={handleSearch} onError={handleSearchError} filters={filters} />
        
        {searchError && (
          <Alert variant="destructive">
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}
        
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline">Advanced Filters</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="rounded-lg border p-4">
              <IntegrationSearchFilters
                onFilterChange={setFilters}
                availableEntities={availableEntities}
                availableIntegrations={availableIntegrations}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {searchResults && <IntegrationSearchResults results={searchResults} />}
    </div>
  );
}







