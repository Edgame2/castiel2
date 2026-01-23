"use client"

import { useState } from "react"
import { UserPlus, Filter, Shield, ShieldOff, Trash } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { DataTable, type DataTableBulkAction } from "@/components/data-table/data-table"
import { useUsers, useBulkUserOperation } from "@/hooks/use-users"
import { SYSTEM_PERMISSIONS } from "@castiel/shared-types"
import { usePermissionCheck } from "@/hooks/use-permission-check"
import type { User } from "@/types/api"
import { userColumns } from "./columns"
import { InviteUserDialog } from "@/components/users/invite-user-dialog"
import { ImportUsersDialog } from "@/components/users/import-users-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function UsersPage() {
  const router = useRouter()
  const { t } = useTranslation(['users', 'common'])
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  // Filters
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [roleFilter, setRoleFilter] = useState<string | undefined>()
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const { data, isLoading, refetch } = useUsers({
    page,
    limit,
    search: search || undefined,
    status: statusFilter,
    role: roleFilter,
    sortBy,
    sortOrder,
  })

  // Bulk Operations
  const bulkOperation = useBulkUserOperation()
  const canCreateUsers = usePermissionCheck(SYSTEM_PERMISSIONS.USERS.CREATE)
  const canUpdateUsers = usePermissionCheck(SYSTEM_PERMISSIONS.USERS.UPDATE)
  const canDeleteUsers = usePermissionCheck(SYSTEM_PERMISSIONS.USERS.DELETE)

  const bulkActions: DataTableBulkAction<User>[] = []

  if (canUpdateUsers) {
    bulkActions.push({
      id: 'activate',
      label: 'Activate',
      icon: Shield,
      onClick: (rows) => bulkOperation.mutate({
        action: 'activate',
        userIds: rows.map(r => r.id)
      })
    })
    bulkActions.push({
      id: 'deactivate',
      label: 'Deactivate',
      icon: ShieldOff,
      onClick: (rows) => bulkOperation.mutate({
        action: 'deactivate',
        userIds: rows.map(r => r.id)
      })
    })
  }

  if (canDeleteUsers) {
    bulkActions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash,
      variant: 'destructive',
      confirmMessage: 'Are you sure you want to delete these users?',
      onClick: (rows) => bulkOperation.mutate({
        action: 'delete',
        userIds: rows.map(r => r.id)
      })
    })
  }

  const handleRowClick = (user: any) => {
    router.push(`/users/${user.id}`)
  }

  const handleClearFilters = () => {
    setSearch("")
    setStatusFilter(undefined)
    setRoleFilter(undefined)
    setSortBy("createdAt")
    setSortOrder("desc")
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter || roleFilter || sortBy !== "createdAt" || sortOrder !== "desc"

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('users:title' as any)}</h1>
          <p className="text-muted-foreground">
            {t('users:subtitle' as any)}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreateUsers && (
            <ImportUsersDialog onUserImported={() => refetch()} />
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {t('common:filter' as any)}
                {hasActiveFilters && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    •
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{t('common:filter' as any)} {t('users:title' as any)}</SheetTitle>
                <SheetDescription>
                  {t('users:searchPlaceholder' as any)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">{t('common:status' as any)}</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder={t('common:all' as any)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common:all' as any)}</SelectItem>
                      <SelectItem value="active">{t('users:status.active' as any)}</SelectItem>
                      <SelectItem value="inactive">{t('users:status.inactive' as any)}</SelectItem>
                      <SelectItem value="suspended">{t('users:status.suspended' as any)}</SelectItem>
                      <SelectItem value="pending">{t('users:status.pending' as any)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">{t('users:table.role' as any)}</Label>
                  <Input
                    id="role"
                    placeholder={t('users:searchPlaceholder' as any)}
                    value={roleFilter || ""}
                    onChange={(e) => setRoleFilter(e.target.value || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortBy">{t('common:filter' as any)}</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sortBy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">{t('common:createdAt' as any)}</SelectItem>
                      <SelectItem value="lastLoginAt">{t('users:table.lastLogin' as any)}</SelectItem>
                      <SelectItem value="email">{t('common:email' as any)}</SelectItem>
                      <SelectItem value="firstName">{t('users:form.firstName' as any)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">{t('common:filter' as any)}</Label>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger id="sortOrder">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">{t('common:filter' as any)}</SelectItem>
                      <SelectItem value="asc">{t('common:filter' as any)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClearFilters}
                  >
                    {t('common:clear' as any)}
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('users:inviteUser' as any)}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">{data.total}</div>
            <div className="text-sm text-muted-foreground">{t('users:title' as any)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">
              {data.users.filter(u => u.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">{t('users:status.active' as any)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">
              {data.users.filter(u => u.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">{t('users:status.pending' as any)}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-2xl font-bold">
              {data.users.filter(u => u.status === 'suspended').length}
            </div>
            <div className="text-sm text-muted-foreground">{t('users:status.suspended' as any)}</div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <DataTable
        columns={userColumns()}
        data={data?.users || []}
        searchKey="email"
        searchPlaceholder={t('users:searchPlaceholder' as any)}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        bulkActions={bulkActions}
      />

      {/* Custom Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {t('common:showing' as any)} {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} {t('common:of' as any)} {data.total}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('common:previous' as any)}
            </Button>
            <div className="text-sm">
              {page} / {data.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              {t('common:next' as any)}
            </Button>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  )
}
