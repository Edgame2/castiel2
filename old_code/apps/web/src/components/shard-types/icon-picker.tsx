import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    FileText,
    Database,
    Image as ImageIcon,
    Settings,
    Box,
    File,
    Folder,
    Package,
    Tag,
    Cloud,
    Server,
    Cpu,
    HardDrive,
    Link,
    Mail,
    User,
    Users,
    Calendar,
    Clock,
    Bell,
    Check,
    Search,
    Filter,
    Download,
    Upload,
    type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Categorized icon sets
const ICON_CATEGORIES = {
    document: {
        label: "Documents",
        icons: {
            "file-text": FileText,
            file: File,
            folder: Folder,
        },
    },
    data: {
        label: "Data & Storage",
        icons: {
            database: Database,
            "hard-drive": HardDrive,
            server: Server,
            cloud: Cloud,
        },
    },
    media: {
        label: "Media",
        icons: {
            image: ImageIcon,
            package: Package,
        },
    },
    config: {
        label: "Configuration",
        icons: {
            settings: Settings,
            cpu: Cpu,
        },
    },
    organization: {
        label: "Organization",
        icons: {
            box: Box,
            tag: Tag,
        },
    },
    people: {
        label: "People",
        icons: {
            user: User,
            users: Users,
        },
    },
    time: {
        label: "Date & Time",
        icons: {
            calendar: Calendar,
            clock: Clock,
        },
    },
    actions: {
        label: "Actions",
        icons: {
            check: Check,
            search: Search,
            filter: Filter,
            bell: Bell,
            download: Download,
            upload: Upload,
            link: Link,
            mail: Mail,
        },
    },
}

interface IconPickerProps {
    value?: string
    onChange: (icon: string) => void
    className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Get the icon component for display
    const getIconComponent = (iconName: string | undefined): LucideIcon => {
        if (!iconName) return Box

        for (const category of Object.values(ICON_CATEGORIES)) {
            if (category.icons[iconName as keyof typeof category.icons]) {
                return category.icons[iconName as keyof typeof category.icons]
            }
        }
        return Box
    }

    const SelectedIcon = getIconComponent(value)

    // Filter icons based on search
    const filteredCategories = React.useMemo(() => {
        if (!searchQuery.trim()) return ICON_CATEGORIES

        const query = searchQuery.toLowerCase()
        const filtered: any = {}

        Object.entries(ICON_CATEGORIES).forEach(([key, category]) => {
            const matchingIcons = Object.entries(category.icons).filter(([name]) =>
                name.toLowerCase().includes(query)
            )

            if (matchingIcons.length > 0) {
                filtered[key] = {
                    ...category,
                    icons: Object.fromEntries(matchingIcons),
                }
            }
        })

        return filtered
    }, [searchQuery])

    const handleIconSelect = (iconName: string) => {
        onChange(iconName)
        setOpen(false)
        setSearchQuery("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-start", className)}
                >
                    <SelectedIcon className="h-5 w-5 mr-2" />
                    <span className="flex-1 text-left">{value || "Select icon"}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Select Icon</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Search icons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                    />

                    <Tabs defaultValue={Object.keys(filteredCategories)[0]} className="w-full">
                        <TabsList className="grid grid-cols-4 h-auto flex-wrap">
                            {Object.entries(filteredCategories).slice(0, 8).map(([key, category]: [string, any]) => (
                                <TabsTrigger key={key} value={key} className="text-xs">
                                    {category.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <ScrollArea className="h-[400px] mt-4">
                            {Object.entries(filteredCategories).map(([categoryKey, category]: [string, any]) => (
                                <TabsContent key={categoryKey} value={categoryKey} className="mt-0">
                                    <div className="grid grid-cols-6 gap-2">
                                        {Object.entries(category.icons).map(([iconName, IconComponent]: [string, any]) => (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => handleIconSelect(iconName)}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-lg border hover:bg-accent hover:text-accent-foreground transition-colors",
                                                    value === iconName && "bg-accent text-accent-foreground ring-2 ring-ring"
                                                )}
                                                title={iconName}
                                            >
                                                <IconComponent className="h-6 w-6" />
                                                <span className="text-[10px] mt-1 truncate max-w-full">
                                                    {iconName}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </TabsContent>
                            ))}
                        </ScrollArea>
                    </Tabs>

                    {Object.keys(filteredCategories).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No icons found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
