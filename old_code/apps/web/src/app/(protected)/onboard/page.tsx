'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface TenantFormData {
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  domain?: string;
  adminEmail: string;
  adminName: string;
}

export default function OnboardPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    plan: 'free',
    domain: '',
    adminEmail: '',
    adminName: '',
  });

  const handleInputChange = (field: keyof TenantFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);

    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.slug) {
        setError(t('onboard.errors.nameRequired', 'Organization name is required'));
        return;
      }
    } else if (step === 2) {
      if (!formData.adminEmail || !formData.adminName) {
        setError(t('onboard.errors.adminRequired', 'Admin details are required'));
        return;
      }
    }
    setError(null);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          plan: formData.plan,
          domain: formData.domain || undefined,
          settings: {
            branding: {},
            features: {},
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create organization');
      }

      const tenant = await response.json();
      router.push(`/tenants/${tenant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabels = [
    t('onboard.steps.basicInfo', 'Basic Information'),
    t('onboard.steps.adminDetails', 'Admin Details'),
    t('onboard.steps.review', 'Review & Confirm'),
  ];

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('onboard.title', 'Create Your Organization')}</CardTitle>
          <CardDescription>
            {t('onboard.step', 'Step {{current}} of {{total}}', { current: step, total: 3 })}: {stepLabels[step - 1]}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('onboard.orgName', 'Organization Name')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">{t('onboard.orgSlug', 'Organization Slug')} *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="acme-corp"
                />
                <p className="text-sm text-muted-foreground">
                  {t('onboard.slugHelp', 'Used in URLs and API calls. Only lowercase letters, numbers, and hyphens.')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">{t('onboard.customDomain', 'Custom Domain')} ({t('optional' as any)})</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  placeholder="acme.com"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">{t('onboard.adminName', 'Admin Name')} *</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => handleInputChange('adminName', e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">{t('onboard.adminEmail', 'Admin Email')} *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  placeholder="admin@acme.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">{t('onboard.plan', 'Subscription Plan')} *</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => handleInputChange('plan', value)}
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{t('onboard.plans.free', 'Free - Basic features')}</SelectItem>
                    <SelectItem value="pro">{t('onboard.plans.pro', 'Pro - Advanced features')}</SelectItem>
                    <SelectItem value="enterprise">{t('onboard.plans.enterprise', 'Enterprise - Full features')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">{t('onboard.orgName', 'Organization Name')}</p>
                  <p className="text-sm text-muted-foreground">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('onboard.orgSlug', 'Slug')}</p>
                  <p className="text-sm text-muted-foreground">{formData.slug}</p>
                </div>
                {formData.domain && (
                  <div>
                    <p className="text-sm font-medium">{t('onboard.customDomain', 'Custom Domain')}</p>
                    <p className="text-sm text-muted-foreground">{formData.domain}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{t('onboard.admin', 'Admin')}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.adminName} ({formData.adminEmail})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t('onboard.plan', 'Plan')}</p>
                  <p className="text-sm text-muted-foreground capitalize">{formData.plan}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isLoading}
          >
            {t('back' as any)}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} disabled={isLoading}>
              {t('next' as any)}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('onboard.createOrg', 'Create Organization')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
