'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, Sparkles, Shield } from 'lucide-react'
import { env } from '@/lib/env'
import { getDeviceFingerprint } from '@/lib/device-fingerprint'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { clearTokenCache } from '@/lib/api/client'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl' as any) || '/dashboard'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['auth', 'common'])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | 'microsoft' | null>(null)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resendingVerification, setResendingVerification] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!email) {
      setError(t('common:validation.required' as any))
      return
    }

    setResendingVerification(true)
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setVerificationSent(true)
        setShowResendVerification(false)
        setError('')
      } else {
        const data = await response.json()
        setError(data.message || t('auth:errors.networkError' as any))
      }
    } catch (err) {
      setError(t('auth:errors.networkError' as any))
    } finally {
      setResendingVerification(false)
    }
  }

  // Handle OAuth login
  const handleOAuthLogin = (provider: 'google' | 'github' | 'microsoft') => {
    setOauthLoading(provider)
    setError('')

    // Build the OAuth URL with return URL
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Get device fingerprint for trusted device tracking
      const deviceFingerprint = getDeviceFingerprint()

      // Always use 'default' to let backend resolve user's default tenant
      const apiUrl = `${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/login`
      
      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'default',
          },
          credentials: 'include',
          body: JSON.stringify({
            email,
            password,
            tenantId: 'default',
            deviceFingerprint,
            rememberDevice,
          }),
        })
      } catch (fetchError) {
        // Network error - server might not be running or CORS issue
        const errorObj = fetchError instanceof Error ? fetchError : new Error(String(fetchError))
        trackException(errorObj, 3)
        trackTrace('Failed to connect to API during login', 3, {
          errorMessage: errorObj.message,
          apiUrl: env.NEXT_PUBLIC_API_BASE_URL,
        })
        setError(
          `Cannot connect to API server. Please ensure the API is running at ${env.NEXT_PUBLIC_API_BASE_URL}`
        )
        return
      }

      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        // Response is not JSON - might be HTML error page or empty response
        const text = await response.text()
        const errorObj = jsonError instanceof Error ? jsonError : new Error(String(jsonError))
        trackException(errorObj, 3)
        trackTrace('Invalid JSON response during login', 3, {
          errorMessage: errorObj.message,
          status: response.status,
          statusText: response.statusText,
          responsePreview: text.substring(0, 200),
        })
        setError(
          `Server returned an invalid response (${response.status} ${response.statusText}). Please check if the API server is running correctly.`
        )
        return
      }

      if (response.ok) {
        // Check if MFA is required
        if (data.requiresMFA) {
          // Redirect to MFA challenge page with challenge token
          const mfaUrl = `/mfa/challenge?token=${encodeURIComponent(data.challengeToken)}&methods=${data.availableMethods.join(',')}&returnUrl=${encodeURIComponent(returnUrl)}`
          router.push(mfaUrl)
          return
        }

        // Store tokens in cookies via API route
        const tokenResponse = await fetch('/api/auth/set-tokens', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: data.accessToken || data.access_token,
            refreshToken: data.refreshToken || data.refresh_token,
          }),
        })

        if (!tokenResponse.ok) {
          const tokenError = await tokenResponse.json()
          trackTrace('Failed to set tokens during login', 3, {
            error: tokenError.error || 'Unknown error',
            status: tokenResponse.status,
          })
          setError(`Token storage failed: ${tokenError.error}`)
          return
        }

        // Clear the cached token so the new one is fetched
        clearTokenCache()

        if (typeof window !== 'undefined') {
          const resolvedTenant = data?.user?.tenantId || 'default'
          localStorage.setItem('tenantId', resolvedTenant)
        }

        // Redirect to return URL or dashboard
        if (returnUrl.startsWith('http')) {
          window.location.href = returnUrl
        } else {
          router.push(returnUrl)
        }
      } else {
        // Check if the error is about email verification
        if (data.code === 'EMAIL_NOT_VERIFIED' || data.message?.toLowerCase().includes('verify')) {
          setShowResendVerification(true)
        }
        setError(data.message || t('auth:errors.invalidCredentials' as any))
      }
    } catch (err) {
      // This catch block should only handle unexpected errors
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Unexpected login error', 3, {
        errorMessage,
      })
      
      // Provide more helpful error messages
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setError(
          `Network error: Cannot connect to API server at ${env.NEXT_PUBLIC_API_BASE_URL}. Please ensure the API server is running.`
        )
      } else {
        setError(t('auth:errors.networkError' as any) + `: ${errorMessage}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
      {/* Language Switcher in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher variant="outline" showLabel className="bg-white/10 text-white hover:bg-white/20 border-white/20" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth:login.title' as any)}</CardTitle>
          <CardDescription>
            {t('auth:login.subtitle' as any)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {verificationSent && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  {t('auth:login.verificationSent' as any)}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {showResendVerification && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resendingVerification}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {resendingVerification ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            {t('auth:login.sending' as any)}
                          </>
                        ) : (
                          t('auth:login.resendVerification' as any)
                        )}
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth:login.email' as any)}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth:login.emailPlaceholder' as any)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth:login.password' as any)}</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {t('auth:login.forgotPassword' as any)}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t('auth:login.passwordPlaceholder' as any)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                disabled={isLoading}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('auth:login.rememberDevice' as any)}
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth:login.signingIn' as any)}
                </>
              ) : (
                t('auth:login.signIn' as any)
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('auth:login.noAccount' as any)} </span>
            <Link
              href={`/register${returnUrl !== '/dashboard' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="font-medium text-primary hover:underline"
            >
              {t('auth:login.signUp' as any)}
            </Link>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('auth:login.orContinueWith' as any)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              type="button"
              disabled={isLoading || oauthLoading !== null}
              onClick={() => handleOAuthLogin('google')}
              className="h-10"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading || oauthLoading !== null}
              onClick={() => handleOAuthLogin('github')}
              className="h-10"
            >
              {oauthLoading === 'github' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
            </Button>
            <Button
              variant="outline"
              type="button"
              disabled={isLoading || oauthLoading !== null}
              onClick={() => handleOAuthLogin('microsoft')}
              className="h-10"
            >
              {oauthLoading === 'microsoft' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 23 23">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                  <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
                  <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
                </svg>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Link href="/magic-link">
              <Button
                variant="outline"
                type="button"
                className="w-full border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/30"
                disabled={isLoading || oauthLoading !== null}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Magic Link
              </Button>
            </Link>
            <Link href="/sso">
              <Button
                variant="outline"
                type="button"
                className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                disabled={isLoading || oauthLoading !== null}
              >
                <Shield className="mr-2 h-4 w-4" />
                {t('auth:sso.buttonLabel' as any) || 'SSO'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
