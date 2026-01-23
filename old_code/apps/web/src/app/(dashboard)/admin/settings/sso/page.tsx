'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Shield,
  Settings,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Play,
  Power,
  PowerOff,
  Trash2,
  Download,
  Info,
} from 'lucide-react'
import {
  useSSOConfig,
  useCreateSSOConfig,
  useUpdateSSOConfig,
  useDeleteSSOConfig,
  useActivateSSOConfig,
  useDeactivateSSOConfig,
  useValidateSSOConfig,
  useTestSSOConnection,
} from '@/hooks/use-sso-config'
import { ssoConfigApi } from '@/lib/api/sso-config'
import type { SSOConfiguration, CreateSSOConfigRequest } from '@/types/sso-config'

export default function SSOConfigurationPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)('settings')
  const { data: config, isLoading, error } = useSSOConfig()
  const createMutation = useCreateSSOConfig()
  const updateMutation = useUpdateSSOConfig()
  const deleteMutation = useDeleteSSOConfig()
  const activateMutation = useActivateSSOConfig()
  const deactivateMutation = useDeactivateSSOConfig()
  const validateMutation = useValidateSSOConfig()
  const testMutation = useTestSSOConnection()

  const [copied, setCopied] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Form state for new/edit
  const [formData, setFormData] = useState<Partial<CreateSSOConfigRequest>>({
    orgName: '',
    provider: 'saml',
    samlConfig: {
      entityId: '',
      entryPoint: '',
      issuer: '',
      callbackUrl: typeof window !== 'undefined' 
        ? `${window.location.origin}/api/auth/sso-callback` 
        : '',
      idpCert: '',
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      },
    },
    jitProvisioning: {
      enabled: true,
      autoActivate: true,
      defaultRole: 'user',
      allowedDomains: [],
    },
  })

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSaveConfig = async () => {
    if (config) {
      await updateMutation.mutateAsync({
        orgName: formData.orgName,
        samlConfig: formData.samlConfig,
        jitProvisioning: formData.jitProvisioning,
      })
    } else {
      await createMutation.mutateAsync(formData as CreateSSOConfigRequest)
    }
  }

  const handleDeleteConfig = async () => {
    await deleteMutation.mutateAsync()
    setShowDeleteDialog(false)
  }

  // Initialize form with existing config
  useState(() => {
    if (config) {
      setFormData({
        orgName: config.orgName,
        provider: config.provider,
        samlConfig: config.samlConfig,
        jitProvisioning: config.jitProvisioning,
      })
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load SSO configuration</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SSO Configuration</h1>
          <p className="text-muted-foreground">
            Configure Single Sign-On for your organization
          </p>
        </div>
        {config && (
          <div className="flex items-center gap-2">
            <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
              {config.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        )}
      </div>

      {/* Status Card */}
      {config && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  <Shield className={`h-5 w-5 ${config.status === 'active' ? 'text-green-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">SSO Status</CardTitle>
                  <CardDescription>
                    {config.status === 'active' 
                      ? 'Users can sign in with SSO' 
                      : 'SSO is currently disabled'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {config.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    onClick={() => deactivateMutation.mutate()}
                    disabled={deactivateMutation.isPending}
                  >
                    <PowerOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </Button>
                ) : (
                  <Button 
                    onClick={() => activateMutation.mutate()}
                    disabled={activateMutation.isPending}
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Activate SSO
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Service Provider Info */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Service Provider Information
            </CardTitle>
            <CardDescription>
              Use these values to configure your Identity Provider (IdP)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity ID (Audience URI)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={config.samlConfig.entityId} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(config.samlConfig.entityId, 'entityId')}
                  >
                    {copied === 'entityId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>ACS URL (Reply URL)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={config.samlConfig.callbackUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(config.samlConfig.callbackUrl, 'acs')}
                  >
                    {copied === 'acs' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Metadata URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={ssoConfigApi.getMetadataUrl(config.orgId)} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(ssoConfigApi.getMetadataUrl(config.orgId), 'metadata')}
                >
                  {copied === 'metadata' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => window.open(ssoConfigApi.getMetadataUrl(config.orgId), '_blank')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {config ? 'Edit Configuration' : 'Setup SSO'}
          </CardTitle>
          <CardDescription>
            {config 
              ? 'Update your SSO configuration settings' 
              : 'Configure SAML-based Single Sign-On for your organization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="saml">SAML Settings</TabsTrigger>
              <TabsTrigger value="provisioning">User Provisioning</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  placeholder="Your Organization"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">SSO Provider</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value: any) => setFormData({ ...formData, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saml">Generic SAML 2.0</SelectItem>
                    <SelectItem value="azure_ad">Azure AD</SelectItem>
                    <SelectItem value="okta">Okta</SelectItem>
                    <SelectItem value="google_workspace">Google Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="saml" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="entryPoint">IdP SSO URL (Entry Point)</Label>
                <Input
                  id="entryPoint"
                  value={formData.samlConfig?.entryPoint}
                  onChange={(e) => setFormData({
                    ...formData,
                    samlConfig: { ...formData.samlConfig!, entryPoint: e.target.value }
                  })}
                  placeholder="https://idp.example.com/sso/saml"
                />
                <p className="text-xs text-muted-foreground">
                  The URL where SAML requests should be sent
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuer">IdP Issuer / Entity ID</Label>
                <Input
                  id="issuer"
                  value={formData.samlConfig?.issuer}
                  onChange={(e) => setFormData({
                    ...formData,
                    samlConfig: { ...formData.samlConfig!, issuer: e.target.value }
                  })}
                  placeholder="https://idp.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idpCert">IdP Certificate (X.509)</Label>
                <Textarea
                  id="idpCert"
                  value={formData.samlConfig?.idpCert}
                  onChange={(e) => setFormData({
                    ...formData,
                    samlConfig: { ...formData.samlConfig!, idpCert: e.target.value }
                  })}
                  placeholder="-----BEGIN CERTIFICATE-----
MIICpDCCAYwC...
-----END CERTIFICATE-----"
                  className="font-mono text-sm min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the X.509 certificate from your IdP
                </p>
              </div>

              <Separator className="my-4" />

              <h4 className="font-medium">Attribute Mapping</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emailAttr">Email Attribute</Label>
                  <Input
                    id="emailAttr"
                    value={formData.samlConfig?.attributeMapping?.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      samlConfig: {
                        ...formData.samlConfig!,
                        attributeMapping: {
                          ...formData.samlConfig!.attributeMapping,
                          email: e.target.value
                        }
                      }
                    })}
                    placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstNameAttr">First Name Attribute</Label>
                  <Input
                    id="firstNameAttr"
                    value={formData.samlConfig?.attributeMapping?.firstName}
                    onChange={(e) => setFormData({
                      ...formData,
                      samlConfig: {
                        ...formData.samlConfig!,
                        attributeMapping: {
                          ...formData.samlConfig!.attributeMapping,
                          firstName: e.target.value
                        }
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastNameAttr">Last Name Attribute</Label>
                  <Input
                    id="lastNameAttr"
                    value={formData.samlConfig?.attributeMapping?.lastName}
                    onChange={(e) => setFormData({
                      ...formData,
                      samlConfig: {
                        ...formData.samlConfig!,
                        attributeMapping: {
                          ...formData.samlConfig!.attributeMapping,
                          lastName: e.target.value
                        }
                      }
                    })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="provisioning" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Just-in-Time Provisioning</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create user accounts on first SSO login
                  </p>
                </div>
                <Switch
                  checked={formData.jitProvisioning?.enabled}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    jitProvisioning: { ...formData.jitProvisioning!, enabled: checked }
                  })}
                />
              </div>

              {formData.jitProvisioning?.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-activate Users</Label>
                      <p className="text-sm text-muted-foreground">
                        New users are immediately active without admin approval
                      </p>
                    </div>
                    <Switch
                      checked={formData.jitProvisioning?.autoActivate}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        jitProvisioning: { ...formData.jitProvisioning!, autoActivate: checked }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultRole">Default Role</Label>
                    <Select
                      value={formData.jitProvisioning?.defaultRole}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        jitProvisioning: { ...formData.jitProvisioning!, defaultRole: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select default role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allowedDomains">Allowed Email Domains</Label>
                    <Input
                      id="allowedDomains"
                      value={formData.jitProvisioning?.allowedDomains?.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData,
                        jitProvisioning: {
                          ...formData.jitProvisioning!,
                          allowedDomains: e.target.value.split(',' as any).map(d => d.trim()).filter(Boolean)
                        }
                      })}
                      placeholder="example.com, company.org"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to allow all domains. Separate multiple domains with commas.
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          {config && (
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Configuration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete SSO Configuration?</DialogTitle>
                  <DialogDescription>
                    This will remove the SSO configuration and users will no longer be able to sign in with SSO.
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteConfig}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="outline"
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Validate
            </Button>
            <Button 
              onClick={handleSaveConfig}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {config ? 'Save Changes' : 'Create Configuration'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Validation Results */}
      {validateMutation.data && (
        <Alert variant={validateMutation.data.valid ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {validateMutation.data.valid ? 'Configuration Valid' : 'Validation Errors'}
          </AlertTitle>
          <AlertDescription>
            {validateMutation.data.valid ? (
              'Your SSO configuration is valid and ready to use.'
            ) : (
              <ul className="list-disc list-inside mt-2">
                {validateMutation.data.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

