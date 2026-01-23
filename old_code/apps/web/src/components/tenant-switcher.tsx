"use client"

import * as React from "react"
import { Building2, ChevronsUpDown, Check, Star, Loader2 } from "lucide-react"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useTenantMemberships, useSwitchTenant } from "@/hooks/use-tenant-memberships"
import { cn } from "@/lib/utils"

export function TenantSwitcher() {
  const { isMobile } = useSidebar()
  const { user } = useAuth()
  const { data, isLoading } = useTenantMemberships()
  const { mutate: switchTenant, isPending: isSwitching } = useSwitchTenant()

  const tenants = data?.tenants || []
  const currentTenantId = user?.tenantId
  const currentTenant = tenants.find(t => t.tenantId === currentTenantId)
  const hasMultipleTenants = tenants.length > 1

  const handleSelect = (tenantId: string) => {
    if (tenantId === currentTenantId) return
    switchTenant(tenantId)
  }

  // Get user's role in current tenant
  const getRoleLabel = () => {
    if (!currentTenant) return "Member"
    if (user?.roles?.includes('superadmin')) return "Super Admin"
    if (user?.roles?.includes('owner')) return "Owner"
    if (user?.roles?.includes('admin')) return "Admin"
    return "Member"
  }

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Loader2 className="size-4 animate-spin" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Loading...</span>
              <span className="truncate text-xs">Please wait</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!currentTenant) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No Tenant</span>
              <span className="truncate text-xs">Select a tenant</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!hasMultipleTenants) {
    // Single tenant - no dropdown needed
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {currentTenant.tenantName || currentTenant.tenantId}
              </span>
              <span className="truncate text-xs">{getRoleLabel()}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isSwitching}
            >
              {isSwitching ? (
                <>
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Switching...</span>
                    <span className="truncate text-xs">Please wait</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {currentTenant.tenantName || currentTenant.tenantId}
                    </span>
                    <span className="truncate text-xs">{getRoleLabel()}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Your Tenants
            </DropdownMenuLabel>
            {tenants.map((tenant) => {
              const isActive = tenant.tenantId === currentTenantId
              const isDefault = tenant.isDefault

              return (
                <DropdownMenuItem
                  key={tenant.tenantId}
                  onClick={() => handleSelect(tenant.tenantId)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Building2 className="size-3.5 shrink-0" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate font-medium text-sm">
                        {tenant.tenantName || tenant.tenantId}
                      </span>
                      {isDefault && (
                        <Star className="h-3 w-3 text-amber-500 shrink-0 fill-amber-500" />
                      )}
                    </div>
                    {tenant.domain && (
                      <span className="text-xs text-muted-foreground truncate">
                        {tenant.domain}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <Check className="size-4 shrink-0" />
                  )}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Star className="size-4" />
                </div>
                <div className="font-medium">Manage default tenant</div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
