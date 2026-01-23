import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TagsInputProps {
    value: string[]
    onChange: (tags: string[]) => void
    suggestions?: string[]
    placeholder?: string
    maxTags?: number
    className?: string
}

export function TagsInput({
    value,
    onChange,
    suggestions = [],
    placeholder = "Add a tag...",
    maxTags,
    className,
}: TagsInputProps) {
    const [inputValue, setInputValue] = React.useState("")
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const filteredSuggestions = React.useMemo(() => {
        if (!inputValue.trim()) return []
        return suggestions
            .filter(
                (tag) =>
                    tag.toLowerCase().includes(inputValue.toLowerCase()) &&
                    !value.includes(tag)
            )
            .slice(0, 5)
    }, [inputValue, suggestions, value])

    const addTag = (tag: string) => {
        const trimmed = tag.trim().toLowerCase()
        if (trimmed && !value.includes(trimmed)) {
            if (!maxTags || value.length < maxTags) {
                onChange([...value, trimmed])
                setInputValue("")
                setShowSuggestions(false)
            }
        }
    }

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter((tag) => tag !== tagToRemove))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            removeTag(value[value.length - 1])
        } else if (e.key === "Escape") {
            setShowSuggestions(false)
        }
    }

    return (
        <div className={cn("relative", className)}>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-ring">
                {value.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setShowSuggestions(true)
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                        // Delay to allow clicking suggestions
                        setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    placeholder={value.length === 0 ? placeholder : ""}
                    disabled={maxTags ? value.length >= maxTags : false}
                    className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
                />
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
                    {filteredSuggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground first:rounded-t-md last:rounded-b-md"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {maxTags && (
                <p className="text-xs text-muted-foreground mt-1">
                    {value.length}/{maxTags} tags
                </p>
            )}
        </div>
    )
}
