"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useOAuth2Clients, useDeleteOAuth2Client } from "@/hooks/use-oauth2-clients"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Key,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink,
  Shield,
  Globe,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
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
import type { OAuth2Client } from "@/lib/api/oauth2-clients"

export default function DeveloperAppsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const tenantId = user?.tenantId || ""
  
  const { data, isLoading, refetch } = useOAuth2Clients(tenantId)
  const deleteMutation = useDeleteOAuth2Client(tenantId)
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<OAuth2Client | null>(null)

  const clients = data?.clients || []

  const handleDelete = (client: OAuth2Client) => {
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          setClientToDelete(null)
        },
      })
    }
  }

  const getStatusBadge = (status: OAuth2Client["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Inactive
          </Badge>
        )
      case "suspended":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Suspended
          </Badge>
        )
    }
  }

  const getTypeIcon = (type: OAuth2Client["type"]) => {
    return type === "confidential" ? (
      <Shield className="h-4 w-4" />
    ) : (
      <Globe className="h-4 w-4" />
    )
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Developer Apps</h1>
          <p className="text-muted-foreground">
            Manage OAuth2 client applications for API access
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/developer/apps/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create App
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OAuth2 Clients</CardTitle>
          <CardDescription>
            {clients.length} {clients.length === 1 ? "application" : "applications"} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No applications found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first OAuth2 client to get started
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/developer/apps/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create App
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grant Types</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(client.type)}
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {client.description && (
                              <div className="text-sm text-muted-foreground">
                                {client.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {client.type === "confidential" ? "Confidential" : "Public"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.allowedGrantTypes.map((gt) => (
                            <Badge key={gt} variant="outline" className="text-xs">
                              {gt}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {client.allowedScopes.slice(0, 2).map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                          {client.allowedScopes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{client.allowedScopes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(client.metadata.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/developer/apps/${client.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(client)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete OAuth2 Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be
              undone and will revoke all access tokens for this client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}








