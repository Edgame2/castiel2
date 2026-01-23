"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenantMemberships, useUpdateDefaultTenant } from '@/hooks/use-tenant-memberships'
import { CheckCircle2, RefreshCcw, Star, Users2 } from 'lucide-react'

export function TenantMembershipsCard() {
  const { data, isLoading, isError, refetch } = useTenantMemberships()
  const {
    mutateAsync: setDefault,
    isPending: isUpdating,
    variables: updatingTenant,
  } = useUpdateDefaultTenant()

  const tenants = data?.tenants || []
  const defaultTenantId = data?.defaultTenantId || null
  const hasTenants = tenants.length > 0

  const handleSetDefault = async (tenantId: string) => {
    await setDefault(tenantId)
  }

  let body

  if (isLoading) {
    body = (
      <div className="space-y-4">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex flex-col gap-2 rounded-md border p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  } else if (isError) {
    body = (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-4">
          Unable to load tenant memberships.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (!hasTenants) {
    body = (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Your account is not associated with any tenants yet.
      </div>
    )
  } else {
    body = (
      <div className="space-y-3">
        {tenants.map((tenant) => {
          const isDefault = tenant.isDefault || tenant.tenantId === defaultTenantId
          const inFlight = isUpdating && updatingTenant === tenant.tenantId

          return (
            <div
              key={tenant.tenantId}
              className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium">{tenant.tenantName || tenant.tenantId}</p>
                  {isDefault && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3" /> Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tenant.domain ? tenant.domain : 'Domain not configured'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users2 className="h-3 w-3" />
                    {tenant.roles.join(', ') || 'member'}
                  </span>
                  {tenant.status && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {tenant.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => handleSetDefault(tenant.tenantId)}
                  >
                    {inFlight && <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />}
                    Set as default
                  </Button>
                )}
                {isDefault && (
                  <span className="text-sm text-muted-foreground">
                    Used automatically for future logins
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" /> Default Tenant
        </CardTitle>
        <CardDescription>
          Review your tenant memberships and pick which tenant should open by default when you log in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {body}
        {hasTenants && (
          <p className="mt-4 text-xs text-muted-foreground">
            Changes apply immediately to stored tenant context and will be used for your next login session.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
