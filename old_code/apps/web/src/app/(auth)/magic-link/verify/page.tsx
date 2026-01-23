'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useVerifyMagicLink } from '@/hooks/use-magic-link'
import { setAuthToken } from '@/lib/auth-utils'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

function MagicLinkVerifyContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('auth') as any
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token' as any) || ''
  const returnUrl = searchParams.get('returnUrl' as any) || '/dashboard'

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState('')

  const verifyMutation = useVerifyMagicLink()

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage(t('magicLink.invalidLink' as any))
      return
    }

    const verifyToken = async () => {
      try {
        const result = await verifyMutation.mutateAsync(token)
        
        // Store tokens
        if (result.accessToken && result.refreshToken) {
          setAuthToken(result.accessToken, result.refreshToken)
        }

        setStatus('success')

        // Redirect after short delay to show success state
        setTimeout(() => {
          router.push(result.returnUrl || returnUrl)
        }, 1500)
      } catch (error: any) {
        setStatus('error')
        setErrorMessage(error.message || t('magicLink.verificationFailed' as any))
      }
    }

    verifyToken()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-gray-900 dark:via-gray-800 dark:to-violet-900 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        {status === 'verifying' && (
          <>
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">{t('magicLink.verifying' as any)}</CardTitle>
              <CardDescription className="text-base">
                {t('magicLink.pleaseWait' as any)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
            </CardContent>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">{t('magicLink.success' as any)}</CardTitle>
              <CardDescription className="text-base">
                {t('magicLink.redirecting' as any)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </CardContent>
          </>
        )}

        {status === 'error' && (
          <>
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold">{t('magicLink.failed' as any)}</CardTitle>
              <CardDescription className="text-base">
                {t('magicLink.linkExpiredOrInvalid' as any)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <div className="text-center text-sm text-muted-foreground">
                <p>{t('magicLink.tryRequestingNew' as any)}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-4">
              <Link href="/magic-link" className="w-full">
                <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('magicLink.requestNew' as any)}
                </Button>
              </Link>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('magicLink.backToLogin' as any)}
                </Button>
              </Link>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}

export default function MagicLinkVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <MagicLinkVerifyContent />
    </Suspense>
  )
}

