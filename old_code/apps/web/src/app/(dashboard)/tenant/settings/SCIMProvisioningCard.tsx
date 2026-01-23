"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  useSCIMConfig,
  useEnableSCIM,
  useDisableSCIM,
  useRotateSCIMToken,
  useTestSCIMConnection,
} from '@/hooks/use-scim-provisioning'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Users, Copy, Check, ExternalLink, RotateCw, TestTube } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function SCIMProvisioningCard() {
  const { user } = useAuth()
  const tenantId = user?.tenantId || ''
  const { data: config, isLoading, isError, refetch } = useSCIMConfig(tenantId)
  const enableSCIM = useEnableSCIM()
  const disableSCIM = useDisableSCIM()
  const rotateToken = useRotateSCIMToken()
  const testConnection = useTestSCIMConnection()

  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDisableDialog, setShowDisableDialog] = useState(false)

  const handleEnable = async () => {
    enableSCIM.mutate(tenantId, {
      onSuccess: (data) => {
        setNewToken(data.token)
        setShowTokenDialog(true)
        refetch()
      },
    })
  }

  const handleDisable = async () => {
    disableSCIM.mutate(tenantId, {
      onSuccess: () => {
        setShowDisableDialog(false)
        refetch()
      },
    })
  }

  const handleRotate = async () => {
    rotateToken.mutate(tenantId, {
      onSuccess: (data) => {
        setNewToken(data.token)
        setShowTokenDialog(true)
        refetch()
      },
    })
  }

  const handleTest = async () => {
    testConnection.mutate(tenantId)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SCIM Provisioning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading SCIM configuration...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>SCIM Provisioning</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load SCIM configuration.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const isEnabled = config?.enabled ?? false

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>SCIM Provisioning</CardTitle>
          </div>
          <CardDescription>
            Enable SCIM 2.0 provisioning to automatically sync users and groups from your identity provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEnabled ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  SCIM provisioning is currently disabled. Enable it to allow your identity provider to automatically
                  manage users and groups.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleEnable}
                disabled={enableSCIM.isPending}
                className="w-full sm:w-auto"
              >
                {enableSCIM.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Enable SCIM Provisioning
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Enabled</Badge>
                  {config?.createdAt && (
                    <span className="text-sm text-muted-foreground">
                      Enabled {format(new Date(config.createdAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDisableDialog(true)}
                  disabled={disableSCIM.isPending}
                >
                  {disableSCIM.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    'Disable'
                  )}
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>SCIM Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config?.endpointUrl || ''}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(config?.endpointUrl || '')}
                      title="Copy endpoint URL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this URL in your identity provider's SCIM configuration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Authentication Token</Label>
                  <Alert>
                    <AlertDescription>
                      Your SCIM token is stored securely. Rotate it if you suspect it has been compromised.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="outline"
                    onClick={handleRotate}
                    disabled={rotateToken.isPending}
                  >
                    {rotateToken.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rotating...
                      </>
                    ) : (
                      <>
                        <RotateCw className="mr-2 h-4 w-4" />
                        Rotate Token
                      </>
                    )}
                  </Button>
                  {config?.lastRotatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last rotated: {format(new Date(config.lastRotatedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Connection Test</Label>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Verify that your SCIM endpoint is accessible and responding correctly
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SCIM Authentication Token</DialogTitle>
            <DialogDescription>
              Save this token securely. You will not be able to see it again after closing this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Token</Label>
              <div className="flex gap-2">
                <Input
                  value={newToken || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => newToken && copyToClipboard(newToken)}
                  title="Copy token"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                This token is required for SCIM authentication. Store it securely in your identity provider's
                configuration.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTokenDialog(false)}>I've Saved the Token</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable SCIM Provisioning?</DialogTitle>
            <DialogDescription>
              Disabling SCIM will stop automatic user and group synchronization from your identity provider.
              This action cannot be undone, but you can re-enable SCIM later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disableSCIM.isPending}>
              {disableSCIM.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable SCIM'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}









