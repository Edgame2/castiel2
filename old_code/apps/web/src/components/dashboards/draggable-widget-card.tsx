"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface DraggableWidgetCardProps {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultSize: { width: number; height: number }
  isSelected?: boolean
  onClick?: () => void
  draggable?: boolean
}

export function DraggableWidgetCard({
  id,
  name,
  description,
  icon: Icon,
  defaultSize,
  isSelected,
  onClick,
  draggable = false,
}: DraggableWidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !draggable,
    data: {
      type: "widget-template",
      widgetData: {
        id,
        name,
        defaultSize,
      },
    },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md relative",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50 cursor-grabbing"
      )}
      onClick={onClick}
    >
      {draggable && (
        <div
          {...listeners}
          {...attributes}
          className="absolute top-2 right-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-accent"
          title="Drag to dashboard"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm pr-6">{name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>
        <div className="flex items-center gap-1 mt-2">
          <Badge variant="outline" className="text-xs">
            {defaultSize.width}×{defaultSize.height}
          </Badge>
          {draggable && (
            <Badge variant="secondary" className="text-xs">
              Drag & Drop
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
