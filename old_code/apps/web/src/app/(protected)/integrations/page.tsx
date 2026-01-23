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
import { useIntegrations } from '@/hooks/use-integrations';

export default function IntegrationsPage() {
  const { t } = useTranslation(['common'] as any);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useIntegrations();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('integrations.title', 'Integrations')}
          </h1>
          <p className="text-muted-foreground">
            {t('integrations.subtitle', 'Manage your integration connections.')}
          </p>
        </div>
        <Button asChild>
          <a href="/integrations/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('integrations.create', 'Add Integration')}
          </a>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('integrations.search', 'Search integrations...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('integrations.name', 'Name')}</TableHead>
              <TableHead>{t('integrations.provider', 'Provider')}</TableHead>
              <TableHead>{t('integrations.status', 'Status')}</TableHead>
              <TableHead>{t('integrations.connection', 'Connection')}</TableHead>
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
            ) : data?.integrations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t('integrations.empty', 'No integrations found.')}
                </TableCell>
              </TableRow>
            ) : (
              data?.integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell className="font-medium">{integration.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{integration.providerName}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        integration.status === 'connected'
                          ? 'default'
                          : integration.status === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {integration.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        integration.connectionStatus === 'active'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {integration.connectionStatus || 'unknown'}
                    </Badge>
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
