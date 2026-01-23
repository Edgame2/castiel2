'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Building2, Info, ArrowRight, ArrowLeft, Mail, Lock, User } from 'lucide-react'
import { toast } from 'sonner'
import { env } from '@/lib/env'
import { PasswordStrengthIndicator, usePasswordValidation } from '@/components/auth/password-strength-indicator'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

type RegistrationStatus = 'active_user' | 'pending_user' | 'tenant_exists' | 'no_tenant' | null

interface TenantInfo {
  id: string
  name: string
  domain?: string
}

interface CheckRegistrationResponse {
  status: RegistrationStatus
  message: string
  tenant: TenantInfo | null
  redirectTo: string | null
}

const normalizeDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl' as any) || '/login'
  const { t } = useTranslation(['auth', 'common'])

  // Step management
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2 fields (only for new tenant creation)
  const [tenantName, setTenantName] = useState('')
  const [tenantDomain, setTenantDomain] = useState('')
  const [tenantDomainTouched, setTenantDomainTouched] = useState(false)

  // Status
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  // Registration check result
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>(null)
  const [existingTenant, setExistingTenant] = useState<TenantInfo | null>(null)

  // Pending info
  const [pendingInfo, setPendingInfo] = useState<{ joinRequestId: string; tenantName?: string } | null>(null)

  const redirectTimer = useRef<NodeJS.Timeout | null>(null)
  const normalizedDomain = useMemo(() => normalizeDomain(tenantDomain), [tenantDomain])

  // Auto-suggest domain from email
  useEffect(() => {
    if (tenantDomainTouched || tenantDomain) return
    const suggestion = email.split('@' as any)[1]
    if (suggestion) {
      setTenantDomain(suggestion.toLowerCase())
    }
  }, [email, tenantDomain, tenantDomainTouched])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
      }
    }
  }, [])

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTenantDomain(e.target.value)
    setTenantDomainTouched(true)
  }

  const handleDomainBlur = () => {
    if (!tenantDomain) return
    setTenantDomain(normalizeDomain(tenantDomain))
  }

  // Step 1: Check email and determine flow
  // Password validation
  const passwordValidation = usePasswordValidation(password)

  // Handle OAuth signup
  const handleOAuthSignup = (provider: 'google' | 'github') => {
    setOauthLoading(provider)
    setError('')

    // Build the OAuth URL
    const oauthUrl = new URL(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/${provider}`)
    oauthUrl.searchParams.set('redirectUrl', `${window.location.origin}/api/auth/oauth-callback`)
    oauthUrl.searchParams.set('tenantId', 'default')

    // Store return URL for after OAuth callback in cookie
    if (typeof window !== 'undefined') {
      document.cookie = `oauth_return_url=${encodeURIComponent(returnUrl)}; path=/; max-age=300; SameSite=Lax`
    }

    // Redirect to OAuth provider
    window.location.href = oauthUrl.toString()
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!firstName.trim()) {
      setError(t('common:validation.required' as any))
      return
    }
    if (!email.trim()) {
      setError(t('common:validation.required' as any))
      return
    }
    if (!passwordValidation.isValid) {
      setError(`${t('auth:register.passwordRequirements.title' as any)}: ${passwordValidation.errors[0]}`)
      return
    }
    if (password !== confirmPassword) {
      setError(t('common:validation.passwordMismatch' as any))
      return
    }

    setIsCheckingEmail(true)

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/check-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data: CheckRegistrationResponse = await response.json()

      if (!response.ok) {
        setError(data.message || t('auth:errors.networkError' as any))
        return
      }

      setRegistrationStatus(data.status)
      setExistingTenant(data.tenant)

      switch (data.status) {
        case 'active_user':
          // Redirect to login
          toast.info(t('auth:register.status.activeUser' as any))
          setTimeout(() => router.push('/login'), 1500)
          break

        case 'pending_user':
          // Show pending message
          setError(t('auth:register.status.pendingUser' as any))
          break

        case 'tenant_exists':
          // Can request to join - proceed to step 2 with join mode
          setCurrentStep(2)
          if (data.tenant) {
            setTenantName(data.tenant.name)
            setTenantDomain(data.tenant.domain || email.split('@' as any)[1] || '')
          }
          break

        case 'no_tenant':
          // Create new tenant - proceed to step 2
          setCurrentStep(2)
          break
      }
    } catch (err) {
      setError(t('auth:errors.networkError' as any))
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Registration check error', 3, {
        errorMessage: errorObj.message,
      })
    } finally {
      setIsCheckingEmail(false)
    }
  }

  // Step 2: Complete registration
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setPendingInfo(null)

    if (!normalizedDomain) {
      setError(t('common:validation.required' as any))
      return
    }

    if (!tenantName.trim() && registrationStatus !== 'tenant_exists') {
      setError(t('common:validation.required' as any))
      return
    }

    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current)
      redirectTimer.current = null
    }

    const finalTenantName = existingTenant?.name || tenantName.trim() || normalizedDomain
    const payload = {
      firstName: firstName.trim(),
      lastName: '', // Optional
      email: email.trim().toLowerCase(),
      password,
      tenantName: finalTenantName,
      tenantDomain: normalizedDomain,
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.pendingApproval) {
          setPendingInfo({
            joinRequestId: data.joinRequestId,
            tenantName: finalTenantName,
          })
          setSuccess(data.message || t('auth:register.status.pendingUser' as any))
          toast.info(t('auth:register.status.pendingUser' as any), {
            duration: 4000,
          })

          const pendingSearch = new URLSearchParams({
            tenantName: finalTenantName,
            email: payload.email,
            domain: normalizedDomain,
          })

          if (data.joinRequestId) {
            pendingSearch.set('joinRequestId', data.joinRequestId)
          }

          redirectTimer.current = setTimeout(() => {
            router.push(`/pending?${pendingSearch.toString()}`)
          }, 1500)
        } else {
          setSuccess(data.message || t('common:success' as any))
          toast.success(t('common:success' as any), {
            duration: 4000,
          })

          redirectTimer.current = setTimeout(() => {
            router.push(`/login${returnUrl !== '/login' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`)
          }, 2000)
        }
      } else {
        setError(data.message || t('auth:errors.networkError' as any))
      }
    } catch (err) {
      setError(t('auth:errors.networkError' as any))
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Registration error', 3, {
        errorMessage: errorObj.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const goBackToStep1 = () => {
    setCurrentStep(1)
    setRegistrationStatus(null)
    setExistingTenant(null)
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Language Switcher in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher variant="outline" showLabel className="bg-white/10 text-white hover:bg-white/20 border-white/20" />
      </div>

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-white">
            {currentStep === 1 ? t('auth:register.title' as any) :
              registrationStatus === 'tenant_exists' ? t('auth:register.requestToJoin' as any) : t('auth:register.step2Title' as any)}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {currentStep === 1
              ? t('auth:register.subtitle' as any)
              : registrationStatus === 'tenant_exists'
                ? t('auth:register.status.tenantExists', { tenantName: existingTenant?.name || '' })
                : t('auth:register.step2Subtitle' as any)}
          </CardDescription>

          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-4">
            <div className={`h-2 flex-1 rounded-full ${currentStep >= 1 ? 'bg-purple-500' : 'bg-slate-700'}`} />
            <div className={`h-2 flex-1 rounded-full ${currentStep >= 2 ? 'bg-purple-500' : 'bg-slate-700'}`} />
          </div>
        </CardHeader>

        <CardContent>
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4 border-red-800 bg-red-950/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-4 border-green-800 bg-green-950/50 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Pending Info */}
          {pendingInfo && (
            <Alert className="mb-4 border-amber-800 bg-amber-950/50 text-amber-400">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('auth:register.status.pendingUser' as any)}
                <span className="ml-1 text-xs opacity-80">Request ID: {pendingInfo.joinRequestId}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Basic info and email check */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-300">
                  <User className="mr-2 inline h-4 w-4" />
                  {t('auth:register.firstName' as any)}
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder={t('auth:register.firstNamePlaceholder' as any)}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isCheckingEmail}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  <Mail className="mr-2 inline h-4 w-4" />
                  {t('auth:register.email' as any)}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth:register.emailPlaceholder' as any)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isCheckingEmail}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  <Lock className="mr-2 inline h-4 w-4" />
                  {t('auth:register.password' as any)}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth:register.passwordPlaceholder' as any)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  disabled={isCheckingEmail}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
                <PasswordStrengthIndicator password={password} className="mt-2" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  <Lock className="mr-2 inline h-4 w-4" />
                  {t('auth:register.confirmPassword' as any)}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('auth:register.confirmPasswordPlaceholder' as any)}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isCheckingEmail}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={isCheckingEmail}
              >
                {isCheckingEmail ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth:register.checkingEmail' as any)}
                  </>
                ) : (
                  <>
                    {t('auth:register.continue' as any)}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Tenant info */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              {/* Show tenant info alert based on registration status */}
              {registrationStatus === 'tenant_exists' && existingTenant && (
                <Alert className="border-blue-800 bg-blue-950/50 text-blue-400">
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    {t('auth:register.status.tenantExists', { tenantName: existingTenant.name })}
                  </AlertDescription>
                </Alert>
              )}

              {registrationStatus === 'no_tenant' && (
                <Alert className="border-emerald-800 bg-emerald-950/50 text-emerald-400">
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    {t('auth:register.status.noTenant' as any)}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="tenantDomain" className="text-slate-300">{t('auth:register.tenantDomain' as any)}</Label>
                <Input
                  id="tenantDomain"
                  type="text"
                  placeholder={t('auth:register.tenantDomainPlaceholder' as any)}
                  value={tenantDomain}
                  onChange={handleDomainChange}
                  onBlur={handleDomainBlur}
                  required
                  disabled={isLoading || !!success || registrationStatus === 'tenant_exists'}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 disabled:opacity-70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantName" className="text-slate-300">{t('auth:register.tenantName' as any)}</Label>
                <Input
                  id="tenantName"
                  type="text"
                  placeholder={t('auth:register.tenantNamePlaceholder' as any)}
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required={registrationStatus !== 'tenant_exists'}
                  disabled={isLoading || !!success || registrationStatus === 'tenant_exists'}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 disabled:opacity-70"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                  onClick={goBackToStep1}
                  disabled={isLoading || !!success}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('common:back' as any)}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  disabled={isLoading || !!success}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {registrationStatus === 'tenant_exists' ? t('auth:register.creating' as any) : t('auth:register.creating' as any)}
                    </>
                  ) : success && !pendingInfo ? (
                    t('common:loading' as any)
                  ) : success && pendingInfo ? (
                    t('common:success' as any)
                  ) : registrationStatus === 'tenant_exists' ? (
                    t('auth:register.requestToJoin' as any)
                  ) : (
                    t('auth:register.createAccount' as any)
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">{t('auth:register.alreadyHaveAccount' as any)} </span>
            <Link
              href={`/login${returnUrl !== '/login' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="font-medium text-purple-400 hover:text-purple-300 hover:underline"
            >
              {t('auth:register.signIn' as any)}
            </Link>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">
                {t('auth:register.orContinueWith' as any)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              disabled={isLoading || isCheckingEmail || !!success || oauthLoading !== null}
              onClick={() => handleOAuthSignup('google')}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {t('auth:login.google' as any)}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading || isCheckingEmail || !!success || oauthLoading !== null}
              onClick={() => handleOAuthSignup('github')}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
              {t('auth:login.github' as any)}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            {t('auth:register.termsAgreement' as any)}{' '}
            <Link href="/terms" className="underline hover:text-slate-400">
              {t('auth:register.termsOfService' as any)}
            </Link>{' '}
            {t('common:and' as any)}{' '}
            <Link href="/privacy" className="underline hover:text-slate-400">
              {t('auth:register.privacyPolicy' as any)}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
