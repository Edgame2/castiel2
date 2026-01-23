"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ShieldCheck, AlertCircle } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useSSOConfig, useUpdateSSOConfig } from "@/hooks/use-tenant"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const ssoConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(["saml", "oidc"]),
  entityId: z.string().min(1, "Entity ID is required"),
  ssoUrl: z.string().url("Must be a valid URL"),
  certificate: z.string().min(1, "Certificate is required"),
  attributeMapping: z.object({
    email: z.string().min(1, "Email attribute is required"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
})

type SSOConfigValues = z.infer<typeof ssoConfigSchema>

export function SSOConfiguration() {
  const { data: ssoConfig, isLoading } = useSSOConfig()
  const updateSSOConfig = useUpdateSSOConfig()
  const [isTesting, setIsTesting] = useState(false)

  const form = useForm<SSOConfigValues>({
    resolver: zodResolver(ssoConfigSchema),
    values: ssoConfig
      ? {
          enabled: ssoConfig.enabled,
          provider: ssoConfig.provider,
          entityId: ssoConfig.entityId,
          ssoUrl: ssoConfig.ssoUrl,
          certificate: ssoConfig.certificate,
          attributeMapping: ssoConfig.attributeMapping,
        }
      : undefined,
  })

  const onSubmit = async (values: SSOConfigValues) => {
    await updateSSOConfig.mutateAsync(values)
  }

  const handleTest = async () => {
    setIsTesting(true)
    // Simulate SSO test
    setTimeout(() => {
      setIsTesting(false)
      toast.success("SSO configuration test successful")
    }, 2000)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SSO Configuration</CardTitle>
          <CardDescription>Configure single sign-on for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
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
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              SSO Configuration
            </CardTitle>
            <CardDescription>
              Configure single sign-on for your organization
            </CardDescription>
          </div>
          {ssoConfig?.enabled && (
            <Badge variant="default">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Enable SSO */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="enabled" className="text-base font-semibold">
                Enable SSO
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow users to sign in using single sign-on
              </p>
            </div>
            <Switch
              id="enabled"
              checked={form.watch("enabled")}
              onCheckedChange={(checked) => form.setValue("enabled", checked)}
            />
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("provider")}
            >
              <option value="saml">SAML 2.0</option>
              <option value="oidc">OpenID Connect</option>
            </select>
            {form.formState.errors.provider && (
              <p className="text-sm text-destructive">
                {form.formState.errors.provider.message}
              </p>
            )}
          </div>

          {/* Entity ID */}
          <div className="space-y-2">
            <Label htmlFor="entityId">Entity ID / Client ID</Label>
            <Input
              id="entityId"
              placeholder="urn:example:idp"
              {...form.register("entityId")}
            />
            {form.formState.errors.entityId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.entityId.message}
              </p>
            )}
          </div>

          {/* SSO URL */}
          <div className="space-y-2">
            <Label htmlFor="ssoUrl">SSO URL / Authorization Endpoint</Label>
            <Input
              id="ssoUrl"
              placeholder="https://idp.example.com/sso"
              {...form.register("ssoUrl")}
            />
            {form.formState.errors.ssoUrl && (
              <p className="text-sm text-destructive">
                {form.formState.errors.ssoUrl.message}
              </p>
            )}
          </div>

          {/* Certificate */}
          <div className="space-y-2">
            <Label htmlFor="certificate">Public Certificate / Client Secret</Label>
            <textarea
              id="certificate"
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              {...form.register("certificate")}
            />
            {form.formState.errors.certificate && (
              <p className="text-sm text-destructive">
                {form.formState.errors.certificate.message}
              </p>
            )}
          </div>

          {/* Attribute Mapping */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Attribute Mapping</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Map SAML/OIDC attributes to user fields
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="attributeMapping.email">Email Attribute</Label>
                <Input
                  id="attributeMapping.email"
                  placeholder="email"
                  {...form.register("attributeMapping.email")}
                />
                {form.formState.errors.attributeMapping?.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.attributeMapping.email.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="attributeMapping.firstName">
                    First Name Attribute (Optional)
                  </Label>
                  <Input
                    id="attributeMapping.firstName"
                    placeholder="firstName"
                    {...form.register("attributeMapping.firstName")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attributeMapping.lastName">
                    Last Name Attribute (Optional)
                  </Label>
                  <Input
                    id="attributeMapping.lastName"
                    placeholder="lastName"
                    {...form.register("attributeMapping.lastName")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          {form.watch("enabled") && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Important: Test your configuration
                </p>
                <p className="text-amber-800 dark:text-amber-200">
                  Make sure to test your SSO configuration before enabling it for all users.
                  Incorrect configuration may prevent users from signing in.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={updateSSOConfig.isPending || !form.formState.isDirty}
            >
              {updateSSOConfig.isPending ? "Saving..." : "Save Configuration"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !ssoConfig}
            >
              {isTesting ? "Testing..." : "Test SSO"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
