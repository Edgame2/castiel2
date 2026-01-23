"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit, Shield, Users, Trash2, UserPlus, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import { useRole, useRoleMembers, usePermissions, useRemoveRoleMember } from "@/hooks/use-roles"

export default function RoleDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""
  const roleId = params.id as string

  const [removeError, setRemoveError] = useState<string | null>(null)

  const { data: role, isLoading: roleLoading } = useRole(roleId)
  const { data: members, isLoading: membersLoading } = useRoleMembers(roleId)
  const { data: permissionsData } = usePermissions()
  const removeRoleMemberMutation = useRemoveRoleMember(roleId)

  const handleRemoveMember = async (userId: string) => {
    setRemoveError(null)
    try {
      await removeRoleMemberMutation.mutateAsync(userId)
    } catch (error: any) {
      setRemoveError(error.response?.data?.message || "Failed to remove member")
    }
  }

  if (roleLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!role) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>Role not found.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/tenant/roles")}>
          Back to Roles
        </Button>
      </div>
    )
  }

  // Get permission details
  const rolePermissions = permissionsData?.categories
    .flatMap((cat) => cat.permissions)
    .filter((p) => role.permissions.includes(p.id)) || []

  // Group permissions by category
  const permissionsByCategory = permissionsData?.categories.map((cat) => ({
    ...cat,
    permissions: cat.permissions.filter((p) => role.permissions.includes(p.id)),
  })).filter((cat) => cat.permissions.length > 0) || []

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/tenant/roles")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8" />
              <h1 className="text-3xl font-bold">{role.displayName}</h1>
              {role.isSystem && <Badge variant="outline">System</Badge>}
            </div>
            <p className="text-muted-foreground">
              {role.description || "No description provided"}
            </p>
          </div>
        </div>
        {!role.isSystem && (
          <Button onClick={() => router.push(`/tenant/roles/${roleId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Role
          </Button>
        )}
      </div>

      {/* Role Details */}
      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role ID</p>
              <p className="text-sm">{role.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-sm">{role.isSystem ? "System Role" : "Custom Role"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Members</p>
              <p className="text-sm flex items-center gap-1">
                <Users className="h-4 w-4" />
                {role.memberCount || 0}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Permissions</p>
              <p className="text-sm">{role.permissions.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-sm">{format(new Date(role.createdAt), "PPP")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm">{format(new Date(role.updatedAt), "PPP")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions ({role.permissions.length})</CardTitle>
          <CardDescription>Capabilities granted to users with this role</CardDescription>
        </CardHeader>
        <CardContent>
          {permissionsByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions assigned</p>
          ) : (
            <div className="space-y-6">
              {permissionsByCategory.map((category) => (
                <div key={category.name} className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="grid gap-2 pl-4 border-l-2">
                    {category.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{permission.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {permission.action}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {category !== permissionsByCategory[permissionsByCategory.length - 1] && (
                    <Separator />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members ({members?.total || 0})
              </CardTitle>
              <CardDescription>Users assigned to this role</CardDescription>
            </div>
            {/* Future: Add member button
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Members
            </Button>
            */}
          </div>
        </CardHeader>
        <CardContent>
          {removeError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{removeError}</AlertDescription>
            </Alert>
          )}

          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : members && members.members.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.members.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell className="font-medium">
                        {member.userName || "Unknown User"}
                      </TableCell>
                      <TableCell>{member.userEmail}</TableCell>
                      <TableCell>
                        {format(new Date(member.assignedAt), "PPP")}
                      </TableCell>
                      <TableCell className="text-right">
                        {!role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removeRoleMemberMutation.isPending}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No members assigned to this role</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
