'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { env } from '@/lib/env'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

export default function ForgotPasswordPage() {
  const { t } = useTranslation(['auth', 'common'])
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default',
        },
        credentials: 'include',
        body: JSON.stringify({
          email,
          tenantId: 'default',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t('auth:errors.networkError' as any))
      }

      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:errors.networkError' as any))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      {/* Language Switcher in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher variant="outline" showLabel />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('auth:forgotPassword.title' as any)}</CardTitle>
          <CardDescription>
            {t('auth:forgotPassword.subtitle' as any)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {t('auth:forgotPassword.resetLinkSent', { email })}
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSuccess(false)}
              >
                {t('auth:forgotPassword.sendResetLink' as any)}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('auth:forgotPassword.backToLogin' as any)}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth:forgotPassword.email' as any)}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth:forgotPassword.emailPlaceholder' as any)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? t('auth:forgotPassword.sending' as any) : t('auth:forgotPassword.sendResetLink' as any)}
              </Button>

              <div className="text-center">
                <Link href="/login">
                  <Button variant="link" className="text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('auth:forgotPassword.backToLogin' as any)}
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
