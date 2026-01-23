"use client"

import { useState } from "react"
import { Building2, MoreHorizontal, Eye, Ban, PlayCircle } from "lucide-react"
import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useTenants, useUpdateTenantStatus, useImpersonateTenant } from "@/hooks/use-admin"
import { Skeleton } from "@/components/ui/skeleton"
import type { TenantListItem } from "@/types/api"

export function TenantsList() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  
  const { data, isLoading } = useTenants({ search, status: statusFilter || undefined })
  const updateStatus = useUpdateTenantStatus()
  const impersonate = useImpersonateTenant()

  const handleStatusChange = (tenantId: string, status: 'active' | 'suspended' | 'trial') => {
    if (confirm(`Are you sure you want to change this tenant's status to ${status}?`)) {
      updateStatus.mutate({ tenantId, status })
    }
  }

  const handleImpersonate = (tenantId: string, tenantName: string) => {
    if (confirm(`Impersonate ${tenantName}? You will see the app as this tenant.`)) {
      impersonate.mutate(tenantId)
    }
  }

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise':
        return 'default'
      case 'professional':
        return 'default'
      case 'starter':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'trial':
        return 'secondary'
      case 'suspended':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Manage all platform tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Manage all platform tenants</CardDescription>
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {data?.items && data.items.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No tenants found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {search ? "Try adjusting your search" : "No tenants have been created yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.items.map((tenant: TenantListItem) => (
              <div
                key={tenant.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">{tenant.name}</h3>
                      <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                        {tenant.plan}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{tenant.userCount} users</span>
                      <span>{tenant.shardCount} shards</span>
                      <span>Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}</span>
                      {tenant.lastActivityAt && (
                        <span>
                          Last active {format(new Date(tenant.lastActivityAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleImpersonate(tenant.id, tenant.name)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Impersonate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tenant.status !== 'active' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(tenant.id, 'active')}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      {tenant.status === 'active' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(tenant.id, 'suspended')}
                          className="text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {data.items.length} of {data.total} tenants
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
