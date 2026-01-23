"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus, Edit2, Trash2, RefreshCw, X, Key } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  useUserExternalUserIds,
  useCreateExternalUserId,
  useUpdateExternalUserId,
  useDeleteExternalUserId,
  useSyncExternalUserId,
} from "@/hooks/use-external-user-ids"
import { useIntegrations } from "@/hooks/use-integrations"
import { ExternalUserId } from "@/types/api"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const externalUserIdSchema = z.object({
  integrationId: z.string().min(1, "Integration is required"),
  externalUserId: z.string().min(1, "External user ID is required"),
  integrationName: z.string().optional(),
  connectionId: z.string().optional(),
  status: z.enum(["active", "invalid", "pending"]).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

type ExternalUserIdFormData = z.infer<typeof externalUserIdSchema>

interface ExternalUserIdsSectionProps {
  userId: string
  readOnly?: boolean
}

export function ExternalUserIdsSection({ userId, readOnly = false }: ExternalUserIdsSectionProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [metadataKey, setMetadataKey] = useState("")
  const [metadataValue, setMetadataValue] = useState("")

  const { data: externalUserIds, isLoading, refetch } = useUserExternalUserIds(userId)
  const { data: integrationsData } = useIntegrations({ status: "active" })
  const createMutation = useCreateExternalUserId()
  const updateMutation = useUpdateExternalUserId()
  const deleteMutation = useDeleteExternalUserId()
  const syncMutation = useSyncExternalUserId()

  const availableIntegrations = integrationsData?.integrations || []

  const form = useForm<ExternalUserIdFormData>({
    resolver: zodResolver(externalUserIdSchema),
    defaultValues: {
      integrationId: "",
      externalUserId: "",
      integrationName: "",
      connectionId: "",
      status: "active",
      metadata: {},
    },
  })

  const editingItem = editingId
    ? externalUserIds?.find((ext) => ext.integrationId === editingId)
    : null

  const handleEdit = (item: ExternalUserId) => {
    form.reset({
      integrationId: item.integrationId,
      externalUserId: item.externalUserId,
      integrationName: item.integrationName || "",
      connectionId: item.connectionId || "",
      status: item.status,
      metadata: item.metadata || {},
    })
    setEditingId(item.integrationId)
    setShowCreateDialog(true)
  }

  const handleDelete = async (integrationId: string) => {
    await deleteMutation.mutateAsync({ userId, integrationId })
    setDeletingId(null)
  }

  const handleSync = async (integrationId: string) => {
    await syncMutation.mutateAsync({ userId, integrationId })
  }

  const onSubmit = async (data: ExternalUserIdFormData) => {
    if (editingId) {
      await updateMutation.mutateAsync({
        userId,
        integrationId: editingId,
        data: {
          externalUserId: data.externalUserId,
          integrationName: data.integrationName,
          connectionId: data.connectionId,
          status: data.status,
          metadata: data.metadata,
        },
      })
    } else {
      await createMutation.mutateAsync({
        userId,
        data,
      })
    }
    setShowCreateDialog(false)
    setEditingId(null)
    form.reset()
  }

  const addMetadata = () => {
    if (!metadataKey || !metadataValue) return
    const currentMetadata = form.getValues("metadata") || {}
    form.setValue("metadata", { ...currentMetadata, [metadataKey]: metadataValue })
    setMetadataKey("")
    setMetadataValue("")
  }

  const removeMetadata = (key: string) => {
    const currentMetadata = form.getValues("metadata") || {}
    const newMetadata = { ...currentMetadata }
    delete newMetadata[key]
    form.setValue("metadata", newMetadata)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "invalid":
        return "destructive"
      case "pending":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                External User IDs
              </CardTitle>
              <CardDescription>
                Manage external user IDs from integrated applications (Salesforce, Teams, etc.)
              </CardDescription>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                onClick={() => {
                  form.reset()
                  setEditingId(null)
                  setShowCreateDialog(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add External ID
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!externalUserIds || externalUserIds.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No external user IDs configured. Add one to link this user to external applications.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integration</TableHead>
                  <TableHead>External User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Last Synced</TableHead>
                  {!readOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {externalUserIds.map((item) => (
                  <TableRow key={item.integrationId}>
                    <TableCell className="font-medium">
                      {item.integrationName || item.integrationId}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{item.externalUserId}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.connectedAt ? format(new Date(item.connectedAt), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.lastSyncedAt ? format(new Date(item.lastSyncedAt), "MMM d, yyyy") : "-"}
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(item.integrationId)}
                            disabled={syncMutation.isPending}
                            title="Sync from integration"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(item.integrationId)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false)
          setEditingId(null)
          form.reset()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit External User ID" : "Add External User ID"}</DialogTitle>
            <DialogDescription>
              Link this user to an external application by providing their external user ID.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="integrationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Integration *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!editingId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select integration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableIntegrations.map((integration) => (
                          <SelectItem key={integration.id} value={integration.id}>
                            {integration.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the integration this external user ID belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="externalUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External User ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 003xx000004TmiQAAS" {...field} />
                    </FormControl>
                    <FormDescription>
                      The user's ID in the external system (e.g., Salesforce ID, Microsoft Graph ID).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="integrationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Integration Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Salesforce Production" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional display name for this integration instance.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="invalid">Invalid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Metadata Editor */}
              <div className="space-y-4">
                <Label>Metadata</Label>
                <FormDescription>
                  Add custom metadata as key-value pairs (optional).
                </FormDescription>

                {/* Current Metadata */}
                {Object.keys(form.watch("metadata") || {}).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(form.watch("metadata") || {}).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="gap-1">
                        {key}: {String(value)}
                        <button
                          type="button"
                          onClick={() => removeMetadata(key)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Metadata */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={metadataKey}
                    onChange={(e) => setMetadataKey(e.target.value)}
                  />
                  <Input
                    placeholder="Value"
                    value={metadataValue}
                    onChange={(e) => setMetadataValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addMetadata()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addMetadata}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setEditingId(null)
                    form.reset()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete External User ID?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the external user ID link. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


