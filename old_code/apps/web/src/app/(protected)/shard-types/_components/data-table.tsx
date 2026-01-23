"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Eye,
    MoreHorizontal,
    Pencil,
    Copy,
    Trash2,
    FileText,
    Globe,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import type { ShardType } from "@/types/api"
import { ShardTypeIcon } from "@/components/shard-types"
import { useDeleteShardType, useCloneShardType } from "@/hooks/use-shard-type-mutations"
import { useCanDeleteShardType } from "@/hooks/use-shard-type-usage"

interface ShardTypeDataTableProps {
    data: ShardType[]
    pageCount: number
    currentPage: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
}

export function ShardTypeDataTable({
    data,
    pageCount,
    currentPage,
    onPageChange,
    onPageSizeChange,
}: ShardTypeDataTableProps) {
    const router = useRouter()
    const [deleteId, setDeleteId] = React.useState<string | null>(null)

    const deleteMutation = useDeleteShardType()
    const cloneMutation = useCloneShardType()
    const { canDelete, shardCount, isLoading: isCheckingDelete } = useCanDeleteShardType(deleteId || '')

    const handleDelete = () => {
        if (deleteId && canDelete) {
            deleteMutation.mutate(deleteId, {
                onSuccess: () => setDeleteId(null)
            })
        }
    }

    const handleClone = (id: string) => {
        cloneMutation.mutate(id, {
            onSuccess: (newShardType) => {
                router.push(`/shard-types/${newShardType.id}/edit`)
            }
        })
    }

    const columns: ColumnDef<ShardType>[] = [
        {
            accessorKey: "icon",
            header: "",
            cell: ({ row }) => (
                <ShardTypeIcon
                    icon={row.original.icon}
                    color={row.original.color}
                    size="md"
                />
            ),
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{row.original.name}</span>
                        {row.original.isGlobal && (
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                    </div>
                    {row.original.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {row.original.description}
                        </p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "category",
            header: "Category",
            cell: ({ row }) => {
                const category = row.original.category
                if (!category) return <span className="text-muted-foreground">-</span>
                return (
                    <Badge variant="outline">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status
                if (!status) return <span className="text-muted-foreground">-</span>
                const variant =
                    status === "active"
                        ? "default"
                        : status === "deprecated"
                            ? "secondary"
                            : "destructive"
                return (
                    <Badge variant={variant}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "tags",
            header: "Tags",
            cell: ({ row }) => {
                const tags = row.original.tags || []
                if (tags.length === 0) return <span className="text-muted-foreground">-</span>
                if (tags.length <= 2) {
                    return (
                        <div className="flex gap-1">
                            {tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )
                }
                return (
                    <div className="flex gap-1">
                        <Badge variant="secondary">{tags[0]}</Badge>
                        <Badge variant="secondary">+{tags.length - 1}</Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "createdAt",
            header: "Created",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(row.original.createdAt), {
                        addSuffix: true,
                    })}
                </span>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const shardType = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => router.push(`/shard-types/${shardType.id}`)}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => router.push(`/shard-types/${shardType.id}/preview`)}
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Preview Form
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => router.push(`/shard-types/${shardType.id}/edit`)}
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleClone(shardType.id)}
                                disabled={cloneMutation.isPending}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(shardType.id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount,
    })

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {pageCount}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= pageCount}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open: boolean) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                            {isCheckingDelete ? (
                                'Checking if this shard type can be deleted...'
                            ) : canDelete ? (
                                'This will permanently delete this shard type. This action cannot be undone.'
                            ) : (
                                `This shard type cannot be deleted because it is currently used by ${shardCount} shard(s). Please delete or reassign these shards first.`
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteId(null)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={!canDelete || deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
