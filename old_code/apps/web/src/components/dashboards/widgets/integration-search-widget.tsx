'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { IntegrationSearchBar } from '@/components/integrations/integration-search-bar';
import { IntegrationSearchResults } from '@/components/integrations/integration-search-results';
import type { Widget } from '@/types/dashboard';
import type { IntegrationSearchResult } from '@/types/integration';

interface IntegrationSearchWidgetProps {
  widget: Widget;
  data?: unknown;
}

export function IntegrationSearchWidget({ widget, data }: IntegrationSearchWidgetProps) {
  const [searchResults, setSearchResults] = useState<IntegrationSearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (results: IntegrationSearchResult) => {
    setSearchResults(results);
    setHasSearched(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{widget.name || 'Integration Search'}</CardTitle>
        <CardDescription>Search across all your connected integrations</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <IntegrationSearchBar onSearch={handleSearch} />

        {!hasSearched ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Search className="h-8 w-8 mx-auto opacity-50" />
              <p className="text-sm">Enter a search query to find data across integrations</p>
            </div>
          </div>
        ) : searchResults && searchResults.results.length > 0 ? (
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Found {searchResults.total} result{searchResults.total !== 1 ? 's' : ''} in{' '}
                  {searchResults.took}ms
                </span>
                <div className="flex gap-1">
                  {searchResults.integrations.slice(0, 3).map((integration) => (
                    <Badge key={integration.integrationId} variant="outline" className="text-xs">
                      {integration.integrationName}: {integration.resultCount}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                {searchResults.results.slice(0, 5).map((result) => (
                  <div
                    key={`${result.integrationId}-${result.id}`}
                    className="rounded-lg border p-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.entity} from {result.integrationName}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs ml-2">
                        {(result.score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {searchResults.results.length > 5 && (
                <Button variant="link" className="w-full text-xs" asChild>
                  <a href="/integrations/search">View all results →</a>
                </Button>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">No results found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}







