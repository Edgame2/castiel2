"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  MoreHorizontal,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Globe,
  Lock,
  Tag,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  DataTable,
  DataTableColumnHeader,
  createSelectColumn,
} from "@/components/widgets/data-table"
import type { FacetedFilter } from "@/components/widgets/data-table/types"
import { useShards, useDeleteShard, useShardTypes } from "@/hooks/use-shards"
import { Shard } from "@/types/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BatchEmbeddingDialog } from "@/components/shard/batch-embedding-dialog"
import { Sparkles } from "lucide-react"

export default function ShardsPage() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['shards', 'common'])

  // State for pagination
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [search, setSearch] = React.useState("")
  const [shardTypeFilter, setShardTypeFilter] = React.useState<string>()

  // Fetch data
  const { data, isLoading, refetch } = useShards({
    page,
    limit: pageSize,
    search: search || undefined,
    shardTypeId: shardTypeFilter,
  })

  const { data: shardTypes } = useShardTypes()
  const deleteShard = useDeleteShard()

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    shards: Shard[]
  }>({ open: false, shards: [] })

  // Handle single delete
  const handleDeleteSingle = (shard: Shard) => {
    setDeleteDialog({ open: true, shards: [shard] })
  }

  // Handle bulk delete
  const handleBulkDelete = (shards: Shard[]) => {
    setDeleteDialog({ open: true, shards })
  }

  // Handle bulk generate embeddings
  const handleBulkGenerateEmbeddings = (shards: Shard[]) => {
    setBatchEmbeddingDialog({ open: true, shards })
  }

  // Batch embedding dialog state
  const [batchEmbeddingDialog, setBatchEmbeddingDialog] = React.useState<{
    open: boolean
    shards: Shard[]
  }>({ open: false, shards: [] })

  // Confirm delete
  const confirmDelete = async () => {
    const { shards } = deleteDialog
    try {
      await Promise.all(shards.map((s) => deleteShard.mutateAsync(s.id)))
      toast.success(
        shards.length > 1
          ? t('shards:messages.bulkDeleteSuccess', { count: shards.length })
          : t('shards:messages.deleteSuccess' as any)
      )
      setDeleteDialog({ open: false, shards: [] })
    } catch (error) {
      toast.error(t('shards:messages.deleteFailed' as any))
    }
  }

  // Handle copy ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success(t('common:copied' as any))
  }

  // Define columns
  const columns: ColumnDef<Shard>[] = React.useMemo(
    () => [
      // Selection column
      createSelectColumn<Shard>(),

      // Name column
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('shards:table.name' as any)} />
        ),
        cell: ({ row }) => {
          const shard = row.original
          const displayName = shard.structuredData?.name || shard.name
          const displayDesc = shard.structuredData?.description || shard.description
          
          return (
            <div className="flex flex-col gap-1 max-w-[300px]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{String(displayName || '')}</span>
              </div>
              {displayDesc && (
                <span className="text-xs text-muted-foreground truncate pl-6">
                  {String(displayDesc || '')}
                </span>
              )}
            </div>
          )
        },
        meta: {
          exportable: true,
          exportLabel: 'Name',
        },
      },

      // Type column
      {
        accessorKey: "shardTypeId",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('shards:table.type' as any)} />
        ),
        cell: ({ row }) => {
          const shard = row.original
          const type = shard.shardType || (shardTypes || []).find((t) => t.id === shard.shardTypeId)
          const displayLabel = type?.displayName || type?.name || shard.shardTypeName || shard.shardTypeId
          
          return (
            <Badge variant="outline" className="font-normal">
              {displayLabel}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        meta: {
          exportable: true,
          exportLabel: 'Type',
        },
      },

      // Visibility column
      {
        accessorKey: "isPublic",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('shards:table.visibility' as any)} />
        ),
        cell: ({ row }) => {
          const isPublic = row.getValue("isPublic")
          return (
            <div className="flex items-center gap-2">
              {isPublic ? (
                <>
                  <Globe className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t('shards:visibility.public' as any)}</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('shards:visibility.private' as any)}</span>
                </>
              )}
            </div>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(String(row.getValue(id)))
        },
        meta: {
          exportable: true,
          exportLabel: 'Visibility',
          exportValue: (row: Shard) => row.isPublic ? 'Public' : 'Private',
        },
      },

      // Tags column
      {
        accessorKey: "tags",
        header: t('shards:table.tags' as any),
        cell: ({ row }) => {
          const tags = row.original.tags || []
          if (tags.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>
          }
          return (
            <div className="flex gap-1 flex-wrap max-w-[200px]">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          )
        },
        enableSorting: false,
        meta: {
          exportable: true,
          exportLabel: 'Tags',
          exportValue: (row: Shard) => (row.tags || []).join(', '),
        },
      },

      // Created At column
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('common:createdAt' as any)} />
        ),
        cell: ({ row }) => {
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(row.getValue("createdAt")), {
                addSuffix: true,
              })}
            </span>
          )
        },
        meta: {
          exportable: true,
          exportLabel: 'Created At',
        },
      },

      // Actions column
      {
        id: "actions",
        cell: ({ row }) => {
          const shard = row.original

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">{t('common:actions' as any)}</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('common:actions' as any)}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleCopyId(shard.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('common:copyId' as any)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/shards/${shard.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t('common:viewDetails' as any)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/shards/${shard.id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common:edit' as any)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteSingle(shard)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common:delete' as any)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        meta: {
          exportable: false,
        },
      },
    ],
    [t, router, shardTypes]
  )

  // Faceted filters for shard types and visibility
  const facetedFilters = React.useMemo(
    () => [
      {
        column: 'shardTypeId',
        title: t('shards:table.type' as any),
        options: (shardTypes || []).map((type) => ({
          label: type.displayName || type.name,
          value: type.id,
          icon: FileText,
        })),
      },
      {
        column: 'isPublic',
        title: t('shards:table.visibility' as any),
        options: [
          { label: t('shards:visibility.public' as any), value: 'true', icon: Globe },
          { label: t('shards:visibility.private' as any), value: 'false', icon: Lock },
        ],
      },
    ],
    [shardTypes, t]
  )

  // Bulk actions
  const bulkActions: any[] = React.useMemo(
    () => [
      {
        id: 'generate-embeddings',
        label: 'Generate Embeddings',
        icon: Sparkles,
        variant: 'default' as const,
        onClick: handleBulkGenerateEmbeddings,
      },
      {
        id: 'delete',
        label: t('common:delete' as any),
        icon: Trash2,
        variant: 'destructive' as const,
        onClick: handleBulkDelete,
      },
    ],
    [t]
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('shards:title' as any)}</h1>
          <p className="text-muted-foreground">{t('shards:subtitle' as any)}</p>
        </div>
        <Button onClick={() => router.push("/shards/new")}>
          <Plus className="h-4 w-4 mr-2" />
          {t('shards:create' as any)}
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        data={data?.shards ?? []}
        columns={columns}
        isLoading={isLoading}
        onRefresh={() => refetch()}
        totalCount={data?.count}
        serverSide
        config={{
          enableRowSelection: true,
          enableExport: true,
          exportFormats: ['csv', 'xlsx'],
          exportFilename: 'shards-export',
          defaultPageSize: pageSize,
          pageSizes: [10, 20, 50, 100],
          enableColumnVisibility: true,
          enableGlobalSearch: true,
          stripedRows: true,
        }}
        facetedFilters={facetedFilters as any}
        bulkActions={bulkActions}
        callbacks={{
          onRowClick: (shard) => router.push(`/shards/${shard.id}`),
          onPageChange: (pageIndex, newPageSize) => {
            setPage(pageIndex + 1)
            setPageSize(newPageSize)
          },
        }}
        emptySlot={
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('shards:noShards' as any)}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/shards/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('shards:create' as any)}
            </Button>
          </div>
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, shards: [] })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shards:deleteConfirm.title' as any)}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.shards.length > 1 ? (
                t('shards:deleteConfirm.bulkMessage', { count: deleteDialog.shards.length })
              ) : (
                t('shards:deleteConfirm.message', { name: deleteDialog.shards[0]?.name })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel' as any)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteShard.isPending ? t('common:deleting' as any) : t('common:delete' as any)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Embedding Dialog */}
      <BatchEmbeddingDialog
        open={batchEmbeddingDialog.open}
        onOpenChange={(open) => setBatchEmbeddingDialog({ ...batchEmbeddingDialog, open })}
        shards={batchEmbeddingDialog.shards}
      />
    </div>
  )
}
