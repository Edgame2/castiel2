'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIntegrationSearch } from '@/hooks/use-integration-search';
import { trackException, trackTrace } from '@/lib/monitoring/app-insights';

interface IntegrationSearchBarProps {
  onSearch?: (results: any) => void;
  onError?: (error: Error) => void;
  filters?: {
    entities?: string[];
    dateRange?: { start?: Date; end?: Date };
    integrationIds?: string[];
  };
}

export function IntegrationSearchBar({ onSearch, onError, filters }: IntegrationSearchBarProps) {
  const [query, setQuery] = useState('');
  const search = useIntegrationSearch();

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      const results = await search.mutateAsync({
        query: query.trim(),
        entities: filters?.entities,
        filters: filters?.dateRange
          ? {
              dateRange: filters.dateRange,
            }
          : undefined,
        integrationIds: filters?.integrationIds,
      });
      onSearch?.(results);
      if (results.total === 0) {
        toast.info('No results found', {
          description: `No results found for "${query.trim()}"`,
        });
      }
    } catch (error: any) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace('Search failed in integration-search-bar', 3, {
        errorMessage: errorObj.message,
        query,
        integrationId: integration.id,
      })
      const errorMessage = error.message || 'An error occurred while searching. Please try again.';
      toast.error('Search failed', {
        description: errorMessage,
      });
      onError?.(error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search across all integrations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-9"
        />
      </div>
      <Button onClick={handleSearch} disabled={search.isPending || !query.trim()}>
        {search.isPending ? 'Searching...' : 'Search'}
      </Button>
    </div>
  );
}







