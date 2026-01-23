'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIntegrationProviders } from '@/hooks/use-integration-providers';
import type { IntegrationProviderDocument } from '@/types/integration';

interface IntegrationProviderSelectorProps {
  onSelect: (provider: IntegrationProviderDocument) => void;
  selectedProviderId?: string;
}

export function IntegrationProviderSelector({
  onSelect,
  selectedProviderId,
}: IntegrationProviderSelectorProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useIntegrationProviders({
    status: 'active',
    audience: 'tenant',
  });

  const providers = data?.providers || [];
  
  const filteredProviders = providers.filter((provider) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      provider.displayName.toLowerCase().includes(searchLower) ||
      provider.provider.toLowerCase().includes(searchLower) ||
      provider.description?.toLowerCase().includes(searchLower) ||
      provider.category.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading providers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredProviders.map((provider) => (
          <Card
            key={provider.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedProviderId === provider.id ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => onSelect(provider)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
                  style={{ backgroundColor: provider.color || '#6b7280' }}
                >
                  <span className="text-white text-lg">{provider.icon || '🔌'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{provider.displayName}</h3>
                    {selectedProviderId === provider.id && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {provider.description || 'No description'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {provider.category}
                    </Badge>
                    {provider.supportsSearch && (
                      <Badge variant="outline" className="text-xs">
                        Search
                      </Badge>
                    )}
                    {provider.requiresUserScoping && (
                      <Badge variant="outline" className="text-xs">
                        User Scoped
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {search ? 'No providers found matching your search.' : 'No providers available.'}
        </div>
      )}
    </div>
  );
}







