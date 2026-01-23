"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import { useCreateOAuth2Client, useOAuth2Scopes } from "@/hooks/use-oauth2-clients"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { CreateOAuth2ClientRequest } from "@/lib/api/oauth2-clients"

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["confidential", "public"]),
  description: z.string().optional(),
  redirectUris: z.string().min(1, "At least one redirect URI is required"),
  allowedGrantTypes: z.array(z.enum(["authorization_code", "client_credentials", "refresh_token"])).min(1, "At least one grant type is required"),
  allowedScopes: z.array(z.string()).min(1, "At least one scope is required"),
})

type FormValues = z.infer<typeof formSchema>

export default function NewOAuth2ClientPage() {
  const router = useRouter()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""
  
  const createMutation = useCreateOAuth2Client(tenantId)
  const { data: scopesData } = useOAuth2Scopes()
  const scopes = scopesData?.scopes || []
  
  const [showSecretDialog, setShowSecretDialog] = useState(false)
  const [newClient, setNewClient] = useState<{ id: string; secret: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "confidential",
      description: "",
      redirectUris: "",
      allowedGrantTypes: ["authorization_code"],
      allowedScopes: [],
    },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      // Parse redirect URIs (comma-separated or newline-separated)
      const redirectUris = data.redirectUris
        .split(/[,\n]/)
        .map((uri) => uri.trim())
        .filter((uri) => uri.length > 0)

      const request: CreateOAuth2ClientRequest = {
        name: data.name,
        type: data.type,
        description: data.description || undefined,
        redirectUris,
        allowedGrantTypes: data.allowedGrantTypes,
        allowedScopes: data.allowedScopes,
      }

      const result = await createMutation.mutateAsync(request)
      setNewClient({ id: result.id, secret: result.clientSecret })
      setShowSecretDialog(true)
    } catch (error) {
      // Error is handled by the mutation hook
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCloseSecretDialog = () => {
    setShowSecretDialog(false)
    router.push("/developer/apps")
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Create OAuth2 Client</h1>
          <p className="text-muted-foreground">
            Register a new OAuth2 client application for API access
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
          <CardDescription>
            Configure your OAuth2 client application settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Application Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="My Application"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Client Type *</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as "confidential" | "public")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidential">Confidential (Backend apps with secret)</SelectItem>
                  <SelectItem value="public">Public (SPA/Mobile apps without secret)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Confidential clients can securely store a client secret. Public clients cannot.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Optional description of your application"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirectUris">Redirect URIs *</Label>
              <Textarea
                id="redirectUris"
                {...form.register("redirectUris")}
                placeholder="https://example.com/callback&#10;https://app.example.com/oauth/callback"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Enter one redirect URI per line. Must use HTTPS (or http://localhost for development).
              </p>
              {form.formState.errors.redirectUris && (
                <p className="text-sm text-destructive">{form.formState.errors.redirectUris.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Allowed Grant Types *</Label>
              <div className="space-y-2">
                {["authorization_code", "client_credentials", "refresh_token"].map((grantType) => (
                  <div key={grantType} className="flex items-center space-x-2">
                    <Checkbox
                      id={grantType}
                      checked={form.watch("allowedGrantTypes").includes(grantType as any)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("allowedGrantTypes")
                        if (checked) {
                          form.setValue("allowedGrantTypes", [...current, grantType as any])
                        } else {
                          form.setValue(
                            "allowedGrantTypes",
                            current.filter((gt) => gt !== grantType)
                          )
                        }
                      }}
                    />
                    <Label htmlFor={grantType} className="font-normal cursor-pointer">
                      {grantType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.allowedGrantTypes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.allowedGrantTypes.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Allowed Scopes *</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-4">
                {scopes.map((scope) => (
                  <div key={scope.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={scope.name}
                      checked={form.watch("allowedScopes").includes(scope.name)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("allowedScopes")
                        if (checked) {
                          form.setValue("allowedScopes", [...current, scope.name])
                        } else {
                          form.setValue(
                            "allowedScopes",
                            current.filter((s) => s !== scope.name)
                          )
                        }
                      }}
                    />
                    <Label htmlFor={scope.name} className="font-normal cursor-pointer flex-1">
                      <span className="font-mono">{scope.name}</span>
                      <span className="text-muted-foreground ml-2">- {scope.description}</span>
                    </Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.allowedScopes && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.allowedScopes.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Client
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OAuth2 Client Created</DialogTitle>
            <DialogDescription>
              Your OAuth2 client has been created. Save the client secret now - it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newClient?.id || ""}
                  readOnly
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newClient?.id || "")}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <div className="flex items-center gap-2">
                <Input value={newClient?.secret || ""} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newClient?.secret || "")}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-destructive">
                ⚠️ Save this secret now. It will not be shown again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseSecretDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

