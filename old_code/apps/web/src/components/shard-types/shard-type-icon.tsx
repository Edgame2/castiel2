import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
    FileText,
    Database,
    Image as ImageIcon,
    Settings,
    Box,
    type LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

const iconVariants = cva(
    "flex items-center justify-center rounded-md shrink-0",
    {
        variants: {
            size: {
                sm: "h-4 w-4 text-xs",
                md: "h-6 w-6 text-sm",
                lg: "h-8 w-8 text-base",
                xl: "h-10 w-10 text-lg",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
)

// Map of icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
    "file-text": FileText,
    database: Database,
    image: ImageIcon,
    settings: Settings,
    box: Box,
    // Add more as needed
}

interface ShardTypeIconProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconVariants> {
    /**
     * Icon name from Lucide icons or custom icon string
     */
    icon?: string
    /**
     * Hex color for the icon background
     */
    color?: string
    /**
     * Whether to show a border around the icon
     */
    bordered?: boolean
}

export const ShardTypeIcon = React.forwardRef<HTMLDivElement, ShardTypeIconProps>(
    ({ className, size, icon, color, bordered = false, ...props }, ref) => {
        // Get the icon component or use default
        const IconComponent = icon ? iconMap[icon] || Box : Box

        // Use provided color or default
        const bgColor = color || "#94a3b8" // Default slate-400
        const textColor = getContrastColor(bgColor)

        return (
            <div
                ref={ref}
                className={cn(
                    iconVariants({ size }),
                    bordered && "border-2",
                    className
                )}
                style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    borderColor: bordered ? adjustBrightness(bgColor, -20) : undefined,
                }}
                {...props}
            >
                <IconComponent className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : size === "xl" ? "h-6 w-6" : "h-4 w-4"} />
            </div>
        )
    }
)

ShardTypeIcon.displayName = "ShardTypeIcon"

/**
 * Get contrasting text color (black or white) based on background color
 */
function getContrastColor(hexColor: string): string {
    // Remove # if present
    const hex = hexColor.replace("#", "")

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? "#000000" : "#ffffff"
}

/**
 * Adjust brightness of a hex color
 */
function adjustBrightness(hexColor: string, percent: number): string {
    const hex = hexColor.replace("#", "")
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + percent))
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + percent))
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + percent))

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

export { iconVariants }
