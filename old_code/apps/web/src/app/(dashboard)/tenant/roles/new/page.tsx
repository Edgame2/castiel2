"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { useAuth } from "@/contexts/auth-context"
import { useCreateRole, usePermissions } from "@/hooks/use-roles"

const roleFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Name must be lowercase alphanumeric with hyphens only"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
})

type RoleFormData = z.infer<typeof roleFormSchema>

export default function NewRolePage() {
  const router = useRouter()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""

  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: permissionsData, isLoading: permissionsLoading } = usePermissions()
  const createRoleMutation = useCreateRole()

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      permissions: [],
    },
  })

  const selectedPermissions = form.watch("permissions")

  const onSubmit = async (data: RoleFormData) => {
    setSubmitError(null)
    try {
      await createRoleMutation.mutateAsync(data)
      router.push("/tenant/roles")
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || "Failed to create role. Please try again.")
    }
  }

  const togglePermission = (permissionId: string) => {
    const current = form.getValues("permissions")
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
    const current = form.getValues("permissions")
    const allSelected = categoryPermissions.every((p) => current.includes(p))
    
    if (allSelected) {
      // Deselect all in category
      form.setValue(
        "permissions",
        current.filter((p) => !categoryPermissions.includes(p))
      )
    } else {
      // Select all in category
      const newPermissions = [...new Set([...current, ...categoryPermissions])]
      form.setValue("permissions", newPermissions)
    }
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
            Create New Role
          </h1>
          <p className="text-muted-foreground">Define a new role with specific permissions</p>
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
              <CardDescription>Basic details about the role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name (ID)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin-user"
                        {...field}
                        disabled={createRoleMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase, alphanumeric with hyphens. Used as internal identifier.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        disabled={createRoleMutation.isPending}
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
                        disabled={createRoleMutation.isPending}
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
                Select the permissions this role should have
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
                const someSelected = categoryPermissionIds.some((p) =>
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
                        disabled={createRoleMutation.isPending}
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
                              disabled={createRoleMutation.isPending}
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
              disabled={createRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRoleMutation.isPending}>
              {createRoleMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Role
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
