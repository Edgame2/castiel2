'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, ArrowLeft, Shield, AlertCircle } from 'lucide-react'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { env } from '@/lib/env'

function SSOLoginContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('auth') as any
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl' as any) || '/dashboard'
  const ssoError = searchParams.get('sso_error' as any)

  const [tenantId, setTenantId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(ssoError ? getSSOErrorMessage(ssoError) : '')

  function getSSOErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'saml_validation_failed': 'SSO authentication failed. Please try again or contact your administrator.',
      'missing_email': 'Your identity provider did not provide an email address.',
      'user_not_found': 'No account found. Please contact your administrator.',
      'domain_not_allowed': 'Your email domain is not authorized for this organization.',
      'account_inactive': 'Your account is not active. Please contact your administrator.',
      'sso_error': 'An error occurred during SSO authentication.',
      'missing_tokens': 'Authentication tokens were not received. Please try again.',
    }
    return errorMessages[errorCode] || 'An unknown error occurred.'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!tenantId.trim()) {
      setError('Please enter your organization identifier')
      return
    }

    setIsLoading(true)

    // Redirect to backend SSO initiation endpoint
    const ssoUrl = new URL(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/sso/${encodeURIComponent(tenantId.trim())}/login`)
    ssoUrl.searchParams.set('returnUrl', returnUrl)

    window.location.href = ssoUrl.toString()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('sso.title' as any) || 'Enterprise Single Sign-On'}</CardTitle>
          <CardDescription className="text-base">
            {t('sso.description' as any) || 'Sign in with your organization\'s identity provider'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="tenantId">{t('sso.organizationLabel' as any) || 'Organization Identifier'}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tenantId"
                  type="text"
                  placeholder={t('sso.organizationPlaceholder' as any) || 'your-organization'}
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="pl-10"
                  autoComplete="organization"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('sso.organizationHint' as any) || 'Enter your organization ID or domain provided by your IT administrator'}
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sso.connecting' as any) || 'Connecting...'}
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  {t('sso.continueButton' as any) || 'Continue with SSO'}
                </>
              )}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
                  {t('sso.or' as any) || 'or'}
                </span>
              </div>
            </div>

            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('sso.backToLogin' as any) || 'Back to login'}
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function SSOLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SSOLoginContent />
    </Suspense>
  )
}

