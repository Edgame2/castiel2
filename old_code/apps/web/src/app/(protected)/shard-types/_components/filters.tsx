import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { TagsInput } from "@/components/shard-types"
import { Filter, X } from "lucide-react"
import type { ShardTypeListParams } from "@/types/api"
import { ShardTypeCategory, ShardTypeStatus } from "@/types/api"

interface ShardTypeListFiltersProps {
    filters: ShardTypeListParams
    onFilterChange: (filters: Partial<ShardTypeListParams>) => void
    onClearFilters: () => void
    activeFilterCount: number
}

const CATEGORIES = [
    ShardTypeCategory.DOCUMENT,
    ShardTypeCategory.DATA,
    ShardTypeCategory.MEDIA,
    ShardTypeCategory.CONFIGURATION,
    ShardTypeCategory.CUSTOM,
]

const STATUSES = [
    ShardTypeStatus.ACTIVE,
    ShardTypeStatus.DEPRECATED,
    ShardTypeStatus.DELETED,
]

export function ShardTypeListFilters({
    filters,
    onFilterChange,
    onClearFilters,
    activeFilterCount,
}: ShardTypeListFiltersProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                        >
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Filter Shard Types</SheetTitle>
                    <SheetDescription>
                        Refine your search with these filters
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* Scope Filter */}
                    <div className="space-y-3">
                        <Label>Scope</Label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="scope-all"
                                    checked={filters.isGlobal === undefined}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            onFilterChange({ isGlobal: undefined })
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="scope-all"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    All Types
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="scope-global"
                                    checked={filters.isGlobal === true}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            onFilterChange({ isGlobal: true })
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="scope-global"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Global / Shared
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="scope-tenant"
                                    checked={filters.isGlobal === false}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            onFilterChange({ isGlobal: false })
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="scope-tenant"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    My Types
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-3">
                        <Label htmlFor="category-filter">Category</Label>
                        <Select
                            value={filters.category || "all"}
                            onValueChange={(value) =>
                                onFilterChange({
                                    category: value === "all" ? undefined : (value as any),
                                })
                            }
                        >
                            <SelectTrigger id="category-filter">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {CATEGORIES.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category.replace(/_/g, ' ').charAt(0).toUpperCase() + category.replace(/_/g, ' ').slice(1).toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-3">
                        <Label htmlFor="status-filter">Status</Label>
                        <Select
                            value={filters.status || "all"}
                            onValueChange={(value) =>
                                onFilterChange({
                                    status: value === "all" ? undefined : (value as any),
                                })
                            }
                        >
                            <SelectTrigger id="status-filter">
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                {STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tags Filter */}
                    <div className="space-y-3">
                        <Label>Tags</Label>
                        <TagsInput
                            value={filters.tags || []}
                            onChange={(tags) => onFilterChange({ tags: tags.length > 0 ? tags : undefined })}
                            placeholder="Filter by tags..."
                        />
                        <p className="text-xs text-muted-foreground">
                            Press Enter or comma to add tags
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            onClearFilters()
                            setOpen(false)
                        }}
                        disabled={activeFilterCount === 0}
                    >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                    </Button>
                    <Button className="flex-1" onClick={() => setOpen(false)}>
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
