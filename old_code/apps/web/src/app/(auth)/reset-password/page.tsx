'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { env } from '@/lib/env'

export default function ResetPasswordPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('auth') as any
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token' as any)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(t('resetPassword.invalidToken' as any))
    }
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch' as any))
      return
    }

    if (password.length < 8) {
      setError(t('resetPassword.passwordMinLength' as any))
      return
    }

    if (!token) {
      setError(t('resetPassword.invalidToken' as any))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': 'default',
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          newPassword: password,
          tenantId: 'default',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.genericError' as any))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="outline" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('resetPassword.title' as any)}</CardTitle>
          <CardDescription>
            {t('resetPassword.subtitle' as any)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {t('resetPassword.success' as any)}
                </AlertDescription>
              </Alert>
              <Link href="/login">
                <Button className="w-full">
                  {t('resetPassword.goToLogin' as any)}
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
                <Label htmlFor="password">{t('resetPassword.newPassword' as any)}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('resetPassword.newPasswordPlaceholder' as any)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading || !token}
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('resetPassword.passwordRequirements' as any)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword' as any)}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('resetPassword.confirmPasswordPlaceholder' as any)}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading || !token}
                    autoComplete="new-password"
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !token}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('resetPassword.resetPassword' as any)}
              </Button>

              <div className="text-center">
                <Link href="/login">
                  <Button variant="link" className="text-sm">
                    {t('resetPassword.backToLogin' as any)}
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
