"use client"

import { useState } from "react"
import { Key, Plus, Copy, Trash, Eye, EyeOff } from "lucide-react"
import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/use-tenant"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export function ApiKeys() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const { data: apiKeys, isLoading } = useApiKeys()
  const createApiKey = useCreateApiKey()
  const deleteApiKey = useDeleteApiKey()

  const handleCreate = async () => {
    if (!newKeyName) {
      toast.error("Please enter a key name")
      return
    }

    const result = await createApiKey.mutateAsync({ name: newKeyName })
    setCreatedKey(result.key)
    setNewKeyName("")
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the API key "${name}"?`)) {
      deleteApiKey.mutate(id)
    }
  }

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("API key copied to clipboard")
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const maskKey = (key: string) => {
    return `${key.substring(0, 8)}${"*".repeat(32)}${key.substring(key.length - 4)}`
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
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
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for programmatic access
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys && apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No API keys</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first API key to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys?.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{apiKey.name}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2 font-mono text-sm">
                        <code className="bg-muted px-2 py-1 rounded">
                          {visibleKeys.has(apiKey.id)
                            ? apiKey.key
                            : maskKey(apiKey.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopy(apiKey.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(apiKey.id, apiKey.name)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <div>
                      <span>Created: </span>
                      {format(new Date(apiKey.createdAt), "MMM d, yyyy")}
                    </div>
                    {apiKey.lastUsed && (
                      <div>
                        <span>Last used: </span>
                        {format(new Date(apiKey.lastUsed), "MMM d, yyyy")}
                      </div>
                    )}
                    {apiKey.expiresAt && (
                      <div>
                        <Badge variant="outline" className="ml-auto">
                          Expires: {format(new Date(apiKey.expiresAt), "MMM d, yyyy")}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access to your organization
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Your new API key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-background px-2 py-1 rounded break-all">
                    {createdKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(createdKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-destructive">
                ⚠️ Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setCreatedKey(null)
                    setCreateDialogOpen(false)
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="Production API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createApiKey.isPending || !newKeyName}
                >
                  Create Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
