'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search } from 'lucide-react';
import { CreateTenantDialog } from '@/components/tenants/create-tenant-dialog';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'pro' | 'enterprise';
  domain?: string;
  createdAt: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const { t } = useTranslation(['tenants', 'common']);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, planFilter]);

  const fetchTenants = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('plan', planFilter);

      const response = await fetch(`/api/tenants?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }

      const data = await response.json();
      setTenants(data.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:generic.message' as any));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'inactive':
        return 'outline';
      case 'suspended':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'default';
      case 'pro':
        return 'secondary';
      case 'free':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('tenants:status.active' as any);
      case 'pending': return t('tenants:status.pending' as any);
      case 'inactive': return t('tenants:status.inactive' as any);
      case 'suspended': return t('tenants:status.suspended' as any);
      default: return status;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'enterprise': return t('tenants:plans.enterprise' as any);
      case 'professional': 
      case 'pro': return t('tenants:plans.professional' as any);
      case 'starter':
      case 'free': return t('tenants:plans.starter' as any);
      default: return plan;
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('tenants:title' as any)}</CardTitle>
              <CardDescription>{t('tenants:subtitle' as any)}</CardDescription>
            </div>
            <CreateTenantDialog onSuccess={fetchTenants} />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('tenants:searchPlaceholder' as any)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('common:status' as any)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all' as any)}</SelectItem>
                <SelectItem value="pending">{t('tenants:status.pending' as any)}</SelectItem>
                <SelectItem value="active">{t('tenants:status.active' as any)}</SelectItem>
                <SelectItem value="inactive">{t('tenants:status.inactive' as any)}</SelectItem>
                <SelectItem value="suspended">{t('tenants:status.suspended' as any)}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('tenants:table.plan' as any)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common:all' as any)}</SelectItem>
                <SelectItem value="free">{t('tenants:plans.starter' as any)}</SelectItem>
                <SelectItem value="pro">{t('tenants:plans.professional' as any)}</SelectItem>
                <SelectItem value="enterprise">{t('tenants:plans.enterprise' as any)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('tenants:noTenants' as any)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('tenants:table.name' as any)}</TableHead>
                  <TableHead>{t('tenants:edit.slug' as any)}</TableHead>
                  <TableHead>{t('tenants:table.domain' as any)}</TableHead>
                  <TableHead>{t('tenants:table.status' as any)}</TableHead>
                  <TableHead>{t('tenants:table.plan' as any)}</TableHead>
                  <TableHead>{t('tenants:table.created' as any)}</TableHead>
                  <TableHead>{t('tenants:table.actions' as any)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow
                    key={tenant.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                  >
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
                    <TableCell>{tenant.domain || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(tenant.status)}>
                        {getStatusLabel(tenant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                        {getPlanLabel(tenant.plan)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/tenants/${tenant.id}`);
                        }}
                      >
                        {t('tenants:actions.view' as any)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
