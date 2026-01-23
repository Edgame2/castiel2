"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Shield, ShieldOff, Pencil, Trash, KeyRound } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import type { User, UserStatus } from "@/types/api"
import { useActivateUser, useDeactivateUser, useDeleteUser, useAdminPasswordReset } from "@/hooks/use-users"
import { createSelectColumn } from "@/components/widgets/data-table"
import { impersonateUser } from "@/lib/api/auth"
import { useProfile } from "@/hooks/use-profile"
import { clearTokenCache } from "@/lib/api/client"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"

// Helper to get user display name
function getUserDisplayName(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) return user.firstName
  if (user.lastName) return user.lastName
  return user.email.split('@' as any)[0]
}

// Helper to get initials
function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  if (user.firstName) return user.firstName.substring(0, 2).toUpperCase()
  return user.email.substring(0, 2).toUpperCase()
}

// Status color mapping
function getStatusVariant(status: UserStatus): "default" | "outline" | "destructive" | "secondary" {
  switch (status) {
    case 'active': return 'default'
    case 'suspended': return 'destructive'
    case 'pending': return 'secondary'
    case 'deleted': return 'outline'
    default: return 'outline'
  }
}

// Status label mapping
function getStatusLabel(status: UserStatus): string {
  switch (status) {
    case 'active': return 'Active'
    case 'inactive': return 'Inactive'
    case 'suspended': return 'Suspended'
    case 'pending': return 'Pending'
    case 'deleted': return 'Deleted'
    default: return status
  }
}

export function userColumns(): ColumnDef<User>[] {
  return [
    createSelectColumn<User>(),
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const user = row.original
        const displayName = getUserDisplayName(user)
        const initials = getUserInitials(user)

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => {
        const roles = row.original.roles
        if (!roles || roles.length === 0) return <span className="text-muted-foreground">No roles</span>

        return (
          <div className="flex flex-wrap gap-1">
            {roles.slice(0, 2).map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
            {roles.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{roles.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge variant={getStatusVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "lastLoginAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Login" />
      ),
      cell: ({ row }) => {
        const date = row.original.lastLoginAt
        return date ? format(new Date(date), "MMM d, yyyy HH:mm") : "Never"
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => {
        return format(new Date(row.original.createdAt), "MMM d, yyyy")
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original
        const router = useRouter()
        const activateUser = useActivateUser()
        const deactivateUser = useDeactivateUser()
        const deleteUser = useDeleteUser()
        const resetPassword = useAdminPasswordReset()
        const { data: profile } = useProfile()

        // Check if global admin (simple check, improve with proper permission check if needed)
        const isGlobalAdmin = profile?.roles?.includes('global_admin') || profile?.roles?.includes('super_admin')

        const canActivate = user.status === 'suspended' || user.status === 'inactive'
        const canDeactivate = user.status === 'active'

        const handleActivate = (e: React.MouseEvent) => {
          e.stopPropagation()
          if (confirm(`Activate ${getUserDisplayName(user)}?`)) {
            activateUser.mutate(user.id)
          }
        }

        const handleDeactivate = (e: React.MouseEvent) => {
          e.stopPropagation()
          if (confirm(`Deactivate ${getUserDisplayName(user)}? They won't be able to log in.`)) {
            deactivateUser.mutate(user.id)
          }
        }

        const handleResetPassword = (e: React.MouseEvent) => {
          e.stopPropagation()
          if (confirm(`Send password reset email to ${user.email}?`)) {
            resetPassword.mutate({ id: user.id, data: { sendEmail: true } })
          }
        }

        const handleDelete = (e: React.MouseEvent) => {
          e.stopPropagation()
          if (confirm(`Delete ${getUserDisplayName(user)}? This action marks the user as deleted.`)) {
            deleteUser.mutate(user.id)
          }
        }

        const handleEdit = (e: React.MouseEvent) => {
          e.stopPropagation()
          router.push(`/users/${user.id}/edit`)
        }

        const handleImpersonate = async (e: React.MouseEvent) => {
          e.stopPropagation()
          if (!confirm(`Impersonate ${getUserDisplayName(user)}?`)) return

          try {
            // Impersonate request
            const data = await impersonateUser(user.id, user.tenantId)

            // Store tokens
            await fetch('/api/auth/set-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
              }),
            })

            // Clear cache and update storage
            clearTokenCache()
            if (typeof window !== 'undefined') {
              localStorage.setItem('tenantId', user.tenantId)
            }

            toast.success(`Impersonating ${getUserDisplayName(user)}`)

            // Reload to apply new auth state
            window.location.href = '/'
          } catch (error) {
            toast.error("Failed to impersonate user")
            const errorObj = error instanceof Error ? error : new Error(String(error))
            trackException(errorObj, 3)
            trackTrace("Failed to impersonate user", 3, {
              errorMessage: errorObj.message,
              userId: user.id,
              tenantId: user.tenantId,
            })
          }
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {isGlobalAdmin && user.id !== profile?.id && (
                <>
                  <DropdownMenuItem onClick={handleImpersonate}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Impersonate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleResetPassword}>
                <KeyRound className="mr-2 h-4 w-4" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canActivate && (
                <DropdownMenuItem onClick={handleActivate}>
                  <Shield className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              {canDeactivate && (
                <DropdownMenuItem onClick={handleDeactivate}>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Deactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash className="mr-2 h-4 w-4" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
