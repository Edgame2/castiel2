"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Save, Shield, Bell, Globe } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTenant, useUpdateTenant } from "@/hooks/use-tenants"
import { useAuth } from "@/contexts/auth-context"
import { useMFAPolicy, useUpdateMFAPolicy } from '@/hooks/use-mfa'
import type { TenantPlan, TenantStatus, UpdateTenantRequest } from "@/lib/api/tenants"
import type { MFAMethodType, MFAEnforcementLevel } from '@/types/mfa'
import MFAPolicyCard from './MFAPolicyCard'
import SCIMProvisioningCard from './SCIMProvisioningCard'


export default function TenantSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ''
  const { data: tenant, isLoading } = useTenant(tenantId)
  const updateTenant = useUpdateTenant()

  const [formData, setFormData] = useState<UpdateTenantRequest>({})
  const [hasChanges, setHasChanges] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSettingsChange = (path: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [path]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleNestedSettingsChange = (category: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [category]: {
          ...(prev.settings?.[category as keyof typeof prev.settings] as any),
          [field]: value,
        },
      },
    }))
    setHasChanges(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !hasChanges) return

    updateTenant.mutate(
      { id: tenant.id, data: formData },
      {
        onSuccess: () => {
          setFormData({})
          setHasChanges(false)
        },
      }
    )
  }

  const handleReset = () => {
    setFormData({})
    setHasChanges(false)
  }

  // Get current values (form data or tenant data)
  const currentName = formData.name !== undefined ? formData.name : (tenant?.name || '')
  const currentSlug = formData.slug !== undefined ? formData.slug : (tenant?.slug || '')
  const currentDomain = formData.domain !== undefined ? formData.domain : (tenant?.domain || '')
  const currentPlan = (formData.plan !== undefined ? formData.plan : tenant?.plan) as TenantPlan
  const currentSettings = { ...tenant?.settings, ...formData.settings }

  const getStatusBadge = (status: TenantStatus) => {
    const variants = {
      active: 'default',
      pending: 'secondary',
      inactive: 'outline',
      suspended: 'destructive',
    } as const
    return variants[status] || 'outline'
  }

  const getPlanBadge = (plan: TenantPlan) => {
    const variants = {
      free: 'outline',
      pro: 'default',
      enterprise: 'secondary',
    } as const
    return variants[plan] || 'outline'
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Alert variant="destructive">
          <AlertDescription>
            Tenant not found or you don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Tenant Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your organization's settings and configuration
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Basic tenant information and identification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={currentName}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={currentSlug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="acme-corp"
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and API calls
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Custom Domain</Label>
                <Input
                  id="domain"
                  value={currentDomain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  placeholder="acme.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Optional custom domain for your organization
                </p>
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={getPlanBadge(currentPlan)}>
                    {currentPlan?.toUpperCase()}
                  </Badge>
                  <Badge variant={getStatusBadge(tenant.status)}>
                    {tenant.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Tenant ID</p>
                <p className="font-mono">{tenant.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Region</p>
                <p>{tenant.region || 'Default'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{format(new Date(tenant.createdAt), "MMM d, yyyy 'at' HH:mm")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p>{format(new Date(tenant.updatedAt), "MMM d, yyyy 'at' HH:mm")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features & Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Features & Limits</CardTitle>
            </div>
            <CardDescription>
              Configure available features and resource limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Maximum Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={currentSettings?.maxUsers || ''}
                  onChange={(e) =>
                    handleSettingsChange('maxUsers', parseInt(e.target.value) || undefined)
                  }
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStorage">Maximum Storage (GB)</Label>
                <Input
                  id="maxStorage"
                  type="number"
                  value={currentSettings?.maxStorage || ''}
                  onChange={(e) =>
                    handleSettingsChange('maxStorage', parseInt(e.target.value) || undefined)
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Enabled Features</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="feature-sso">Single Sign-On (SSO)</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable SAML/OIDC authentication
                    </p>
                  </div>
                  <Switch
                    id="feature-sso"
                    checked={currentSettings?.features?.sso || false}
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange('features', 'sso', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="feature-mfa">Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require MFA for user accounts
                    </p>
                  </div>
                  <Switch
                    id="feature-mfa"
                    checked={currentSettings?.features?.mfa || false}
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange('features', 'mfa', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="feature-audit">Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Track user actions and changes
                    </p>
                  </div>
                  <Switch
                    id="feature-audit"
                    checked={currentSettings?.features?.audit || false}
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange('features', 'audit', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="feature-api">API Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable REST API access
                    </p>
                  </div>
                  <Switch
                    id="feature-api"
                    checked={currentSettings?.features?.apiAccess || false}
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange('features', 'apiAccess', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="feature-branding">Custom Branding</Label>
                    <p className="text-sm text-muted-foreground">
                      Customize colors and logos
                    </p>
                  </div>
                  <Switch
                    id="feature-branding"
                    checked={currentSettings?.features?.customBranding || false}
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange('features', 'customBranding', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security Settings</CardTitle>
            </div>
            <CardDescription>
              Configure security policies and session management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Password Policy</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pwd-minLength">Minimum Length</Label>
                  <Input
                    id="pwd-minLength"
                    type="number"
                    min="8"
                    max="32"
                    value={currentSettings?.security?.passwordPolicy?.minLength || ''}
                    onChange={(e) =>
                      handleNestedSettingsChange(
                        'security',
                        'passwordPolicy',
                        {
                          ...currentSettings?.security?.passwordPolicy,
                          minLength: parseInt(e.target.value) || undefined,
                        }
                      )
                    }
                    placeholder="8"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pwd-expiry">Password Expiry (days)</Label>
                  <Input
                    id="pwd-expiry"
                    type="number"
                    value={currentSettings?.security?.passwordPolicy?.expiryDays || ''}
                    onChange={(e) =>
                      handleNestedSettingsChange(
                        'security',
                        'passwordPolicy',
                        {
                          ...currentSettings?.security?.passwordPolicy,
                          expiryDays: parseInt(e.target.value) || undefined,
                        }
                      )
                    }
                    placeholder="Never"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pwd-uppercase">Require Uppercase Letters</Label>
                  <Switch
                    id="pwd-uppercase"
                    checked={
                      currentSettings?.security?.passwordPolicy?.requireUppercase || false
                    }
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange(
                        'security',
                        'passwordPolicy',
                        {
                          ...currentSettings?.security?.passwordPolicy,
                          requireUppercase: checked,
                        }
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="pwd-numbers">Require Numbers</Label>
                  <Switch
                    id="pwd-numbers"
                    checked={
                      currentSettings?.security?.passwordPolicy?.requireNumbers || false
                    }
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange(
                        'security',
                        'passwordPolicy',
                        {
                          ...currentSettings?.security?.passwordPolicy,
                          requireNumbers: checked,
                        }
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="pwd-symbols">Require Symbols</Label>
                  <Switch
                    id="pwd-symbols"
                    checked={
                      currentSettings?.security?.passwordPolicy?.requireSymbols || false
                    }
                    onCheckedChange={(checked) =>
                      handleNestedSettingsChange(
                        'security',
                        'passwordPolicy',
                        {
                          ...currentSettings?.security?.passwordPolicy,
                          requireSymbols: checked,
                        }
                      )
                    }
                  />
                </div>
              </div>
            </div>


            {/* MFA Policy */}
            <MFAPolicyCard />

            {/* SCIM Provisioning */}
            <SCIMProvisioningCard />

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={currentSettings?.security?.sessionTimeout || ''}
                onChange={(e) =>
                  handleNestedSettingsChange(
                    'security',
                    'sessionTimeout',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Automatically log out inactive users after this duration
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure notification channels and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications via email
                </p>
              </div>
              <Switch
                id="notif-email"
                checked={currentSettings?.notifications?.email || false}
                onCheckedChange={(checked) =>
                  handleNestedSettingsChange('notifications', 'email', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-slack">Slack Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to Slack
                </p>
              </div>
              <Switch
                id="notif-slack"
                checked={currentSettings?.notifications?.slack || false}
                onCheckedChange={(checked) =>
                  handleNestedSettingsChange('notifications', 'slack', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notif-webhook">Webhook Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send notifications to custom webhooks
                </p>
              </div>
              <Switch
                id="notif-webhook"
                checked={currentSettings?.notifications?.webhook || false}
                onCheckedChange={(checked) =>
                  handleNestedSettingsChange('notifications', 'webhook', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || updateTenant.isPending}
          >
            Reset Changes
          </Button>
          <Button
            type="submit"
            disabled={!hasChanges || updateTenant.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateTenant.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
