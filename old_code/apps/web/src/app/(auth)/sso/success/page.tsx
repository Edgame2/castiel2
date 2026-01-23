'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, Shield } from 'lucide-react'
import { setAuthToken } from '@/lib/auth-utils'

function SSOSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    const accessToken = searchParams.get('accessToken' as any)
    const refreshToken = searchParams.get('refreshToken' as any)
    const returnUrl = searchParams.get('returnUrl' as any) || '/dashboard'

    if (!accessToken || !refreshToken) {
      setStatus('error')
      setTimeout(() => {
        router.push('/login?sso_error=missing_tokens')
      }, 2000)
      return
    }

    // Store tokens
    setAuthToken(accessToken, refreshToken)
    setStatus('success')

    // Redirect to return URL after a brief success display
    setTimeout(() => {
      router.push(returnUrl)
    }, 1500)
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-emerald-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        {status === 'processing' && (
          <>
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Completing Sign In</CardTitle>
              <CardDescription className="text-base">
                Securely setting up your session...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            </CardContent>
          </>
        )}

        {status === 'success' && (
          <>
            <CardHeader className="space-y-1 text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome!</CardTitle>
              <CardDescription className="text-base">
                SSO authentication successful. Redirecting...
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
                <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold">Authentication Failed</CardTitle>
              <CardDescription className="text-base">
                Something went wrong. Redirecting to login...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

export default function SSOSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SSOSuccessContent />
    </Suspense>
  )
}

