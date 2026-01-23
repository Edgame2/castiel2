import * as React from "react"
import { Button } from "@/components/ui/button"
import { SchemaFieldBuilder, type SchemaField } from "./field-builder"
import { SchemaFieldList } from "./field-list"
import { Plus } from "lucide-react"

interface VisualSchemaBuilderProps {
    value: Record<string, any>
    onChange: (schema: Record<string, any>) => void
}

export function VisualSchemaBuilder({ value, onChange }: VisualSchemaBuilderProps) {
    const [fields, setFields] = React.useState<Record<string, SchemaField>>(() => {
        // Convert JSON Schema to internal format
        return convertFromJsonSchema(value)
    })

    const [isBuilderOpen, setIsBuilderOpen] = React.useState(false)
    const [editingField, setEditingField] = React.useState<{
        name: string
        field: SchemaField
    } | null>(null)

    // Convert internal format to JSON Schema whenever fields change
    React.useEffect(() => {
        const jsonSchema = convertToJsonSchema(fields)
        onChange(jsonSchema)
    }, [fields]) // eslint-disable-line react-hooks/exhaustive-deps

    // Sync when external schema `value` changes (e.g., loaded from API)
    React.useEffect(() => {
        try {
            const incomingSchema = value
            // Ensure schema has proper structure
            const normalizedSchema = incomingSchema?.properties 
                ? incomingSchema 
                : { type: "object", properties: incomingSchema?.properties || {} }
            
            const incomingFields = convertFromJsonSchema(normalizedSchema)
            const currentSchema = convertToJsonSchema(fields)
            const isDifferent = JSON.stringify(normalizedSchema) !== JSON.stringify(currentSchema)

            if (!isDifferent) return

            // Always update if incoming schema has fields, or if current is empty
            const hasIncoming = Object.keys(incomingFields).length > 0
            const hasCurrent = Object.keys(fields).length > 0
            
            // Update if incoming has fields, or if both are empty (initial load)
            if (hasIncoming || (!hasIncoming && !hasCurrent)) {
                setFields(incomingFields)
            }
        } catch {
            // ignore parse/update errors and keep current fields
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const handleAddField = (field: SchemaField) => {
        setFields((prev) => ({
            ...prev,
            [field.name]: field,
        }))
        setIsBuilderOpen(false)
    }

    const handleEditField = (oldName: string, newField: SchemaField) => {
        setFields((prev) => {
            const updated = { ...prev }
            if (oldName !== newField.name) {
                delete updated[oldName]
            }
            updated[newField.name] = newField
            return updated
        })
        setEditingField(null)
    }

    const handleDeleteField = (name: string) => {
        setFields((prev) => {
            const updated = { ...prev }
            delete updated[name]
            return updated
        })
    }

    const handleReorderFields = (reordered: Record<string, SchemaField>) => {
        setFields(reordered)
    }

    const openEditDialog = (name: string, field: SchemaField) => {
        setEditingField({ name, field })
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Schema Fields</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBuilderOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                </Button>
            </div>

            <SchemaFieldList
                fields={fields}
                onEdit={openEditDialog}
                onDelete={handleDeleteField}
                onReorder={handleReorderFields}
            />

            <SchemaFieldBuilder
                open={isBuilderOpen || !!editingField}
                onOpenChange={(open) => {
                    setIsBuilderOpen(open)
                    if (!open) setEditingField(null)
                }}
                onSave={(field) => {
                    if (editingField) {
                        handleEditField(editingField.name, field)
                    } else {
                        handleAddField(field)
                    }
                }}
                initialField={editingField?.field}
                existingFieldNames={Object.keys(fields).filter(
                    (name) => name !== editingField?.name
                )}
            />
        </div>
    )
}

/**
 * Convert internal SchemaField format to JSON Schema
 */
function convertToJsonSchema(fields: Record<string, SchemaField>): Record<string, any> {
    const properties: Record<string, any> = {}
    const required: string[] = []

    Object.entries(fields).forEach(([name, field]) => {
        const property: Record<string, any> = {
            type: field.type,
        }

        if (field.description) property.description = field.description
        if (field.default !== undefined) property.default = field.default

        // String constraints
        if (field.minLength !== undefined) property.minLength = field.minLength
        if (field.maxLength !== undefined) property.maxLength = field.maxLength
        if (field.pattern) property.pattern = field.pattern

        // Number constraints
        if (field.minimum !== undefined) property.minimum = field.minimum
        if (field.maximum !== undefined) property.maximum = field.maximum

        // Array constraints
        if (field.type === "array") {
            if (field.items) {
                property.items = { type: field.items.type || "string" }
            }
            if (field.minItems !== undefined) property.minItems = field.minItems
            if (field.maxItems !== undefined) property.maxItems = field.maxItems
        }

        // Enum
        if (field.enum && field.enum.length > 0) {
            property.enum = field.enum
        }

        // Nested object
        if (field.type === "object" && field.properties) {
            property.properties = convertToJsonSchema({ ...field.properties }).properties
        }

        properties[name] = property

        if (field.required) {
            required.push(name)
        }
    })

    return {
        type: "object",
        properties,
        ...(required.length > 0 && { required }),
    }
}

/**
 * Convert JSON Schema to internal SchemaField format
 */
function convertFromJsonSchema(schema: Record<string, any>): Record<string, SchemaField> {
    const fields: Record<string, SchemaField> = {}

    // Handle null, undefined, or empty schema
    if (!schema || typeof schema !== "object") {
        return fields
    }

    // Case 1: JSON Schema format
    if (schema.properties && typeof schema.properties === "object") {
        const required = schema.required || []

        Object.entries(schema.properties).forEach(([name, prop]: [string, any]) => {
            const field: SchemaField = {
                name,
                type: prop.type || "string",
                description: prop.description,
                required: required.includes(name),
                default: prop.default,
                minLength: prop.minLength,
                maxLength: prop.maxLength,
                pattern: prop.pattern,
                minimum: prop.minimum,
                maximum: prop.maximum,
                enum: prop.enum,
                minItems: prop.minItems,
                maxItems: prop.maxItems,
            }

            if (prop.type === "array" && prop.items) {
                field.items = {
                    name: "item",
                    type: prop.items.type || "string",
                }
            }

            if (prop.type === "object" && prop.properties) {
                field.properties = convertFromJsonSchema(prop)
            }

            fields[name] = field
        })

        return fields
    }

    // Case 2: Legacy schema format { fields: Record<string, FieldDefinition> }
    if (schema && typeof schema === "object" && schema.fields && typeof schema.fields === "object") {
        const legacyFields = schema.fields as Record<string, any>
        Object.entries(legacyFields).forEach(([name, def]) => {
            const field: SchemaField = {
                name,
                // Map legacy FieldType strings directly when possible
                type: (def.type as SchemaField["type"]) || "string",
                description: def.description,
                required: !!def.required,
                // Legacy uses defaultValue
                default: def.defaultValue,
                // String constraints
                minLength: def.minLength,
                maxLength: def.maxLength,
                pattern: def.pattern,
                // Number constraints
                minimum: def.min,
                maximum: def.max,
            }

            // Enum/options mapping (support string[] or {value,label}[])
            if (Array.isArray(def.options) && def.options.length > 0) {
                field.enum = def.options.map((opt: any) => typeof opt === "string" ? opt : opt?.value).filter(Boolean)
            }

            // Arrays (no detailed items in legacy, default to string items)
            if (def.type === "array") {
                field.items = { name: "item", type: (def.items?.type as SchemaField["type"]) || "string" }
                field.minItems = def.minItems
                field.maxItems = def.maxItems
            }

            // Nested object unsupported in legacy FieldDefinition; if present, try best-effort
            if (def.type === "object" && def.properties && typeof def.properties === "object") {
                field.properties = convertFromJsonSchema({ properties: def.properties, required: def.requiredFields })
            }

            fields[name] = field
        })

        return fields
    }

    // Default: no recognized fields
    return fields
}
