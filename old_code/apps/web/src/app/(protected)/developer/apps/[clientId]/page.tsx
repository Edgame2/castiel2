"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "@/contexts/auth-context"
import {
  useOAuth2Client,
  useUpdateOAuth2Client,
  useRotateOAuth2ClientSecret,
  useOAuth2Scopes,
} from "@/hooks/use-oauth2-clients"
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
import { Badge } from "@/components/ui/badge"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  RotateCw,
  Shield,
  Globe,
  Key,
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import type { UpdateOAuth2ClientRequest } from "@/lib/api/oauth2-clients"

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  status: z.enum(["active", "inactive", "suspended"]),
  description: z.string().optional(),
  redirectUris: z.string().min(1, "At least one redirect URI is required"),
  allowedGrantTypes: z
    .array(z.enum(["authorization_code", "client_credentials", "refresh_token"]))
    .min(1, "At least one grant type is required"),
  allowedScopes: z.array(z.string()).min(1, "At least one scope is required"),
})

type FormValues = z.infer<typeof formSchema>

export default function OAuth2ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""

  const { data: client, isLoading } = useOAuth2Client(tenantId, clientId)
  const updateMutation = useUpdateOAuth2Client(tenantId)
  const rotateSecretMutation = useRotateOAuth2ClientSecret(tenantId)
  const { data: scopesData } = useOAuth2Scopes()
  const scopes = scopesData?.scopes || []

  const [showSecretDialog, setShowSecretDialog] = useState(false)
  const [newClientSecret, setNewClientSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showRotateDialog, setShowRotateDialog] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: client
      ? {
          name: client.name,
          status: client.status,
          description: client.description || "",
          redirectUris: client.redirectUris.join("\n"),
          allowedGrantTypes: client.allowedGrantTypes,
          allowedScopes: client.allowedScopes,
        }
      : undefined,
  })

  const onSubmit = async (data: FormValues) => {
    try {
      // Parse redirect URIs
      const redirectUris = data.redirectUris
        .split(/[,\n]/)
        .map((uri) => uri.trim())
        .filter((uri) => uri.length > 0)

      const request: UpdateOAuth2ClientRequest = {
        name: data.name,
        status: data.status,
        description: data.description || undefined,
        redirectUris,
        allowedGrantTypes: data.allowedGrantTypes,
        allowedScopes: data.allowedScopes,
      }

      await updateMutation.mutateAsync({ clientId, data: request })
      router.push("/developer/apps")
    } catch (error) {
      // Error is handled by the mutation hook
    }
  }

  const handleRotateSecret = async () => {
    try {
      const result = await rotateSecretMutation.mutateAsync(clientId)
      setNewClientSecret(result.clientSecret)
      setShowSecretDialog(true)
      setShowRotateDialog(false)
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

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="text-center py-12">
          <p className="text-lg font-medium">Client not found</p>
          <Button className="mt-4" onClick={() => router.push("/developer/apps")}>
            Back to Apps
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">OAuth2 Client Details</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Basic client configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Client ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={client.id} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(client.id)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Client Type</Label>
              <div className="flex items-center gap-2 mt-1">
                {client.type === "confidential" ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                <Badge variant="secondary">
                  {client.type === "confidential" ? "Confidential" : "Public"}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-1">
                <Badge
                  variant={
                    client.status === "active"
                      ? "default"
                      : client.status === "inactive"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {client.status}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(client.metadata.createdAt), { addSuffix: true })}
              </p>
            </div>
            {client.metadata.lastUsedAt && (
              <div>
                <Label>Last Used</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(client.metadata.lastUsedAt), { addSuffix: true })}
                </p>
              </div>
            )}
            {client.type === "confidential" && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => setShowRotateDialog(true)}
                  className="w-full"
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Rotate Client Secret
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Configuration</CardTitle>
            <CardDescription>Update client settings</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Application Name *</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="redirectUris">Redirect URIs *</Label>
                <Textarea
                  id="redirectUris"
                  {...form.register("redirectUris")}
                  rows={4}
                />
                {form.formState.errors.redirectUris && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.redirectUris.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Allowed Grant Types *</Label>
                <div className="space-y-2">
                  {["authorization_code", "client_credentials", "refresh_token"].map(
                    (grantType) => (
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
                    )
                  )}
                </div>
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
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Secret Rotated</DialogTitle>
            <DialogDescription>
              Your client secret has been rotated. Save the new secret now - it will not be shown
              again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Client Secret</Label>
              <div className="flex items-center gap-2">
                <Input value={newClientSecret || ""} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newClientSecret || "")}
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
            <Button onClick={() => setShowSecretDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate Client Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rotate the client secret? The old secret will be invalidated
              immediately and all existing tokens will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotateSecret} className="bg-destructive text-destructive-foreground">
              Rotate Secret
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}








