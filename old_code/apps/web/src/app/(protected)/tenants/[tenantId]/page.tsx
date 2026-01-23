'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { TenantJoinRequestsPanel } from '@/components/tenants/join-requests-panel';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'pro' | 'enterprise';
  domain?: string;
  settings: {
    branding?: {
      logo?: string;
      primaryColor?: string;
    };
    features?: {
      ssoEnabled?: boolean;
      mfaRequired?: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export default function TenantDetailsPage() {
  const { t } = useTranslation('tenants');
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tenant');
      }

      const data = await response.json();
      setTenant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/activate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to activate tenant');
      }

      await fetchTenant();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate tenant');
    } finally {
      setIsActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('detail.confirmDelete' as any, { name: tenant?.name }))) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tenant');
      }

      router.push('/tenants');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

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

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/tenants')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('detail.backToList' as any)}
        </Button>
        <div className="flex gap-2">
          {tenant.status === 'pending' && (
            <Button onClick={handleActivate} disabled={isActivating}>
              {isActivating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {t('actions.activate' as any)}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/tenants/${tenantId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('actions.edit' as any)}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {t('actions.delete' as any)}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{tenant.name}</CardTitle>
                <CardDescription>{t('detail.description' as any)}</CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(tenant.status)}>
                {t(`status.${tenant.status}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">{t('detail.overview' as any)}</TabsTrigger>
                <TabsTrigger value="settings">{t('detail.settings' as any)}</TabsTrigger>
                <TabsTrigger value="membership">{t('detail.membership' as any)}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">{t('detail.orgId' as any)}</p>
                    <p className="text-sm text-muted-foreground font-mono">{tenant.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('detail.slug' as any)}</p>
                    <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('detail.plan' as any)}</p>
                    <p className="text-sm text-muted-foreground capitalize">{tenant.plan}</p>
                  </div>
                  {tenant.domain && (
                    <div>
                      <p className="text-sm font-medium">{t('detail.customDomain' as any)}</p>
                      <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{t('detail.createdAt' as any)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('detail.lastUpdated' as any)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tenant.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-lg font-medium mb-3">{t('detail.features' as any)}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('detail.ssoEnabled' as any)}</span>
                      <Badge variant={tenant.settings.features?.ssoEnabled ? 'default' : 'outline'}>
                        {tenant.settings.features?.ssoEnabled ? t('detail.yes' as any) : t('detail.no' as any)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('detail.mfaRequired' as any)}</span>
                      <Badge variant={tenant.settings.features?.mfaRequired ? 'default' : 'outline'}>
                        {tenant.settings.features?.mfaRequired ? t('detail.yes' as any) : t('detail.no' as any)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {tenant.settings.branding && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">{t('detail.branding' as any)}</h3>
                    <div className="space-y-2">
                      {tenant.settings.branding.logo && (
                        <div>
                          <p className="text-sm font-medium">{t('detail.logoUrl' as any)}</p>
                          <p className="text-sm text-muted-foreground break-all">
                            {tenant.settings.branding.logo}
                          </p>
                        </div>
                      )}
                      {tenant.settings.branding.primaryColor && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{t('detail.primaryColor' as any)}</p>
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: tenant.settings.branding.primaryColor }}
                          />
                          <p className="text-sm text-muted-foreground">
                            {tenant.settings.branding.primaryColor}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="membership" className="mt-4">
                <TenantJoinRequestsPanel tenantId={tenant.id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
