"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Shield, Users, Trash2, Edit, MoreVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useRoles, useDeleteRole } from "@/hooks/use-roles"
import type { RoleEntity } from "@/types/roles"

export default function RolesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""
  
  const [searchQuery, setSearchQuery] = useState("")
  const [includeSystem, setIncludeSystem] = useState(true)
  const [roleToDelete, setRoleToDelete] = useState<RoleEntity | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)

  const { data, isLoading, error } = useRoles({ 
    includeSystem,
    search: searchQuery || undefined,
  })
  const deleteRoleMutation = useDeleteRole()

  const handleDeleteClick = (role: RoleEntity) => {
    setRoleToDelete(role)
    setDeleteError(null)
    setDeleteSuccess(false)
  }

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return

    try {
      await deleteRoleMutation.mutateAsync(roleToDelete.id)
      setDeleteSuccess(true)
      setDeleteError(null)
      setTimeout(() => {
        setRoleToDelete(null)
        setDeleteSuccess(false)
      }, 2000)
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || "Failed to delete role. Please try again.")
    }
  }

  if (!tenantId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No tenant ID found. Please log in again.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage roles and permissions for your organization
              </CardDescription>
            </div>
            <Button onClick={() => router.push(`/tenant/roles/new`)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeSystem"
                checked={includeSystem}
                onChange={(e) => setIncludeSystem(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="includeSystem" className="text-sm text-muted-foreground cursor-pointer">
                Include system roles
              </label>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load roles. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-10" />
                </div>
              ))}
            </div>
          )}

          {/* Roles Table */}
          {!isLoading && data && (
            <>
              {data.roles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No roles found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "Get started by creating your first role"}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => router.push(`/tenant/roles/new`)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Role
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Permissions</TableHead>
                        <TableHead className="text-center">Members</TableHead>
                        <TableHead className="text-center">Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.roles.map((role) => (
                        <TableRow 
                          key={role.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/tenant/roles/${role.id}`)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              {role.displayName}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {role.description || "No description"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {role.permissions.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{role.memberCount || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {role.isSystem ? (
                              <Badge variant="outline">System</Badge>
                            ) : (
                              <Badge variant="secondary">Custom</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/tenant/roles/${role.id}`)}
                                >
                                  View Details
                                </DropdownMenuItem>
                                {!role.isSystem && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => router.push(`/tenant/roles/${role.id}/edit`)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteClick(role)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Results Count */}
              {data.roles.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {data.roles.length} of {data.total} role{data.total !== 1 ? "s" : ""}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      {roleToDelete && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Role</CardTitle>
            <CardDescription>
              Are you sure you want to delete the role "{roleToDelete.displayName}"?
              This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleToDelete.memberCount && roleToDelete.memberCount > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Warning: This role has {roleToDelete.memberCount} member{roleToDelete.memberCount !== 1 ? "s" : ""}.
                  You must remove all members before deleting the role.
                </AlertDescription>
              </Alert>
            )}
            {deleteError && (
              <Alert variant="destructive">
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
            {deleteSuccess && (
              <Alert>
                <AlertDescription>Role deleted successfully!</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRoleToDelete(null)
                  setDeleteError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteRoleMutation.isPending || (roleToDelete.memberCount && roleToDelete.memberCount > 0) || deleteSuccess}
              >
                {deleteRoleMutation.isPending ? "Deleting..." : "Delete Role"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
