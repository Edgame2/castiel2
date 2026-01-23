import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ShardTypeBadgeCompact } from "./shard-type-badge"
import { cn } from "@/lib/utils"
import type { ShardType, ShardTypeCategory } from "@/types/api"

interface ParentTypeSelectorProps {
    value?: string
    onChange: (parentId: string | undefined) => void
    currentTypeId?: string
    availableTypes: ShardType[]
    category?: ShardTypeCategory
}

export function ParentTypeSelector({
    value,
    onChange,
    currentTypeId,
    availableTypes,
    category,
}: ParentTypeSelectorProps) {
    const [open, setOpen] = React.useState(false)

    // Filter out current type and its descendants to prevent circular inheritance
    const selectableTypes = React.useMemo(() => {
        return availableTypes.filter((type) => {
            // Can't select self
            if (type.id === currentTypeId) return false

            // Can't select if it would create circular reference
            // (In a real implementation, you'd check the full inheritance chain)
            if (type.parentShardTypeId === currentTypeId) return false

            // Filter by category if provided
            if (category && type.category !== category) return false

            return true
        })
    }, [availableTypes, currentTypeId, category])

    const selectedType = selectableTypes.find((type) => type.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedType ? (
                        <ShardTypeBadgeCompact shardType={selectedType} size="sm" />
                    ) : (
                        <span className="text-muted-foreground">Select parent type...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search types..." />
                    <CommandList>
                        <CommandEmpty>No types found.</CommandEmpty>
                        <CommandGroup>
                            {value && (
                                <CommandItem
                                    value="none"
                                    onSelect={() => {
                                        onChange(undefined)
                                        setOpen(false)
                                    }}
                                    className="text-muted-foreground"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            !value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    No parent (root type)
                                </CommandItem>
                            )}
                            {selectableTypes.map((type) => (
                                <CommandItem
                                    key={type.id}
                                    value={type.name}
                                    onSelect={() => {
                                        onChange(type.id === value ? undefined : type.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === type.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <ShardTypeBadgeCompact shardType={type} size="sm" />
                                    <span className="ml-2 text-sm">
                                        {type.displayName || type.name}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
