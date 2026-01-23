import { useState, useEffect } from 'react'
import { useMFAPolicy, useUpdateMFAPolicy } from '@/hooks/use-mfa'
import type { MFAMethodType, MFAEnforcementLevel } from '@/types/mfa'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield } from 'lucide-react'

export default function MFAPolicyCard() {
  const { data, isLoading, isError } = useMFAPolicy()
  const updatePolicy = useUpdateMFAPolicy()
  const [enforcement, setEnforcement] = useState<MFAEnforcementLevel>('off')
  const [gracePeriod, setGracePeriod] = useState<number>(0)
  const [allowedMethods, setAllowedMethods] = useState<MFAMethodType[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (data?.policy) {
      setEnforcement(data.policy.enforcement)
      setGracePeriod(data.policy.gracePeriodDays)
      setAllowedMethods(data.policy.allowedMethods)
      setHasChanges(false)
      setError('')
    }
  }, [data])

  const handleMethodChange = (method: MFAMethodType, checked: boolean) => {
    setAllowedMethods((prev) =>
      checked ? [...prev, method] : prev.filter((m) => m !== method)
    )
    setHasChanges(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    updatePolicy.mutate(
      { enforcement, gracePeriodDays: gracePeriod, allowedMethods },
      {
        onError: (err: any) => setError(err?.message || 'Failed to update MFA policy'),
        onSuccess: () => setHasChanges(false),
      }
    )
  }

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>MFA Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading MFA policy...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>MFA Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>Failed to load MFA policy.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>MFA Policy</CardTitle>
        </div>
        <CardDescription>
          Configure organization-wide multi-factor authentication requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Enforcement Level</Label>
            <Select value={enforcement} onValueChange={(v) => { setEnforcement(v as MFAEnforcementLevel); setHasChanges(true) }}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off (MFA not required)</SelectItem>
                <SelectItem value="optional">Optional (users may enroll)</SelectItem>
                <SelectItem value="required">Required (all users must enroll)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grace">Grace Period (days)</Label>
            <Input
              id="grace"
              type="number"
              min={0}
              max={30}
              value={gracePeriod}
              onChange={(e) => { setGracePeriod(Number(e.target.value)); setHasChanges(true) }}
              className="w-32"
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Time allowed for new users to enroll in MFA before enforcement.</p>
          </div>
          <div className="space-y-2">
            <Label>Allowed Methods</Label>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="totp" checked={allowedMethods.includes('totp')} onCheckedChange={(checked) => handleMethodChange('totp', !!checked)} />
                <label htmlFor="totp" className="text-sm">Authenticator App</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sms" checked={allowedMethods.includes('sms')} onCheckedChange={(checked) => handleMethodChange('sms', !!checked)} />
                <label htmlFor="sms" className="text-sm">SMS</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="email" checked={allowedMethods.includes('email')} onCheckedChange={(checked) => handleMethodChange('email', !!checked)} />
                <label htmlFor="email" className="text-sm">Email</label>
              </div>
            </div>
          </div>
          <Button type="submit" disabled={!hasChanges || updatePolicy.isPending}>
            {updatePolicy.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {updatePolicy.isPending ? 'Saving...' : 'Save MFA Policy'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
