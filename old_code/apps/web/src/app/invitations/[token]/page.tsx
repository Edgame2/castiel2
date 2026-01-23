"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, Loader2, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInvitationPreview, useInvitationResponse } from "@/hooks/use-invitations"
import { useAuth } from "@/contexts/auth-context"
import type { InvitationMembershipInfo } from "@/types/api"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

interface InvitationPageProps {
  params: {
    token: string
  }
}

export default function InvitationPage({ params }: InvitationPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tenantId = searchParams.get('tenantId' as any) || undefined
  const token = params.token
  const [actionState, setActionState] = useState<'idle' | 'accepted' | 'declined'>('idle')
  const [tenantContextChoice, setTenantContextChoice] = useState<'current' | 'invited' | null>(null)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [membershipInfo, setMembershipInfo] = useState<InvitationMembershipInfo | null>(null)

  const { user } = useAuth()

  const { data, isLoading, error, refetch } = useInvitationPreview(tenantId, token)
  const respond = useInvitationResponse(tenantId, token)
  const shouldShowSwitchPrompt = Boolean(user && tenantId && user.tenantId !== tenantId)

  const statusBadge = useMemo(() => {
    if (!data) return null
    const status = data.isExpired ? 'expired' : data.status
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'accepted':
        return <Badge className="bg-emerald-500/10 text-emerald-500">Accepted</Badge>
      case 'declined':
        return <Badge className="bg-rose-500/10 text-rose-500">Declined</Badge>
      case 'expired':
        return <Badge className="bg-amber-500/10 text-amber-500">Expired</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }, [data])

  const rolesLabel = useMemo(() => {
    if (!data) return ''
    if (data.rolesPreset) {
      return data.rolesPreset
        .split('_' as any)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }
    if (data.roles?.length) {
      return data.roles.join(', ')
    }
    return 'Custom role to be assigned'
  }, [data])

  const handleResponse = async (action: 'accept' | 'decline') => {
    if (action === 'accept' && shouldShowSwitchPrompt && !tenantContextChoice) {
      setResponseError('Select which workspace should be active after accepting the invite.')
      return
    }

    try {
      setResponseError(null)
      const payload =
        action === 'accept' && shouldShowSwitchPrompt
          ? {
              tenantSwitchTargetId:
                tenantContextChoice === 'current' ? user?.tenantId : tenantId,
            }
          : undefined
      const result = await respond.mutateAsync({ action, body: payload })
      setActionState(action === 'accept' ? 'accepted' : 'declined')
      setMembershipInfo(action === 'accept' ? result.membership ?? null : null)
      await refetch()
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      trackException(errorObj, 3)
      trackTrace('Failed to respond to invitation', 3, {
        errorMessage: errorObj.message,
        action,
        token,
      })
    }
  }

  if (!tenantId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Invitation not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>This invitation link is missing tenant context.</p>
            <p>Please open the link from your email again to include the tenant identifier.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>This invitation may have been revoked or already used.</p>
            <p>Please contact the administrator who sent you the link.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const acceptDisabled =
    data.isExpired ||
    !data.isRedeemable ||
    respond.isPending ||
    data.status !== 'pending' ||
    (shouldShowSwitchPrompt && !tenantContextChoice)
  const declineDisabled = respond.isPending || data.status !== 'pending'

  const handleTenantChoice = (choice: 'current' | 'invited') => {
    setTenantContextChoice(choice)
    setResponseError(null)
  }

  const handleOpenDashboard = () => {
    router.push('/dashboard')
  }

  const handleSigninRedirect = () => {
    if (!membershipInfo?.tenantId) return
    const query = new URLSearchParams({ tenantId: membershipInfo.tenantId }).toString()
    router.push(`/login?${query}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Invitation to join</p>
              <CardTitle className="text-3xl">{data.tenantName || 'Tenant workspace'}</CardTitle>
            </div>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border bg-muted/10 p-4 text-sm">
            <p className="font-medium">From</p>
            <p className="text-muted-foreground">{data.issuerDisplayName || 'A tenant admin'}</p>
            <p className="mt-2 font-medium">Message</p>
            <p className="text-muted-foreground">{data.message || 'No additional message provided.'}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Expires at
              </div>
              <p className="text-lg font-semibold">{new Date(data.expiresAt).toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                Roles
              </div>
              <p className="text-lg font-semibold">{rolesLabel}</p>
            </div>
          </div>

          {data.isExpired && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4" />
              This invitation expired. Ask the tenant admin to send a new one.
            </div>
          )}

          {shouldShowSwitchPrompt && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              <p className="font-medium">You're already signed in as {user?.email}.</p>
              <p className="mt-1 text-indigo-900/80">
                Choose which workspace should stay active after you respond.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={tenantContextChoice === 'current' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleTenantChoice('current')}
                >
                  Stay in current tenant ({user?.tenantId || 'current'})
                </Button>
                <Button
                  type="button"
                  variant={tenantContextChoice === 'invited' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleTenantChoice('invited')}
                >
                  Switch to {data.tenantName || 'invited tenant'}
                </Button>
              </div>
            </div>
          )}

          {actionState === 'accepted' && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <CheckCircle2 className="h-4 w-4" />
              Invitation accepted! You can now switch to this tenant from your dashboard.
            </div>
          )}

          {actionState === 'declined' && (
            <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              <AlertCircle className="h-4 w-4" />
              Invitation declined. The administrator has been notified.
            </div>
          )}

          {actionState === 'accepted' && membershipInfo?.requiresVerification && (
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <Clock className="h-4 w-4" />
              Check your inbox to verify this email before accessing the workspace.
            </div>
          )}

          {actionState === 'accepted' && membershipInfo && !membershipInfo.requiresVerification && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
              <p className="font-medium">You're all set.</p>
              <p className="mt-1 text-slate-700">
                Use the buttons below to jump into the new workspace or review it later.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={handleOpenDashboard}>
                  Open dashboard
                </Button>
                <Button type="button" variant="outline" onClick={handleSigninRedirect}>
                  Sign in as this tenant
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="default"
              className="flex-1"
              disabled={acceptDisabled}
              onClick={() => handleResponse('accept')}
            >
              {respond.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept invitation
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={declineDisabled}
              onClick={() => handleResponse('decline')}
            >
              Decline
            </Button>
          </div>

          {responseError && (
            <p className="text-sm text-rose-600">{responseError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
