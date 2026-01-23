import * as React from "react"
import Link from "next/link"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShardTypeIcon } from "./shard-type-icon"
import { cn } from "@/lib/utils"
import type { ShardType } from "@/types/api"
import {
    Edit,
    Trash2,
    Copy,
    Eye,
    MoreVertical,
    Globe,
    Calendar,
} from "lucide-react"

interface ShardTypeCardProps extends React.HTMLAttributes<HTMLDivElement> {
    shardType: ShardType
    /**
     * Show action buttons
     */
    showActions?: boolean
    /**
     * Action handlers
     */
    onEdit?: (shardType: ShardType) => void
    onDelete?: (shardType: ShardType) => void
    onClone?: (shardType: ShardType) => void
    onPreview?: (shardType: ShardType) => void
    /**
     * Whether the user can edit this type
     */
    canEdit?: boolean
    /**
     * Whether the user can delete this type
     */
    canDelete?: boolean
}

export function ShardTypeCard({
    shardType,
    showActions = true,
    onEdit,
    onDelete,
    onClone,
    onPreview,
    canEdit = true,
    canDelete = true,
    className,
    ...props
}: ShardTypeCardProps) {
    return (
        <Card
            className={cn(
                "group hover:shadow-md transition-shadow",
                className
            )}
            {...props}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <ShardTypeIcon
                            icon={shardType.icon}
                            color={shardType.color}
                            size="lg"
                            bordered
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-lg truncate">
                                    {shardType.displayName || shardType.name}
                                </CardTitle>
                                {shardType.isGlobal && (
                                    <Badge variant="outline" className="shrink-0">
                                        <Globe className="h-3 w-3 mr-1" />
                                        Global
                                    </Badge>
                                )}
                                {shardType.isSystem && (
                                    <Badge variant="secondary" className="shrink-0">
                                        System
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="mt-1 text-xs text-muted-foreground">
                                {shardType.name}
                            </CardDescription>
                        </div>
                    </div>

                    {showActions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/shard-types/${shardType.id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                    </Link>
                                </DropdownMenuItem>
                                {canEdit && onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(shardType)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {onPreview && (
                                    <DropdownMenuItem onClick={() => onPreview(shardType)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Preview Form
                                    </DropdownMenuItem>
                                )}
                                {onClone && (
                                    <DropdownMenuItem onClick={() => onClone(shardType)}>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Clone
                                    </DropdownMenuItem>
                                )}
                                {canDelete && onDelete && !shardType.isSystem && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(shardType)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pb-3">
                {shardType.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {shardType.description}
                    </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    {shardType.category && (
                        <Badge variant="secondary" className="text-xs">
                            {shardType.category}
                        </Badge>
                    )}
                    {shardType.status && shardType.status !== "active" && (
                        <Badge
                            variant={shardType.status === "deprecated" ? "secondary" : "destructive"}
                            className="text-xs"
                        >
                            {shardType.status}
                        </Badge>
                    )}
                </div>
            </CardContent>

            {shardType.tags && shardType.tags.length > 0 && (
                <CardFooter className="pt-0 pb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {shardType.tags.slice(0, 3).map((tag) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs font-normal"
                            >
                                {tag}
                            </Badge>
                        ))}
                        {shardType.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">
                                +{shardType.tags.length - 3}
                            </Badge>
                        )}
                    </div>
                </CardFooter>
            )}

            <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                        Updated {new Date(shardType.updatedAt).toLocaleDateString()}
                    </span>
                </div>
            </CardFooter>
        </Card>
    )
}

/**
 * Compact card variant for grid layouts
 */
export function ShardTypeCardCompact({
    shardType,
    onClick,
    className,
}: {
    shardType: ShardType
    onClick?: (shardType: ShardType) => void
    className?: string
}) {
    return (
        <Card
            className={cn(
                "group cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]",
                className
            )}
            onClick={() => onClick?.(shardType)}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <ShardTypeIcon
                        icon={shardType.icon}
                        color={shardType.color}
                        size="md"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                            {shardType.displayName || shardType.name}
                        </div>
                        {shardType.description && (
                            <p className="text-xs text-muted-foreground truncate">
                                {shardType.description}
                            </p>
                        )}
                    </div>
                    {shardType.isGlobal && (
                        <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
