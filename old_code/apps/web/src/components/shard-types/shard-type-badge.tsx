import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ShardTypeIcon } from "./shard-type-icon"
import { cn } from "@/lib/utils"
import type { ShardType, ShardTypeStatus } from "@/types/api"
import { Globe, Lock } from "lucide-react"

interface ShardTypeBadgeProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * ShardType object or minimal info
     */
    shardType: Pick<ShardType, "id" | "name" | "displayName" | "icon" | "color" | "status" | "isGlobal">
    /**
     * Whether to show the status indicator
     */
    showStatus?: boolean
    /**
     * Whether to show the global indicator
     */
    showGlobalIndicator?: boolean
    /**
     * If provided, makes the badge clickable and links to detail page
     */
    href?: string
    /**
     * Size variant
     */
    size?: "sm" | "md" | "lg"
    /**
     * Custom onClick handler (overrides href)
     */
    onClick?: (e: React.MouseEvent) => void
}

export function ShardTypeBadge({
    shardType,
    showStatus = true,
    showGlobalIndicator = true,
    href,
    size = "md",
    onClick,
    className,
    ...props
}: ShardTypeBadgeProps) {
    const isClickable = !!href || !!onClick

    const content = (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                isClickable && "cursor-pointer hover:bg-accent hover:text-accent-foreground",
                size === "sm" && "px-2 py-1 text-xs",
                size === "lg" && "px-3 py-2 text-base",
                className
            )}
            onClick={onClick}
            {...props}
        >
            <ShardTypeIcon
                icon={shardType.icon}
                color={shardType.color}
                size={size === "sm" ? "sm" : size === "lg" ? "md" : "sm"}
            />

            <span className="font-medium">
                {shardType.displayName || shardType.name}
            </span>

            {showGlobalIndicator && shardType.isGlobal && (
                <Globe className={cn(
                    "text-blue-600 dark:text-blue-400",
                    size === "sm" && "h-3 w-3",
                    size === "md" && "h-3.5 w-3.5",
                    size === "lg" && "h-4 w-4"
                )} />
            )}

            {showStatus && shardType.status && shardType.status !== "active" && (
                <Badge
                    variant={shardType.status === "deprecated" ? "secondary" : "destructive"}
                    className={cn(
                        "ml-1",
                        size === "sm" && "text-[10px] px-1.5 py-0"
                    )}
                >
                    {shardType.status}
                </Badge>
            )}
        </div>
    )

    if (href && !onClick) {
        return (
            <Link href={href} className="inline-block">
                {content}
            </Link>
        )
    }

    return content
}

/**
 * Compact variant showing just the icon
 */
export function ShardTypeBadgeCompact({
    shardType,
    size = "md",
    className,
    ...props
}: Omit<ShardTypeBadgeProps, "showStatus" | "showGlobalIndicator">) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1",
                className
            )}
            title={shardType.displayName || shardType.name}
            {...props}
        >
            <ShardTypeIcon
                icon={shardType.icon}
                color={shardType.color}
                size={size}
                bordered
            />
            {shardType.isGlobal && (
                <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            )}
        </div>
    )
}
