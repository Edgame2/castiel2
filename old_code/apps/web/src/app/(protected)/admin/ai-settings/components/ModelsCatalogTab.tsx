/**
 * Models Catalog Tab
 * Manages the catalog of available AI models (capabilities only, no credentials)
 */

import { useState } from 'react'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAIModelsCatalog,
  useDeleteModelCatalog,
} from '@/hooks/use-ai-settings'
import type { AIModelCatalog } from '@/lib/api/ai-settings'
import { CreateModelDialog } from './CreateModelDialog'
import { EditModelDialog } from './EditModelDialog'

export function ModelsCatalogTab() {
  const [deleteDialog, setDeleteDialog] = useState<AIModelCatalog | null>(null)
  const [editDialog, setEditDialog] = useState<AIModelCatalog | null>(null)
  const [createDialog, setCreateDialog] = useState(false)

  const { data, isLoading } = useAIModelsCatalog()
  const deleteMutation = useDeleteModelCatalog()

  const models = data?.models || []

  const handleDelete = async (model: AIModelCatalog) => {
    await deleteMutation.mutateAsync(model.id)
    setDeleteDialog(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>AI Models Catalog</CardTitle>
            <CardDescription>
              Define available AI models and their capabilities. No credentials stored here.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Model
          </Button>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No models in catalog yet.</p>
              <p className="text-sm mt-2">Add your first AI model to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Hoster</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Tenant BYOK</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell>
                      <Badge variant={model.type === 'LLM' ? 'default' : 'secondary'}>
                        {model.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{model.hoster}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {model.streaming && (
                          <Badge variant="outline" className="text-xs">
                            Stream
                          </Badge>
                        )}
                        {model.vision && (
                          <Badge variant="outline" className="text-xs">
                            Vision
                          </Badge>
                        )}
                        {model.functions && (
                          <Badge variant="outline" className="text-xs">
                            Functions
                          </Badge>
                        )}
                        {model.jsonMode && (
                          <Badge variant="outline" className="text-xs">
                            JSON
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {model.allowTenantConnections ? (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          model.status === 'active'
                            ? 'default'
                            : model.status === 'deprecated'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {model.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditDialog(model)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog(model)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateModelDialog open={createDialog} onOpenChange={setCreateDialog} />

      {/* Edit Dialog */}
      {editDialog && (
        <EditModelDialog
          model={editDialog}
          open={!!editDialog}
          onOpenChange={(open) => !open && setEditDialog(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model from Catalog?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteDialog?.name}" from the catalog. Any existing connections
              using this model will need to be removed separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
