"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { FormFieldWrapper } from "@/components/forms/form-field-wrapper"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTenant, useUpdateTenant } from "@/hooks/use-tenant"
import { Badge } from "@/components/ui/badge"

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

export function OrganizationProfile() {
  const { data: tenant, isLoading } = useTenant()
  const updateTenant = useUpdateTenant()

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    values: {
      name: tenant?.name || "",
      logoUrl: tenant?.logoUrl || "",
    },
  })

  const onSubmit = async (data: OrganizationFormData) => {
    await updateTenant.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="h-10 w-full animate-pulse bg-muted rounded" />
            <div className="h-10 w-full animate-pulse bg-muted rounded" />
            <div className="h-10 w-32 animate-pulse bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Profile</CardTitle>
        <CardDescription>
          Manage your organization's basic information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormFieldWrapper
              control={form.control}
              name="name"
              label="Organization Name"
              description="The name of your organization"
            >
              {(field) => (
                <Input
                  {...field}
                  placeholder="Acme Corporation"
                  disabled={updateTenant.isPending}
                />
              )}
            </FormFieldWrapper>

            <FormFieldWrapper
              control={form.control}
              name="logoUrl"
              label="Logo URL"
              description="URL to your organization's logo"
            >
              {(field) => (
                <Input
                  {...field}
                  placeholder="https://example.com/logo.png"
                  disabled={updateTenant.isPending}
                />
              )}
            </FormFieldWrapper>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Organization Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge variant="default" className="mt-1">
                    {tenant?.plan?.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={tenant?.status === "active" ? "default" : "outline"}
                    className="mt-1"
                  >
                    {tenant?.status?.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Users</p>
                  <p className="text-lg font-medium">{tenant?.maxUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Shards</p>
                  <p className="text-lg font-medium">{tenant?.maxShards}</p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={updateTenant.isPending}>
              {updateTenant.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
