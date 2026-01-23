'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

export default function PendingApprovalPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = useTranslation('auth') as any
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)

  const tenantName = searchParams.get('tenantName' as any)?.trim()
  const email = searchParams.get('email' as any)?.toLowerCase()
  const joinRequestId = searchParams.get('joinRequestId' as any)?.trim()
  const domain = searchParams.get('domain' as any)?.trim()

  const displayTenantName = tenantName || domain || t('pending.tenant' as any)

  const STEPS = [
    {
      title: t('pending.step1Title' as any),
      body: t('pending.step1Body' as any),
      icon: Clock3,
    },
    {
      title: t('pending.step2Title' as any),
      body: t('pending.step2Body' as any),
      icon: Mail,
    },
    {
      title: t('pending.step3Title' as any),
      body: t('pending.step3Body' as any),
      icon: ShieldCheck,
    },
  ]

  const supportHref = useMemo(() => {
    const params = new URLSearchParams({
      subject: 'Join request status',
      body: `Please include your request ID (${joinRequestId || 'Unknown'}) and tenant name (${displayTenantName}).`,
    })
    return `mailto:support@castiel.com?${params.toString()}`
  }, [joinRequestId, displayTenantName])

  const requestSummary = useMemo(() => {
    return [
      { label: t('pending.tenant' as any), value: tenantName || t('pending.pendingAssignment' as any) },
      { label: t('pending.domain' as any), value: domain || t('pending.notProvided' as any) },
      { label: t('pending.email' as any), value: email || t('pending.unknownEmail' as any) },
      { label: t('pending.requestId' as any), value: joinRequestId || t('pending.generating' as any) },
    ]
  }, [tenantName, domain, email, joinRequestId, t])

  const handleCopy = async () => {
    if (!joinRequestId) return
    try {
      await navigator.clipboard.writeText(joinRequestId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 2)
      trackTrace('Failed to copy join request ID', 2, {
        errorMessage: errorObj.message,
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="ghost" className="text-white hover:bg-white/10" />
      </div>
      <Card className="w-full max-w-3xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-900">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('pending.badge' as any)}
            </Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">{t('pending.title' as any)}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {tenantName ? (
                <span>
                  {t('pending.subtitle', { tenantName: displayTenantName })}
                </span>
              ) : (
                t('pending.subtitleDefault' as any)
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('pending.alert' as any)}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('pending.tenant' as any)}</p>
                <p className="text-lg font-semibold text-foreground">{displayTenantName}</p>
              </div>
              {joinRequestId && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={handleCopy}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {copied ? t('pending.copied' as any) : t('pending.copyRequestId' as any)}
                </Button>
              )}
            </div>
            <Separator className="my-4" />
            <dl className="grid gap-4 md:grid-cols-2">
              {requestSummary.map(({ label, value }) => (
                <div key={label} className="rounded-md border bg-background/40 p-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t('pending.whatHappensNext' as any)}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {STEPS.map(({ title, body, icon: Icon }) => (
                <div key={title} className="rounded-lg border bg-background/60 p-4 text-sm">
                  <Icon className="mb-3 h-6 w-6 text-primary" />
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Button asChild variant="default">
              <Link href="/login">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('pending.backToLogin' as any)}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={supportHref}>
                <Mail className="mr-2 h-4 w-4" />
                {t('pending.emailSupport' as any)}
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/register">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('pending.startOver' as any)}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
