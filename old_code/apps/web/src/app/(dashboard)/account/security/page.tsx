'use client'

import { useState } from 'react'
import { Shield, Smartphone, Mail, Key, ChevronRight, Check, X, Download, Copy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useMFAMethods,
  useEnrollTOTP,
  useVerifyTOTP,
  useEnrollSMS,
  useVerifySMS,
  useEnrollEmail,
  useVerifyEmail,
  useDisableMFAMethod,
  useGenerateRecoveryCodes,
} from '@/hooks/use-mfa'
import { toast } from 'sonner'
import type { MFAMethodType } from '@/types/mfa'

export default function SecurityPage() {
  const { data: mfaData, isLoading, error } = useMFAMethods()
  const [enrollingMethod, setEnrollingMethod] = useState<MFAMethodType | null>(null)
  const [disablingMethod, setDisablingMethod] = useState<MFAMethodType | null>(null)
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Error Loading Security Settings
            </CardTitle>
            <CardDescription>Failed to load MFA settings. Please try again later.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const methods = mfaData?.methods || []
  const hasActiveMFA = mfaData?.hasActiveMFA || false
  const totpMethod = methods.find((m) => m.type === 'totp')
  const smsMethod = methods.find((m) => m.type === 'sms')
  const emailMethod = methods.find((m) => m.type === 'email')

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your multi-factor authentication (MFA) methods to keep your account secure.
        </p>
      </div>

      {/* Status Banner */}
      {hasActiveMFA ? (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">MFA is Enabled</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your account is protected with multi-factor authentication.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">MFA is Not Enabled</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Enable MFA to add an extra layer of security to your account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MFA Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Methods</CardTitle>
          <CardDescription>Choose one or more methods to secure your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TOTP / Authenticator App */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Authenticator App</p>
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app like Google Authenticator or Authy
                </p>
                {totpMethod && (
                  <Badge variant={totpMethod.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                    {totpMethod.status === 'active' ? 'Active' : 'Pending'}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              {totpMethod ? (
                <Button variant="outline" size="sm" onClick={() => setDisablingMethod('totp')}>
                  Disable
                </Button>
              ) : (
                <Button size="sm" onClick={() => setEnrollingMethod('totp')}>
                  Enable <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">SMS Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via text message
                </p>
                {smsMethod && (
                  <>
                    <Badge variant={smsMethod.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                      {smsMethod.status === 'active' ? 'Active' : 'Pending'}
                    </Badge>
                    {smsMethod.phoneNumber && (
                      <p className="text-xs text-muted-foreground mt-1">{smsMethod.phoneNumber}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div>
              {smsMethod ? (
                <Button variant="outline" size="sm" onClick={() => setDisablingMethod('sms')}>
                  Disable
                </Button>
              ) : (
                <Button size="sm" onClick={() => setEnrollingMethod('sms')}>
                  Enable <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Email Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via email
                </p>
                {emailMethod && (
                  <>
                    <Badge variant={emailMethod.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                      {emailMethod.status === 'active' ? 'Active' : 'Pending'}
                    </Badge>
                    {emailMethod.email && (
                      <p className="text-xs text-muted-foreground mt-1">{emailMethod.email}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div>
              {emailMethod ? (
                <Button variant="outline" size="sm" onClick={() => setDisablingMethod('email')}>
                  Disable
                </Button>
              ) : (
                <Button size="sm" onClick={() => setEnrollingMethod('email')}>
                  Enable <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Codes */}
      {hasActiveMFA && (
        <Card>
          <CardHeader>
            <CardTitle>Recovery Codes</CardTitle>
            <CardDescription>
              Use recovery codes to access your account if you lose access to your MFA devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowRecoveryCodes(true)}>Generate New Recovery Codes</Button>
          </CardContent>
        </Card>
      )}

      {/* Trusted Devices */}
      {mfaData?.trustedDevices && mfaData.trustedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trusted Devices</CardTitle>
            <CardDescription>
              Devices you've marked as trusted won't require MFA verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mfaData.trustedDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{device.userAgent}</p>
                    {device.ipAddress && (
                      <p className="text-xs text-muted-foreground">IP: {device.ipAddress}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(device.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment Dialog */}
      {enrollingMethod && (
        <EnrollmentDialog
          method={enrollingMethod}
          open={!!enrollingMethod}
          onClose={() => setEnrollingMethod(null)}
        />
      )}

      {/* Disable Dialog */}
      {disablingMethod && (
        <DisableMethodDialog
          method={disablingMethod}
          open={!!disablingMethod}
          onClose={() => setDisablingMethod(null)}
        />
      )}

      {/* Recovery Codes Dialog */}
      {showRecoveryCodes && (
        <RecoveryCodesDialog open={showRecoveryCodes} onClose={() => setShowRecoveryCodes(false)} />
      )}
    </div>
  )
}

// ============================================================================
// Enrollment Dialog Component
// ============================================================================

interface EnrollmentDialogProps {
  method: MFAMethodType
  open: boolean
  onClose: () => void
}

function EnrollmentDialog({ method, open, onClose }: EnrollmentDialogProps) {
  if (method === 'totp') {
    return <TOTPEnrollmentDialog open={open} onClose={onClose} />
  } else if (method === 'sms') {
    return <SMSEnrollmentDialog open={open} onClose={onClose} />
  } else if (method === 'email') {
    return <EmailEnrollmentDialog open={open} onClose={onClose} />
  }
  return null
}

// ============================================================================
// TOTP Enrollment Dialog
// ============================================================================

function TOTPEnrollmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'qr' | 'verify' | 'codes'>('qr')
  const [enrollmentData, setEnrollmentData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const enrollMutation = useEnrollTOTP()
  const verifyMutation = useVerifyTOTP()

  const handleStartEnrollment = async () => {
    const data = await enrollMutation.mutateAsync()
    setEnrollmentData(data)
    setStep('verify')
  }

  const handleVerify = async () => {
    if (!enrollmentData || code.length !== 6) return

    const result = await verifyMutation.mutateAsync({
      enrollmentToken: enrollmentData.enrollmentToken,
      code,
    })

    setRecoveryCodes(result.recoveryCodes)
    setStep('codes')
  }

  const handleClose = () => {
    setStep('qr')
    setEnrollmentData(null)
    setCode('')
    setRecoveryCodes([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Authenticator App</DialogTitle>
          <DialogDescription>
            {step === 'qr' && 'Scan the QR code with your authenticator app'}
            {step === 'verify' && 'Enter the 6-digit code from your app'}
            {step === 'codes' && 'Save your recovery codes'}
          </DialogDescription>
        </DialogHeader>

        {step === 'qr' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator on your
              mobile device.
            </p>
            <Button onClick={handleStartEnrollment} className="w-full" disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Loading...' : 'Continue'}
            </Button>
          </div>
        )}

        {step === 'verify' && enrollmentData && (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={enrollmentData.qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Can't scan the QR code?</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm">{enrollmentData.manualEntryCode}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(enrollmentData.manualEntryCode)
                    toast.success('Copied to clipboard')
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter 6-digit code</Label>
              <Input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </div>
            <Button onClick={handleVerify} className="w-full" disabled={verifyMutation.isPending || code.length !== 6}>
              {verifyMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
            </Button>
          </div>
        )}

        {step === 'codes' && (
          <RecoveryCodesDisplay codes={recoveryCodes} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// SMS Enrollment Dialog
// ============================================================================

function SMSEnrollmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'phone' | 'verify' | 'codes'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [enrollmentData, setEnrollmentData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const enrollMutation = useEnrollSMS()
  const verifyMutation = useVerifySMS()

  const handleSendCode = async () => {
    const data = await enrollMutation.mutateAsync({ phoneNumber })
    setEnrollmentData(data)
    setStep('verify')
  }

  const handleVerify = async () => {
    if (!enrollmentData || code.length !== 6) return

    const result = await verifyMutation.mutateAsync({
      enrollmentToken: enrollmentData.enrollmentToken,
      code,
    })

    setRecoveryCodes(result.recoveryCodes)
    setStep('codes')
  }

  const handleClose = () => {
    setStep('phone')
    setPhoneNumber('')
    setEnrollmentData(null)
    setCode('')
    setRecoveryCodes([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enable SMS Authentication</DialogTitle>
          <DialogDescription>
            {step === 'phone' && 'Enter your phone number to receive verification codes'}
            {step === 'verify' && `Code sent to ${enrollmentData?.maskedPhone}`}
            {step === 'codes' && 'Save your recovery codes'}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
              <p className="text-xs text-muted-foreground">
                Enter your number with country code (e.g., +1 for US)
              </p>
            </div>
            <Button onClick={handleSendCode} className="w-full" disabled={enrollMutation.isPending || !phoneNumber}>
              {enrollMutation.isPending ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-code">Enter 6-digit code</Label>
              <Input
                id="sms-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </div>
            <Button onClick={handleVerify} className="w-full" disabled={verifyMutation.isPending || code.length !== 6}>
              {verifyMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep('phone')}
            >
              Use Different Number
            </Button>
          </div>
        )}

        {step === 'codes' && (
          <RecoveryCodesDisplay codes={recoveryCodes} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Email Enrollment Dialog
// ============================================================================

function EmailEnrollmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'send' | 'verify' | 'codes'>('send')
  const [enrollmentData, setEnrollmentData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const enrollMutation = useEnrollEmail()
  const verifyMutation = useVerifyEmail()

  const handleSendCode = async () => {
    const data = await enrollMutation.mutateAsync()
    setEnrollmentData(data)
    setStep('verify')
  }

  const handleVerify = async () => {
    if (!enrollmentData || code.length !== 6) return

    const result = await verifyMutation.mutateAsync({
      enrollmentToken: enrollmentData.enrollmentToken,
      code,
    })

    setRecoveryCodes(result.recoveryCodes)
    setStep('codes')
  }

  const handleClose = () => {
    setStep('send')
    setEnrollmentData(null)
    setCode('')
    setRecoveryCodes([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enable Email Authentication</DialogTitle>
          <DialogDescription>
            {step === 'send' && "We'll send a verification code to your registered email"}
            {step === 'verify' && `Code sent to ${enrollmentData?.maskedEmail}`}
            {step === 'codes' && 'Save your recovery codes'}
          </DialogDescription>
        </DialogHeader>

        {step === 'send' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A verification code will be sent to your account email address.
            </p>
            <Button onClick={handleSendCode} className="w-full" disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-code">Enter 6-digit code</Label>
              <Input
                id="email-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
            </div>
            <Button onClick={handleVerify} className="w-full" disabled={verifyMutation.isPending || code.length !== 6}>
              {verifyMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => handleSendCode()}
              disabled={enrollMutation.isPending}
            >
              Resend Code
            </Button>
          </div>
        )}

        {step === 'codes' && (
          <RecoveryCodesDisplay codes={recoveryCodes} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Recovery Codes Display Component
// ============================================================================

interface RecoveryCodesDisplayProps {
  codes: string[]
  onClose: () => void
}

function RecoveryCodesDisplay({ codes, onClose }: RecoveryCodesDisplayProps) {
  const handleDownload = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a' as any)
    a.href = url
    a.download = `recovery-codes-${new Date().toISOString().split('T' as any)[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Recovery codes downloaded')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join('\n'))
    toast.success('Recovery codes copied to clipboard')
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">⚠️ Important</p>
        <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
          Save these codes in a secure location. You'll need them if you lose access to your authentication device.
          Each code can only be used once.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
        {codes.map((code, i) => (
          <div key={i} className="text-center">
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCopy} className="flex-1">
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </Button>
        <Button variant="outline" onClick={handleDownload} className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <Button onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  )
}

// ============================================================================
// Disable Method Dialog
// ============================================================================

interface DisableMethodDialogProps {
  method: MFAMethodType
  open: boolean
  onClose: () => void
}

function DisableMethodDialog({ method, open, onClose }: DisableMethodDialogProps) {
  const [password, setPassword] = useState('')
  const disableMutation = useDisableMFAMethod()

  const handleDisable = async () => {
    await disableMutation.mutateAsync({
      methodType: method,
      password,
    })
    setPassword('')
    onClose()
  }

  const methodNames = {
    totp: 'Authenticator App',
    sms: 'SMS Authentication',
    email: 'Email Authentication',
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable {methodNames[method]}</DialogTitle>
          <DialogDescription>
            Are you sure you want to disable this authentication method? You can enable it again later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="disable-password">Confirm with your password</Label>
            <Input
              id="disable-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={disableMutation.isPending || !password}
          >
            {disableMutation.isPending ? 'Disabling...' : 'Disable Method'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Recovery Codes Dialog
// ============================================================================

interface RecoveryCodesDialogProps {
  open: boolean
  onClose: () => void
}

function RecoveryCodesDialog({ open, onClose }: RecoveryCodesDialogProps) {
  const [password, setPassword] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const generateMutation = useGenerateRecoveryCodes()

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({ password })
    setCodes(result.recoveryCodes)
    setPassword('')
  }

  const handleClose = () => {
    setCodes([])
    setPassword('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate New Recovery Codes</DialogTitle>
          <DialogDescription>
            {codes.length === 0
              ? 'Your old recovery codes will be invalidated.'
              : 'Save these codes in a secure location.'}
          </DialogDescription>
        </DialogHeader>

        {codes.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-password">Confirm with your password</Label>
              <Input
                id="recovery-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <Button
              onClick={handleGenerate}
              className="w-full"
              disabled={generateMutation.isPending || !password}
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate New Codes'}
            </Button>
          </div>
        ) : (
          <RecoveryCodesDisplay codes={codes} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}
