"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table"
import { format } from "date-fns"
import { Loader2, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { shardApi, shardTypeApi } from "@/lib/api/shards"
import { useAuth } from "@/contexts/auth-context"
import { Shard, Project } from "@/types/api"
import { toast } from "sonner"
import { trackException, trackTrace } from "@/lib/monitoring/app-insights"


export function ProjectListWidget({ className }: { className?: string }) {
    const { user } = useAuth()
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [projectTypeId, setProjectTypeId] = useState<string | null>(null)
    const [filter, setFilter] = useState<"all" | "owned" | "part_of">("owned")
    const [sorting, setSorting] = useState<SortingState>([])

    useEffect(() => {
        const fetchProjectType = async () => {
            try {
                const types = await shardTypeApi.getShardTypes()
                const projectType = types.find((t) => t.name === "c_project")
                if (projectType) {
                    setProjectTypeId(projectType.id)
                }
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                trackException(errorObj, 3)
                trackTrace("Failed to fetch shard types in project-list-widget", 3, {
                    errorMessage: errorObj.message,
                })
            }
        }
        fetchProjectType()
    }, [])

    useEffect(() => {
        const fetchProjects = async () => {
            if (!projectTypeId || !user) return

            setIsLoading(true)
            try {
                let params: any = {
                    shardTypeId: projectTypeId,
                    limit: 100, // Fetch more for client-side filtering if needed, or implement server-side pagination
                }

                if (filter === "owned") {
                    params.managerId = user.id // Repository handles mapping to ownerId
                } else if (filter === "part_of") {
                    params.teamMemberId = user.id
                }
                // "all" sends no specific user filter, showing all projects in tenant (for admins/viewers)

                const response = await shardApi.getShards(params)
                setProjects(response.shards as Project[])
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error(String(error))
                trackException(errorObj, 3)
                trackTrace("Failed to fetch projects", 3, {
                    errorMessage: errorObj.message,
                    filter,
                    projectTypeId,
                })
                toast.error("Failed to load projects")
            } finally {
                setIsLoading(false)
            }
        }

        fetchProjects()
    }, [projectTypeId, user, filter])

    const columns: ColumnDef<Project>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => {
                const project = row.original
                const name = project.structuredData?.name || project.name || "Untitled Project"
                const description = project.structuredData?.description || project.description

                return (
                    <div className="flex flex-col">
                        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                            {name}
                        </Link>
                        {description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {description}
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            accessorKey: "structuredData.status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.structuredData?.status
                return (
                    <Badge variant={status === "active" ? "default" : "secondary"}>
                        {status || "Unknown"}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "structuredData.ownerName",
            header: "Owner",
            cell: ({ row }) => {
                const ownerName = row.original.structuredData?.ownerName
                const managerId = row.original.structuredData?.managerId
                return (
                    <span className="text-sm">
                        {ownerName || (managerId ? "Unknown (Legacy)" : "-")}
                    </span>
                )
            },
        },
        {
            accessorKey: "structuredData.teamMembers",
            header: "Team",
            cell: ({ row }) => {
                const teamMembers = row.original.structuredData?.teamMembers
                const legacyTeam = row.original.structuredData?.team

                if (teamMembers && teamMembers.length > 0) {
                    return (
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2 overflow-hidden">
                                {teamMembers.slice(0, 3).map((member) => (
                                    <div
                                        key={member.id}
                                        className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] overflow-hidden"
                                        title={member.name}
                                    >
                                        {member.avatarUrl ? (
                                            <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span>{member.name.charAt(0)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )
                }

                if (legacyTeam && legacyTeam.length > 0) {
                    return <span className="text-xs text-muted-foreground">{legacyTeam.length} members</span>
                }

                return <span className="text-muted-foreground">-</span>
            },
        },
        {
            accessorKey: "structuredData.startDate",
            header: "Start Date",
            cell: ({ row }) => {
                const date = row.original.structuredData?.startDate
                return date ? format(new Date(date), "MMM d, yyyy") : "-"
            },
        },
        {
            accessorKey: "structuredData.endDate",
            header: "End Date",
            cell: ({ row }) => {
                const date = row.original.structuredData?.endDate
                return date ? format(new Date(date), "MMM d, yyyy") : "-"
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const project = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(project.id)}
                            >
                                Copy ID
                            </DropdownMenuItem>
                            {/* Add View/Edit actions here later */}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    const table = useReactTable({
        data: projects,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    })

    return (
        <div className="space-y-4">
            <Tabs defaultValue="owned" onValueChange={(v) => setFilter(v as any)}>
                <TabsList>
                    <TabsTrigger value="owned">Owned</TabsTrigger>
                    <TabsTrigger value="part_of">Part of</TabsTrigger>
                    <TabsTrigger value="all">All Projects</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
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
                                    No projects found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
