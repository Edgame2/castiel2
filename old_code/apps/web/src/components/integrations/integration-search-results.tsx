'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IntegrationSearchResult, SearchResultItem } from '@/types/integration';

interface IntegrationSearchResultsProps {
  results: IntegrationSearchResult;
}

export function IntegrationSearchResults({ results }: IntegrationSearchResultsProps) {
  if (results.results.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No results found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Found {results.total} result{results.total !== 1 ? 's' : ''} in {results.took}ms
        </p>
        <div className="flex gap-2 flex-wrap">
          {results.integrations.map((integration) => (
            <Badge
              key={integration.integrationId}
              variant={integration.status === 'success' ? 'default' : 'destructive'}
              title={integration.error ? `Error: ${integration.error}` : undefined}
            >
              {integration.integrationName}: {integration.resultCount}
              {integration.status === 'error' && ' ⚠️'}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {results.results.map((result: SearchResultItem) => (
          <Card key={`${result.integrationId}-${result.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <CardDescription>
                    {result.entity} from {result.integrationName}
                  </CardDescription>
                </div>
                <Badge variant="outline">Score: {(result.score * 100).toFixed(0)}%</Badge>
              </div>
            </CardHeader>
            {result.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{result.description}</p>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 text-sm text-primary hover:underline inline-block"
                  >
                    Open in {result.providerName} →
                  </a>
                )}
                {result.highlights && result.highlights.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.highlights.map((highlight, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground italic">
                        ...{highlight}...
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}







