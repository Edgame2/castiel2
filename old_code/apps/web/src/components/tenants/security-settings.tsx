'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Shield, 
  Clock, 
  Monitor, 
  Globe, 
  Plus, 
  X, 
  Save, 
  Loader2, 
  AlertTriangle,
  Info 
} from 'lucide-react'
import { toast } from 'sonner'

interface SecuritySettings {
  sessionIdleTimeoutMinutes?: number
  maxConcurrentSessions?: number
  requireReauthOnIdle?: boolean
  ipAllowlistEnabled?: boolean
  ipAllowlist?: string[]
}

interface TenantSecuritySettingsProps {
  tenantId: string
  initialSettings?: SecuritySettings
  onSave?: (settings: SecuritySettings) => void
}

export function TenantSecuritySettings({
  tenantId,
  initialSettings,
  onSave,
}: TenantSecuritySettingsProps) {
  const queryClient = useQueryClient()
  
  // Session settings
  const [sessionIdleTimeout, setSessionIdleTimeout] = useState(
    initialSettings?.sessionIdleTimeoutMinutes?.toString() || '30'
  )
  const [maxConcurrentSessions, setMaxConcurrentSessions] = useState(
    initialSettings?.maxConcurrentSessions?.toString() || '5'
  )
  const [requireReauthOnIdle, setRequireReauthOnIdle] = useState(
    initialSettings?.requireReauthOnIdle ?? true
  )
  
  // IP allowlist settings
  const [ipAllowlistEnabled, setIpAllowlistEnabled] = useState(
    initialSettings?.ipAllowlistEnabled ?? false
  )
  const [ipAllowlist, setIpAllowlist] = useState<string[]>(
    initialSettings?.ipAllowlist || []
  )
  const [newIpAddress, setNewIpAddress] = useState('')

  // Update local state when initialSettings change
  useEffect(() => {
    if (initialSettings) {
      setSessionIdleTimeout(initialSettings.sessionIdleTimeoutMinutes?.toString() || '30')
      setMaxConcurrentSessions(initialSettings.maxConcurrentSessions?.toString() || '5')
      setRequireReauthOnIdle(initialSettings.requireReauthOnIdle ?? true)
      setIpAllowlistEnabled(initialSettings.ipAllowlistEnabled ?? false)
      setIpAllowlist(initialSettings.ipAllowlist || [])
    }
  }, [initialSettings])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: SecuritySettings) => {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { security: settings },
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to save settings' }))
        throw new Error(error.message)
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Security settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save security settings')
    },
  })

  const handleAddIp = () => {
    if (!newIpAddress.trim()) return
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^(\d{1,3}\.){2}\d{1,3}\.\*$|^\*$/
    if (!ipRegex.test(newIpAddress.trim())) {
      toast.error('Invalid IP address format. Use format: 192.168.1.1 or 192.168.1.*')
      return
    }
    
    if (ipAllowlist.includes(newIpAddress.trim())) {
      toast.error('This IP address is already in the allowlist')
      return
    }
    
    setIpAllowlist([...ipAllowlist, newIpAddress.trim()])
    setNewIpAddress('')
  }

  const handleRemoveIp = (ip: string) => {
    setIpAllowlist(ipAllowlist.filter(item => item !== ip))
  }

  const handleSave = () => {
    const settings: SecuritySettings = {
      sessionIdleTimeoutMinutes: parseInt(sessionIdleTimeout) || 0,
      maxConcurrentSessions: parseInt(maxConcurrentSessions) || 0,
      requireReauthOnIdle,
      ipAllowlistEnabled,
      ipAllowlist: ipAllowlistEnabled ? ipAllowlist : [],
    }
    
    saveMutation.mutate(settings)
    onSave?.(settings)
  }

  return (
    <div className="space-y-6">
      {/* Session Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Security
          </CardTitle>
          <CardDescription>
            Configure session timeouts and limits for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Idle Timeout */}
          <div className="space-y-2">
            <Label htmlFor="idleTimeout">Session Idle Timeout (minutes)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="idleTimeout"
                type="number"
                min="0"
                max="480"
                value={sessionIdleTimeout}
                onChange={(e) => setSessionIdleTimeout(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                0 = no timeout
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Users will be logged out after this period of inactivity
            </p>
          </div>

          <Separator />

          {/* Max Concurrent Sessions */}
          <div className="space-y-2">
            <Label htmlFor="maxSessions">Maximum Concurrent Sessions</Label>
            <div className="flex items-center gap-2">
              <Input
                id="maxSessions"
                type="number"
                min="0"
                max="100"
                value={maxConcurrentSessions}
                onChange={(e) => setMaxConcurrentSessions(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                0 = unlimited
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Oldest sessions will be terminated when limit is reached
            </p>
          </div>

          <Separator />

          {/* Require Re-auth on Idle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Re-authentication on Idle</Label>
              <p className="text-sm text-muted-foreground">
                Force users to log in again after session idle timeout
              </p>
            </div>
            <Switch
              checked={requireReauthOnIdle}
              onCheckedChange={setRequireReauthOnIdle}
            />
          </div>
        </CardContent>
      </Card>

      {/* IP Allowlist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            IP Allowlist
            <Badge variant="outline" className="ml-2">Enterprise</Badge>
          </CardTitle>
          <CardDescription>
            Restrict access to specific IP addresses for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable IP Allowlist */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable IP Allowlist</Label>
              <p className="text-sm text-muted-foreground">
                Only allow access from specified IP addresses
              </p>
            </div>
            <Switch
              checked={ipAllowlistEnabled}
              onCheckedChange={setIpAllowlistEnabled}
            />
          </div>

          {ipAllowlistEnabled && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Be careful when enabling IP restrictions. Make sure to include your current IP address
                  to avoid locking yourself out.
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Add IP Address */}
              <div className="space-y-2">
                <Label>Add IP Address</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="192.168.1.1 or 192.168.1.*"
                    value={newIpAddress}
                    onChange={(e) => setNewIpAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIp()}
                  />
                  <Button onClick={handleAddIp} variant="secondary">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Supports exact IP addresses and wildcard patterns (e.g., 192.168.1.*)
                </p>
              </div>

              {/* IP List */}
              {ipAllowlist.length > 0 ? (
                <div className="space-y-2">
                  <Label>Allowed IP Addresses</Label>
                  <div className="flex flex-wrap gap-2">
                    {ipAllowlist.map((ip) => (
                      <Badge
                        key={ip}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {ip}
                        <button
                          onClick={() => handleRemoveIp(ip)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No IP addresses added. Add at least one IP address to enable restrictions.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="min-w-32"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

