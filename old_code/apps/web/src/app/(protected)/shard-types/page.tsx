"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Search as SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShardTypeDataTable } from "./_components/data-table"
import { ShardTypeListFilters } from "./_components/filters"
import { Skeleton } from "@/components/ui/skeleton"
import { Package } from "lucide-react"
import { useShardTypes } from "@/hooks/use-shard-types"
import type { ShardTypeListParams } from "@/types/api"

export default function ShardTypesPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = React.useState("")
    const [filters, setFilters] = React.useState<ShardTypeListParams>({
        page: 1,
        limit: 100, // Increased to show more shard types per page
    })

    // Fetch shard types using React Query hook
    const { data, isLoading } = useShardTypes(filters)

    const handleSearch = React.useMemo(
        () => {
            const timeoutId = setTimeout(() => {
                setFilters((prev: ShardTypeListParams) => ({
                    ...prev,
                    search: searchQuery || undefined,
                    page: 1,
                }))
            }, 300)

            return () => clearTimeout(timeoutId)
        },
        [searchQuery]
    )

    React.useEffect(() => {
        handleSearch
    }, [handleSearch])

    const handleFilterChange = (newFilters: Partial<ShardTypeListParams>) => {
        setFilters((prev: ShardTypeListParams) => ({
            ...prev,
            ...newFilters,
            page: 1,
        }))
    }

    const handleClearFilters = () => {
        setFilters({
            page: 1,
            limit: 100, // Increased to show more shard types per page
        })
        setSearchQuery("")
    }

    const activeFilterCount = React.useMemo(() => {
        let count = 0
        if (filters.category) count++
        if (filters.status) count++
        if (filters.isGlobal !== undefined) count++
        if (filters.tags && filters.tags.length > 0) count++
        return count
    }, [filters])

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-background px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Shard Types</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage schema definitions for your shards
                        </p>
                    </div>
                    <Button onClick={() => router.push("/shard-types/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Shard Type
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="mt-4 flex gap-3">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, description, or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <ShardTypeListFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        activeFilterCount={activeFilterCount}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <LoadingSkeleton />
                ) : !data || data.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="p-4 rounded-full bg-muted mb-4">
                            <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No shard types found</h3>
                        <p className="text-muted-foreground max-w-md mb-6">
                            {activeFilterCount > 0
                                ? "Try adjusting your filters or search query"
                                : "Get started by creating your first shard type"}
                        </p>
                        {activeFilterCount === 0 ? (
                            <Button onClick={() => router.push("/shard-types/new")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Shard Type
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={handleClearFilters}>
                                Clear Filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <ShardTypeDataTable
                        data={data.items}
                        pageCount={Math.ceil(data.total / data.limit)}
                        currentPage={data.page}
                        onPageChange={(page: number) => setFilters((prev: ShardTypeListParams) => ({ ...prev, page }))}
                        onPageSizeChange={(limit: number) =>
                            setFilters((prev: ShardTypeListParams) => ({ ...prev, limit, page: 1 }))
                        }
                    />
                )}
            </div>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
            ))}
        </div>
    )
}
