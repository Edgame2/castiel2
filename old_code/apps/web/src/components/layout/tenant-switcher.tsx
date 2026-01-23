'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Building2, Star, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTenantMemberships, useSwitchTenant } from '@/hooks/use-tenant-memberships'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface TenantSwitcherProps {
  collapsed?: boolean
}

export function TenantSwitcher({ collapsed = false }: TenantSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { data, isLoading } = useTenantMemberships()
  const { mutate: switchTenant, isPending: isSwitching } = useSwitchTenant()

  const tenants = data?.tenants || []
  const currentTenantId = user?.tenantId
  const currentTenant = tenants.find(t => t.tenantId === currentTenantId)
  const hasMulitpleTenants = tenants.length > 1

  const handleSelect = (tenantId: string) => {
    if (tenantId === currentTenantId) {
      setOpen(false)
      return
    }
    switchTenant(tenantId)
    setOpen(false)
  }

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2',
        collapsed && 'justify-center px-0'
      )}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {!collapsed && <span className="text-sm text-muted-foreground">Loading...</span>}
      </div>
    )
  }

  if (!hasMulitpleTenants) {
    // Single tenant - just show the name without dropdown
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2',
        collapsed && 'justify-center px-2'
      )}>
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        {!collapsed && (
          <span className="text-sm font-medium truncate">
            {currentTenant?.tenantName || currentTenantId || 'Unknown'}
          </span>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select tenant"
          className={cn(
            'w-full justify-between bg-muted/30 hover:bg-muted/50',
            collapsed && 'w-10 px-0 justify-center'
          )}
          disabled={isSwitching}
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {!collapsed && <span className="ml-2">Switching...</span>}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="truncate">
                    {currentTenant?.tenantName || currentTenantId || 'Select tenant'}
                  </span>
                )}
              </div>
              {!collapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tenants..." />
          <CommandList>
            <CommandEmpty>No tenant found.</CommandEmpty>
            <CommandGroup heading="Your Tenants">
              {tenants.map((tenant) => {
                const isActive = tenant.tenantId === currentTenantId
                const isDefault = tenant.isDefault

                return (
                  <CommandItem
                    key={tenant.tenantId}
                    value={tenant.tenantId}
                    onSelect={() => handleSelect(tenant.tenantId)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {tenant.tenantName || tenant.tenantId}
                        </span>
                        {isDefault && (
                          <Star className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      {tenant.domain && (
                        <span className="text-xs text-muted-foreground truncate">
                          {tenant.domain}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Active
                      </Badge>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  <Star className="h-4 w-4" />
                  <span>Manage default tenant</span>
                </Link>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

