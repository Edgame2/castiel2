'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  domain?: string;
  settings?: {
    branding?: {
      logo?: string;
      primaryColor?: string;
    };
    features?: {
      ssoEnabled?: boolean;
      mfaRequired?: boolean;
    };
  };
  metadata?: {
    adminContactEmail?: string;
  };
}

export default function EditTenantPage() {
  const { t } = useTranslation('tenants');
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: '',
    plan: '',
    status: '',
    adminContactEmail: '',
    primaryColor: '',
    ssoEnabled: false,
    mfaRequired: false,
  });

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
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        domain: data.domain || '',
        plan: data.plan || 'starter',
        status: data.status || 'active',
        adminContactEmail: data.metadata?.adminContactEmail || '',
        primaryColor: data.settings?.branding?.primaryColor || '',
        ssoEnabled: data.settings?.features?.ssoEnabled || false,
        mfaRequired: data.settings?.features?.mfaRequired || false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain || undefined,
          plan: formData.plan,
          status: formData.status,
          settings: {
            branding: {
              primaryColor: formData.primaryColor || undefined,
            },
            features: {
              ssoEnabled: formData.ssoEnabled,
              mfaRequired: formData.mfaRequired,
            },
          },
          metadata: {
            adminContactEmail: formData.adminContactEmail || undefined,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to update tenant');
      }

      toast.success(t('edit.success' as any));
      router.push(`/tenants/${tenantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setIsSaving(false);
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

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push(`/tenants/${tenantId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('edit.backToDetails' as any)}
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('edit.title' as any)}</CardTitle>
          <CardDescription>{t('edit.description' as any)}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('edit.basicInfo' as any)}</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="name">{t('edit.name' as any)}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slug">{t('edit.slug' as any)}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t('edit.slugHelp' as any)}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="domain">{t('edit.domain' as any)}</Label>
                <Input
                  id="domain"
                  placeholder={t('edit.domainPlaceholder' as any)}
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  disabled={isSaving}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminEmail">{t('edit.adminEmail' as any)}</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminContactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminContactEmail: e.target.value }))}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('edit.planStatus' as any)}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan">{t('edit.plan' as any)}</Label>
                  <Select
                    value={formData.plan}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="starter">{t('plans.starter' as any)}</SelectItem>
                      <SelectItem value="professional">{t('plans.professional' as any)}</SelectItem>
                      <SelectItem value="enterprise">{t('plans.enterprise' as any)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">{t('edit.status' as any)}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('status.pending' as any)}</SelectItem>
                      <SelectItem value="active">{t('status.active' as any)}</SelectItem>
                      <SelectItem value="suspended">{t('status.suspended' as any)}</SelectItem>
                      <SelectItem value="inactive">{t('status.inactive' as any)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('edit.branding' as any)}</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="primaryColor">{t('edit.primaryColor' as any)}</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="text"
                    placeholder={t('edit.primaryColorPlaceholder' as any)}
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    disabled={isSaving}
                    className="flex-1"
                  />
                  {formData.primaryColor && (
                    <div
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: formData.primaryColor }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('edit.security' as any)}</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ssoEnabled">{t('edit.ssoEnabled' as any)}</Label>
                  <p className="text-xs text-muted-foreground">{t('edit.ssoEnabledHelp' as any)}</p>
                </div>
                <input
                  type="checkbox"
                  id="ssoEnabled"
                  checked={formData.ssoEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, ssoEnabled: e.target.checked }))}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mfaRequired">{t('edit.mfaRequired' as any)}</Label>
                  <p className="text-xs text-muted-foreground">{t('edit.mfaRequiredHelp' as any)}</p>
                </div>
                <input
                  type="checkbox"
                  id="mfaRequired"
                  checked={formData.mfaRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, mfaRequired: e.target.checked }))}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/tenants/${tenantId}`)}
                disabled={isSaving}
              >
                {t('edit.cancel' as any)}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('edit.saving' as any)}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('edit.save' as any)}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

