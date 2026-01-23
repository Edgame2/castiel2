import * as React from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, GripVertical, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SchemaField } from "./field-builder"

interface SchemaFieldListProps {
    fields: Record<string, SchemaField>
    onEdit: (fieldName: string, field: SchemaField) => void
    onDelete: (fieldName: string) => void
    onReorder?: (fields: Record<string, SchemaField>) => void
}

export function SchemaFieldList({
    fields,
    onEdit,
    onDelete,
    onReorder,
}: SchemaFieldListProps) {
    const fieldEntries = Object.entries(fields)
    const fieldNames = fieldEntries.map(([name]) => name)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = fieldNames.indexOf(active.id as string)
            const newIndex = fieldNames.indexOf(over.id as string)
            const newOrder = arrayMove(fieldNames, oldIndex, newIndex)

            const reorderedFields: Record<string, SchemaField> = {}
            newOrder.forEach((name) => {
                reorderedFields[name] = fields[name]
            })

            onReorder?.(reorderedFields)
        }
    }

    if (fieldEntries.length === 0) {
        return (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No fields added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Click "Add Field" to start building your schema
                </p>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={fieldNames} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                    {fieldEntries.map(([name, field]) => (
                        <SortableFieldItem
                            key={name}
                            name={name}
                            field={field}
                            onEdit={() => onEdit(name, field)}
                            onDelete={() => onDelete(name)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}

interface SortableFieldItemProps {
    name: string
    field: SchemaField
    onEdit: () => void
    onDelete: () => void
    level?: number
}

function SortableFieldItem({
    name,
    field,
    onEdit,
    onDelete,
    level = 0,
}: SortableFieldItemProps) {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const hasNestedProperties = field.type === "object" && field.properties

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: name })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors group",
                    isDragging && "opacity-50 shadow-lg",
                    level > 0 && "ml-6"
                )}
            >
                {/* Drag Handle */}
                <button
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>

                {/* Expand Toggle for nested objects */}
                {hasNestedProperties && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                )}

                {/* Field Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{name}</span>
                        <Badge variant="secondary" className="text-xs">
                            {field.type}
                        </Badge>
                        {field.required && (
                            <Badge variant="destructive" className="text-xs">
                                Required
                            </Badge>
                        )}
                        {field.enum && field.enum.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                                Enum ({field.enum.length})
                            </Badge>
                        )}
                    </div>
                    {field.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {field.description}
                        </p>
                    )}

                    {/* Constraints summary */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {field.minLength !== undefined && (
                            <span className="text-xs text-muted-foreground">
                                min: {field.minLength}
                            </span>
                        )}
                        {field.maxLength !== undefined && (
                            <span className="text-xs text-muted-foreground">
                                max: {field.maxLength}
                            </span>
                        )}
                        {field.minimum !== undefined && (
                            <span className="text-xs text-muted-foreground">
                                min: {field.minimum}
                            </span>
                        )}
                        {field.maximum !== undefined && (
                            <span className="text-xs text-muted-foreground">
                                max: {field.maximum}
                            </span>
                        )}
                        {field.pattern && (
                            <span className="text-xs text-muted-foreground font-mono">
                                /{field.pattern}/
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onEdit}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit field</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete field</span>
                    </Button>
                </div>
            </div>

            {/* Nested properties */}
            {isExpanded && hasNestedProperties && field.properties && (
                <div className="ml-6 space-y-2 mt-2">
                    {Object.entries(field.properties).map(([propName, propField]) => (
                        <SortableFieldItem
                            key={propName}
                            name={propName}
                            field={propField}
                            onEdit={() => { }}
                            onDelete={() => { }}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </>
    )
}
