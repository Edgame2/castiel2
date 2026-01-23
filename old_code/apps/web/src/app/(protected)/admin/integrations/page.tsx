'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIntegrationProviders } from '@/hooks/use-integration-providers';
import { IntegrationProviderFilters } from '@/components/integrations/integration-provider-filters';

export default function AdminIntegrationsPage() {
  const { t } = useTranslation(['common'] as any);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{
    category?: string;
    status?: string;
    audience?: string;
    supportsSearch?: boolean;
    supportsNotifications?: boolean;
    requiresUserScoping?: boolean;
  }>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, isLoading } = useIntegrationProviders(filters);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('admin.integrations.title', 'Integration Providers')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.integrations.subtitle', 'Manage system-level integration providers.')}
          </p>
        </div>
        <Button asChild>
          <a href="/admin/integrations/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.integrations.create', 'Create Provider')}
          </a>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.integrations.search', 'Search providers...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline">
              Filters
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="rounded-lg border p-4">
              <IntegrationProviderFilters
                onFilterChange={setFilters}
                initialFilters={filters}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.integrations.name', 'Name')}</TableHead>
              <TableHead>{t('admin.integrations.category', 'Category')}</TableHead>
              <TableHead>{t('admin.integrations.status', 'Status')}</TableHead>
              <TableHead>{t('admin.integrations.audience', 'Audience')}</TableHead>
              <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t('common.loading', 'Loading...')}
                </TableCell>
              </TableRow>
            ) : data?.providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t('admin.integrations.empty', 'No providers found.')}
                </TableCell>
              </TableRow>
            ) : (
              data?.providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.displayName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{provider.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        provider.status === 'active'
                          ? 'default'
                          : provider.status === 'beta'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {provider.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{provider.audience}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      {t('common.edit', 'Edit')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
