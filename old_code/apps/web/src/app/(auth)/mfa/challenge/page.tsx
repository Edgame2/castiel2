'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertCircle, Key, Smartphone, Mail, Shield, RefreshCw } from 'lucide-react'
import { useCompleteMFAChallenge, useSendMFACode } from '@/hooks/use-mfa'
import { getDeviceFingerprint } from '@/lib/device-fingerprint'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import type { MFAMethodType } from '@/types/mfa'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

function MFAChallengePage() {
  // Use any type for t to allow all mfa.* keys that exist in translations but aren't typed yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('auth') as any
  const router = useRouter()
  const searchParams = useSearchParams()
  const challengeToken = searchParams.get('token' as any) || searchParams.get('challengeToken' as any) || ''
  const availableMethodsParam = searchParams.get('methods' as any) || ''
  const returnUrl = searchParams.get('returnUrl' as any) || '/dashboard'

  const [selectedMethod, setSelectedMethod] = useState<MFAMethodType | 'recovery'>('totp')
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [codeSent, setCodeSent] = useState(false)

  const challengeMutation = useCompleteMFAChallenge()
  const sendCodeMutation = useSendMFACode()

  // Parse available methods from URL param
  const availableMethods: string[] = availableMethodsParam
    ? availableMethodsParam.split(',' as any)
    : ['totp', 'sms', 'email']

  // Set default method based on what's available
  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.includes(selectedMethod)) {
      setSelectedMethod(availableMethods[0] as MFAMethodType)
    }
  }, [availableMethods, selectedMethod])

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Redirect if no challenge token
  useEffect(() => {
    if (!challengeToken) {
      router.push('/login')
    }
  }, [challengeToken, router])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code) {
      setError(t('mfa.enterCode', { defaultValue: 'Please enter a verification code' }))
      return
    }

    if (selectedMethod === 'recovery') {
      // Recovery codes are in format XXXX-XXXX-XXXX (min 14 chars with dashes)
      if (code.replace(/-/g, '').length < 12) {
        setError(t('mfa.invalidCode', { defaultValue: 'Recovery code must be at least 12 characters' }))
        return
      }
    } else {
      // Regular OTP codes are 6 digits
      if (code.length !== 6) {
        setError(t('mfa.invalidCode', { defaultValue: 'Verification code must be 6 digits' }))
        return
      }
    }

    try {
      const result = await challengeMutation.mutateAsync({
        challengeToken,
        code,
        method: selectedMethod,
      })

      // Store tokens in cookies via API route
      const tokenResponse = await fetch('/api/auth/set-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        }),
      })

      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.json()
        trackTrace('Failed to set tokens during MFA challenge', 3, {
          error: tokenError.error || 'Unknown error',
          status: tokenResponse.status,
        })
        throw new Error(`Token storage failed: ${tokenError.error}`)
      }

      // Redirect to return URL or dashboard
      if (returnUrl.startsWith('http')) {
        window.location.href = returnUrl
      } else {
        router.push(returnUrl)
      }
    } catch (err: any) {
      setError(err.message || t('mfa.invalidCode' as any))
      setCode('')
    }
  }

  const handleResendCode = async () => {
    if (selectedMethod === 'totp' || selectedMethod === 'recovery') {
      return // Can't resend TOTP or recovery codes
    }

    setError('')

    try {
      await sendCodeMutation.mutateAsync({
        challengeToken,
        method: selectedMethod as 'sms' | 'email',
      })
      setTimeLeft(300) // Reset timer
      setCode('')
      setCodeSent(true)
    } catch (err: any) {
      setError(err.message || t('mfa.resendFailed' as any))
    }
  }

  // Automatically send code when switching to SMS or Email method for the first time
  useEffect(() => {
    if ((selectedMethod === 'sms' || selectedMethod === 'email') && !codeSent && challengeToken) {
      // Auto-send code for SMS/Email methods
      sendCodeMutation.mutate({
        challengeToken,
        method: selectedMethod,
      }, {
        onSuccess: () => setCodeSent(true),
      })
    }
  }, [selectedMethod, challengeToken, codeSent])

  const getMethodIcon = (method: MFAMethodType | 'recovery') => {
    switch (method) {
      case 'totp':
        return <Key className="h-4 w-4" />
      case 'sms':
        return <Smartphone className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'recovery':
        return <Shield className="h-4 w-4" />
    }
  }

  const getMethodLabel = (method: MFAMethodType | 'recovery') => {
    switch (method) {
      case 'totp':
        return t('mfa.methods.totp' as any)
      case 'sms':
        return t('mfa.methods.sms' as any)
      case 'email':
        return t('mfa.methods.email' as any)
      case 'recovery':
        return t('mfa.methods.recovery' as any)
    }
  }

  const getMethodShortLabel = (method: MFAMethodType | 'recovery') => {
    switch (method) {
      case 'totp':
        return t('mfa.methods.totpShort' as any)
      case 'sms':
        return t('mfa.methods.sms' as any)
      case 'email':
        return t('mfa.methods.email' as any)
      case 'recovery':
        return t('mfa.methods.recoveryShort' as any)
    }
  }

  const getPlaceholder = () => {
    if (selectedMethod === 'recovery') {
      return 'XXXX-XXXX-XXXX'
    }
    return '123456'
  }

  const getInputMaxLength = () => {
    if (selectedMethod === 'recovery') {
      return 20 // Allow dashes and extra characters
    }
    return 6
  }

  if (timeLeft === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="ghost" className="text-white hover:bg-white/10" />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('mfa.sessionExpired' as any)}</CardTitle>
            <CardDescription>
              {t('mfa.sessionExpiredDesc' as any)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/login')}>
              {t('mfa.returnToLogin' as any)}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="ghost" className="text-white hover:bg-white/10" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">{t('mfa.title' as any)}</CardTitle>
          <CardDescription className="text-center">
            {t('mfa.subtitle' as any)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Time remaining */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{t('mfa.timeRemaining' as any)}</span>
              <span className={`font-mono font-semibold ${timeLeft < 60 ? 'text-destructive' : ''}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Method selector */}
            <div className="space-y-2">
              <Label>{t('mfa.verificationMethod' as any)}</Label>
              <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto">
                  {availableMethods.includes('totp') && (
                    <TabsTrigger value="totp" className="flex items-center gap-2 py-2">
                      {getMethodIcon('totp')}
                      <span className="hidden sm:inline">{getMethodLabel('totp')}</span>
                      <span className="sm:hidden">{getMethodShortLabel('totp')}</span>
                    </TabsTrigger>
                  )}
                  {availableMethods.includes('sms') && (
                    <TabsTrigger value="sms" className="flex items-center gap-2 py-2">
                      {getMethodIcon('sms')}
                      <span className="hidden sm:inline">{getMethodLabel('sms')}</span>
                      <span className="sm:hidden">{getMethodShortLabel('sms')}</span>
                    </TabsTrigger>
                  )}
                  {availableMethods.includes('email') && (
                    <TabsTrigger value="email" className="flex items-center gap-2 py-2">
                      {getMethodIcon('email')}
                      <span className="hidden sm:inline">{getMethodLabel('email')}</span>
                      <span className="sm:hidden">{getMethodShortLabel('email')}</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="recovery" className="flex items-center gap-2 py-2">
                    {getMethodIcon('recovery')}
                    <span className="hidden sm:inline">{getMethodLabel('recovery')}</span>
                    <span className="sm:hidden">{getMethodShortLabel('recovery')}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="totp" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('mfa.methods.totpDesc' as any)}
                  </p>
                </TabsContent>

                <TabsContent value="sms" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('mfa.methods.smsDesc' as any)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={sendCodeMutation.isPending || timeLeft > 240}
                    className="w-full"
                  >
                    {sendCodeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('mfa.sending' as any)}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('mfa.resendCode' as any)} {timeLeft > 240 ? `(${formatTime(timeLeft - 240)})` : ''}
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="email" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('mfa.methods.emailDesc' as any)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={sendCodeMutation.isPending || timeLeft > 240}
                    className="w-full"
                  >
                    {sendCodeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('mfa.sending' as any)}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('mfa.resendCode' as any)} {timeLeft > 240 ? `(${formatTime(timeLeft - 240)})` : ''}
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="recovery" className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('mfa.methods.recoveryDesc' as any)}
                  </p>
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {t('mfa.methods.recoveryFormat' as any)}
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>

            {/* Code input */}
            <div className="space-y-2">
              <Label htmlFor="code">{t('mfa.code' as any)}</Label>
              <Input
                id="code"
                type="text"
                inputMode={selectedMethod === 'recovery' ? 'text' : 'numeric'}
                maxLength={getInputMaxLength()}
                value={code}
                onChange={(e) => {
                  const value = e.target.value
                  if (selectedMethod === 'recovery') {
                    // Allow alphanumeric and dashes for recovery codes
                    setCode(value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                  } else {
                    // Only digits for OTP
                    setCode(value.replace(/\D/g, ''))
                  }
                }}
                placeholder={getPlaceholder()}
                className="text-center text-lg tracking-widest"
                autoFocus
                disabled={challengeMutation.isPending}
              />
            </div>

            {/* Remember device checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                disabled={challengeMutation.isPending}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('mfa.trustDevice' as any)}
              </label>
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={challengeMutation.isPending || !code}>
              {challengeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('mfa.verifying' as any)}
                </>
              ) : (
                t('mfa.verify' as any)
              )}
            </Button>

            {/* Back to login */}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/login')}
              disabled={challengeMutation.isPending}
            >
              {t('mfa.backToLogin' as any)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Wrap in Suspense to handle useSearchParams
export default function MFAChallengPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <MFAChallengePage />
    </Suspense>
  )
}
