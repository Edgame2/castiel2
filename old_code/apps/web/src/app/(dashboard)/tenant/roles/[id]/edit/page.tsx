"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Save, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/auth-context"
import { useRole, useUpdateRole, usePermissions } from "@/hooks/use-roles"

const roleEditSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters")
    .optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required").optional(),
})

type RoleEditData = z.infer<typeof roleEditSchema>

export default function EditRolePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""
  const roleId = params.id as string

  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: role, isLoading: roleLoading } = useRole(roleId)
  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions()
  const updateRoleMutation = useUpdateRole(roleId)

  const form = useForm<RoleEditData>({
    resolver: zodResolver(roleEditSchema),
    defaultValues: {
      displayName: "",
      description: "",
      permissions: [],
    },
  })

  useEffect(() => {
    if (role) {
      form.reset({
        displayName: role.displayName,
        description: role.description || "",
        permissions: role.permissions,
      })
    }
  }, [role, form])

  const selectedPermissions = form.watch("permissions") || []

  const onSubmit = async (data: RoleEditData) => {
    setSubmitError(null)
    try {
      await updateRoleMutation.mutateAsync(data)
      router.push(`/tenant/roles/${roleId}`)
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || "Failed to update role. Please try again.")
    }
  }

  const togglePermission = (permissionId: string) => {
    const current = form.getValues("permissions") || []
    if (current.includes(permissionId)) {
      form.setValue(
        "permissions",
        current.filter((p) => p !== permissionId)
      )
    } else {
      form.setValue("permissions", [...current, permissionId])
    }
  }

  const toggleCategory = (categoryPermissions: string[]) => {
    const current = form.getValues("permissions") || []
    const allSelected = categoryPermissions.every((p) => current.includes(p))

    if (allSelected) {
      form.setValue(
        "permissions",
        current.filter((p) => !categoryPermissions.includes(p))
      )
    } else {
      const newPermissions = [...new Set([...current, ...categoryPermissions])]
      form.setValue("permissions", newPermissions)
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
      </div>
    )
  }

  if (role.isSystem) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>System roles cannot be edited.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/tenant/roles")}>
          Back to Roles
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Edit Role
          </h1>
          <p className="text-muted-foreground">Update role details and permissions</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Role Information</CardTitle>
              <CardDescription>Update role details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FormLabel>Role Name (ID)</FormLabel>
                <Input value={role.name} disabled className="mt-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Role ID cannot be changed
                </p>
              </div>

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Admin User"
                        {...field}
                        disabled={updateRoleMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Human-readable name shown in the interface.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what this role is for..."
                        {...field}
                        disabled={updateRoleMutation.isPending}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Update the permissions for this role
                {selectedPermissions.length > 0 && (
                  <span className="ml-2">
                    ({selectedPermissions.length} selected)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.formState.errors.permissions && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {form.formState.errors.permissions.message}
                  </AlertDescription>
                </Alert>
              )}

              {permissionsLoading && (
                <div className="text-sm text-muted-foreground">Loading permissions...</div>
              )}

              {permissionsData?.categories.map((category) => {
                const categoryPermissionIds = category.permissions.map((p) => p.id)
                const allSelected = categoryPermissionIds.every((p) =>
                  selectedPermissions.includes(p)
                )

                return (
                  <div key={category.name} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </div>
                      <Button
                        type="button"
                        variant={allSelected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleCategory(categoryPermissionIds)}
                        disabled={updateRoleMutation.isPending}
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </Button>
                    </div>

                    <div className="grid gap-3 pl-4 border-l-2">
                      {category.permissions.map((permission) => {
                        const isSelected = selectedPermissions.includes(permission.id)
                        return (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-3 cursor-pointer"
                            onClick={() => togglePermission(permission.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={updateRoleMutation.isPending}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{permission.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {permission.action}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {category !== permissionsData.categories[permissionsData.categories.length - 1] && (
                      <Separator />
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
