'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useRequestMagicLink } from '@/hooks/use-magic-link'
import { LanguageSwitcher } from '@/components/layout/language-switcher'

export default function MagicLinkRequestPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('auth') as any
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const requestMutation = useRequestMagicLink()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError(t('magicLink.emailRequired' as any))
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('magicLink.invalidEmail' as any))
      return
    }

    try {
      await requestMutation.mutateAsync({
        email,
        returnUrl: '/dashboard',
      })
      setSuccess(true)
    } catch {
      setError(t('magicLink.sendFailed' as any))
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-gray-900 dark:via-gray-800 dark:to-violet-900 p-4">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('magicLink.checkEmail' as any)}</CardTitle>
            <CardDescription className="text-base">
              {t('magicLink.emailSent', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {t('magicLink.linkExpiresIn' as any)}
              </AlertDescription>
            </Alert>

            <div className="text-center text-sm text-muted-foreground">
              <p>{t('magicLink.didntReceive' as any)}</p>
              <Button
                variant="link"
                className="p-0 h-auto text-violet-600 dark:text-violet-400"
                onClick={() => setSuccess(false)}
              >
                {t('magicLink.tryAgain' as any)}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center pt-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('magicLink.backToLogin' as any)}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-gray-900 dark:via-gray-800 dark:to-violet-900 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('magicLink.title' as any)}</CardTitle>
          <CardDescription className="text-base">
            {t('magicLink.description' as any)}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('magicLink.emailLabel' as any)}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('magicLink.emailPlaceholder' as any)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('magicLink.sending' as any)}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('magicLink.sendButton' as any)}
                </>
              )}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
                  {t('magicLink.or' as any)}
                </span>
              </div>
            </div>

            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('magicLink.backToLogin' as any)}
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

