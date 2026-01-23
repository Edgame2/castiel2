"use client"

import { useState, useRef, useEffect } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Settings, Trash2, Maximize2, Minimize2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { Widget, GridPosition, GridSize } from "@/types/dashboard"
import { cn } from "@/lib/utils"

interface SortableWidgetProps {
  widget: Widget
  position: GridPosition
  size: GridSize
  gridColumns: number
  rowHeight: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onResize: (newSize: GridSize) => void
}

export function SortableWidget({
  widget,
  position,
  size,
  gridColumns,
  rowHeight,
  isSelected,
  onSelect,
  onDelete,
  onResize,
}: SortableWidgetProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['dashboards', 'common'])
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 })
  const [resizeStartSize, setResizeStartSize] = useState<GridSize>(size)
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : transition,
    gridColumn: `${position.x + 1} / span ${size.width}`,
    gridRow: `${position.y + 1} / span ${size.height}`,
    minHeight: `${size.height * rowHeight}px`,
  }

  // Size presets
  const sizePresets = [
    { label: 'Small', width: 3, height: 2 },
    { label: 'Medium', width: 6, height: 4 },
    { label: 'Large', width: 12, height: 4 },
    { label: 'Tall', width: 4, height: 6 },
    { label: 'Wide', width: 8, height: 3 },
  ]

  // Handle resize mouse down
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    setResizeStartPos({ x: e.clientX, y: e.clientY })
    setResizeStartSize(size)
  }

  // Handle mouse move during resize
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return

      const deltaX = e.clientX - resizeStartPos.x
      const deltaY = e.clientY - resizeStartPos.y

      // Get the container width to calculate column width
      const container = cardRef.current.parentElement
      if (!container) return

      const containerWidth = container.clientWidth
      const columnWidth = containerWidth / gridColumns

      // Calculate new size based on delta
      const columnsToAdd = Math.round(deltaX / columnWidth)
      const rowsToAdd = Math.round(deltaY / rowHeight)

      const newWidth = Math.max(1, Math.min(gridColumns, resizeStartSize.width + columnsToAdd))
      const newHeight = Math.max(1, Math.min(8, resizeStartSize.height + rowsToAdd))

      // Update size if changed
      if (newWidth !== size.width || newHeight !== size.height) {
        onResize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, resizeStartPos, resizeStartSize, gridColumns, rowHeight, size, onResize])

  return (
    <Card
      ref={(node) => {
        setNodeRef(node)
        if (node) cardRef.current = node
      }}
      style={style}
      className={cn(
        "group relative transition-all cursor-default",
        isDragging && "opacity-50 shadow-lg z-50",
        isSelected && "ring-2 ring-primary",
        isResizing && "ring-2 ring-blue-500 transition-none"
      )}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          "absolute top-2 left-2 p-1 rounded cursor-grab active:cursor-grabbing",
          "bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity",
          isDragging && "opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Actions */}
      <div
        className={cn(
          "absolute top-2 right-2 flex items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {t('dashboards:resize' as any)}
            </div>
            {sizePresets.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => onResize({ width: preset.width, height: preset.height })}
              >
                <span className="flex-1">{preset.label}</span>
                <span className="text-xs text-muted-foreground">
                  {preset.width}×{preset.height}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 bg-background/80 backdrop-blur text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CardHeader className="pb-2 pt-8">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {widget.name}
          <Badge variant="outline" className="text-xs font-normal">
            {widget.widgetType?.replace('_', ' ') || 'Unknown'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="h-full flex items-center justify-center text-muted-foreground text-sm border rounded bg-muted/30">
          {t('dashboards:widgetPreview' as any)}
        </div>
      </CardContent>

      {/* Resize Handle */}
      <div
        className={cn(
          "absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-10",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isResizing && "opacity-100"
        )}
        onMouseDown={handleResizeStart}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full text-muted-foreground"
          fill="currentColor"
        >
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>

      {/* Size indicator when selected */}
      {isSelected && (
        <div className="absolute bottom-1 left-1 text-xs text-muted-foreground bg-background/80 px-1 rounded">
          {size.width}×{size.height}
        </div>
      )}
    </Card>
  )
}

