import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#eab308", // yellow
    "#84cc16", // lime
    "#22c55e", // green
    "#10b981", // emerald
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#0ea5e9", // sky
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
    "#f43f5e", // rose
    "#64748b", // slate
    "#6b7280", // gray
    "#78716c", // stone
]

interface ColorPickerProps {
    value?: string
    onChange: (color: string) => void
    className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [customColor, setCustomColor] = React.useState(value || "#3b82f6")

    React.useEffect(() => {
        if (value) {
            setCustomColor(value)
        }
    }, [value])

    const handleColorSelect = (color: string) => {
        onChange(color)
        setCustomColor(color)
        setOpen(false)
    }

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value
        setCustomColor(color)
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            onChange(color)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-full justify-start", className)}
                >
                    <div
                        className="h-5 w-5 rounded border mr-2"
                        style={{ backgroundColor: value || "#3b82f6" }}
                    />
                    <span className="flex-1 text-left">{value || "Select color"}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Preset Colors</Label>
                        <div className="grid grid-cols-10 gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => handleColorSelect(color)}
                                    className="relative h-8 w-8 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                >
                                    {value === color && (
                                        <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                                    )}
                                    <span className="sr-only">{color}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="custom-color">Custom Hex Color</Label>
                        <div className="flex gap-2">
                            <Input
                                id="custom-color"
                                type="text"
                                placeholder="#3b82f6"
                                value={customColor}
                                onChange={handleCustomColorChange}
                                maxLength={7}
                                className="flex-1 font-mono"
                            />
                            <div
                                className="h-10 w-10 rounded border shrink-0"
                                style={{ backgroundColor: customColor }}
                            />
                        </div>
                        {customColor && !/^#[0-9A-Fa-f]{6}$/.test(customColor) && (
                            <p className="text-xs text-destructive">
                                Invalid hex color format (use #RRGGBB)
                            </p>
                        )}
                    </div>

                    <Button
                        type="button"
                        className="w-full"
                        onClick={() => {
                            if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                                handleColorSelect(customColor)
                            }
                        }}
                        disabled={!/^#[0-9A-Fa-f]{6}$/.test(customColor)}
                    >
                        Apply Color
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
