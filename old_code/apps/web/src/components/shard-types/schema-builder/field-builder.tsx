import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export interface SchemaField {
    name: string
    type: "string" | "number" | "integer" | "boolean" | "array" | "object" | "date" | "datetime"
    description?: string
    required?: boolean
    default?: any
    // String constraints
    minLength?: number
    maxLength?: number
    pattern?: string
    // Number constraints
    minimum?: number
    maximum?: number
    // Array constraints
    items?: SchemaField
    minItems?: number
    maxItems?: number
    // Enum
    enum?: string[]
    // Object properties
    properties?: Record<string, SchemaField>
}

interface SchemaFieldBuilderProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (field: SchemaField) => void
    initialField?: SchemaField
    existingFieldNames?: string[]
}

export function SchemaFieldBuilder({
    open,
    onOpenChange,
    onSave,
    initialField,
    existingFieldNames = [],
}: SchemaFieldBuilderProps) {
    const [field, setField] = React.useState<SchemaField>(
        initialField || {
            name: "",
            type: "string",
            required: false,
        }
    )

    const [enumInput, setEnumInput] = React.useState("")
    const [enumValues, setEnumValues] = React.useState<string[]>(initialField?.enum || [])

    React.useEffect(() => {
        if (initialField) {
            setField(initialField)
            setEnumValues(initialField.enum || [])
        } else {
            setField({ name: "", type: "string", required: false })
            setEnumValues([])
        }
    }, [initialField, open])

    const handleTypeChange = (type: SchemaField["type"]) => {
        setField((prev) => ({
            name: prev.name,
            type,
            description: prev.description,
            required: prev.required,
        }))
    }

    const addEnumValue = () => {
        if (enumInput.trim() && !enumValues.includes(enumInput.trim())) {
            setEnumValues([...enumValues, enumInput.trim()])
            setEnumInput("")
        }
    }

    const removeEnumValue = (value: string) => {
        setEnumValues(enumValues.filter((v) => v !== value))
    }

    const handleSave = () => {
        const fieldToSave: SchemaField = {
            ...field,
            ...(enumValues.length > 0 && { enum: enumValues }),
        }
        onSave(fieldToSave)
        onOpenChange(false)
    }

    const isNameValid = field.name && !existingFieldNames.includes(field.name)
    const isEdit = !!initialField

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit" : "Add"} Schema Field</DialogTitle>
                    <DialogDescription>
                        Define the properties and constraints for this field.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Field Name */}
                    <div className="space-y-2">
                        <Label htmlFor="field-name">
                            Field Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="field-name"
                            placeholder="e.g., title, price, isActive"
                            value={field.name}
                            onChange={(e) =>
                                setField({ ...field, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })
                            }
                            disabled={isEdit}
                        />
                        {field.name && !isNameValid && (
                            <p className="text-sm text-destructive">Field name already exists</p>
                        )}
                    </div>

                    {/* Field Type */}
                    <div className="space-y-2">
                        <Label htmlFor="field-type">
                            Type <span className="text-destructive">*</span>
                        </Label>
                        <Select value={field.type} onValueChange={handleTypeChange}>
                            <SelectTrigger id="field-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="string">Text (string)</SelectItem>
                                <SelectItem value="number">Number (decimal)</SelectItem>
                                <SelectItem value="integer">Integer</SelectItem>
                                <SelectItem value="boolean">Boolean (checkbox)</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="datetime">Date & Time</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                                <SelectItem value="object">Object (nested)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="field-description">Description</Label>
                        <Textarea
                            id="field-description"
                            placeholder="Describe what this field is for..."
                            value={field.description || ""}
                            onChange={(e) => setField({ ...field, description: e.target.value })}
                            rows={2}
                        />
                    </div>

                    {/* Required */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="field-required"
                            checked={field.required}
                            onCheckedChange={(checked) =>
                                setField({ ...field, required: checked as boolean })
                            }
                        />
                        <Label htmlFor="field-required" className="font-normal cursor-pointer">
                            Required field
                        </Label>
                    </div>

                    {/* String Constraints */}
                    {field.type === "string" && (
                        <div className="space-y-3 pt-2 border-t">
                            <h4 className="font-medium text-sm">String Constraints</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="min-length">Min Length</Label>
                                    <Input
                                        id="min-length"
                                        type="number"
                                        min={0}
                                        value={field.minLength || ""}
                                        onChange={(e) =>
                                            setField({
                                                ...field,
                                                minLength: e.target.value ? parseInt(e.target.value) : undefined,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="max-length">Max Length</Label>
                                    <Input
                                        id="max-length"
                                        type="number"
                                        min={0}
                                        value={field.maxLength || ""}
                                        onChange={(e) =>
                                            setField({
                                                ...field,
                                                maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pattern">Pattern (regex)</Label>
                                <Input
                                    id="pattern"
                                    placeholder="e.g., ^[A-Z0-9]+$"
                                    value={field.pattern || ""}
                                    onChange={(e) => setField({ ...field, pattern: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Number Constraints */}
                    {(field.type === "number" || field.type === "integer") && (
                        <div className="space-y-3 pt-2 border-t">
                            <h4 className="font-medium text-sm">Number Constraints</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="minimum">Minimum</Label>
                                    <Input
                                        id="minimum"
                                        type="number"
                                        value={field.minimum ?? ""}
                                        onChange={(e) =>
                                            setField({
                                                ...field,
                                                minimum: e.target.value ? parseFloat(e.target.value) : undefined,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maximum">Maximum</Label>
                                    <Input
                                        id="maximum"
                                        type="number"
                                        value={field.maximum ?? ""}
                                        onChange={(e) =>
                                            setField({
                                                ...field,
                                                maximum: e.target.value ? parseFloat(e.target.value) : undefined,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enum Values */}
                    {field.type === "string" && (
                        <div className="space-y-3 pt-2 border-t">
                            <h4 className="font-medium text-sm">Enum Values (Optional)</h4>
                            <p className="text-sm text-muted-foreground">
                                Define a fixed set of allowed values for this field
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a value..."
                                    value={enumInput}
                                    onChange={(e) => setEnumInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            addEnumValue()
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addEnumValue}>
                                    Add
                                </Button>
                            </div>
                            {enumValues.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {enumValues.map((value) => (
                                        <Badge key={value} variant="secondary">
                                            {value}
                                            <button
                                                type="button"
                                                onClick={() => removeEnumValue(value)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Array Constraints */}
                    {field.type === "array" && (
                        <div className="space-y-3 pt-2 border-t">
                            <h4 className="font-medium text-sm">Array Constraints</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="min-items">Min Items</Label>
                                    <Input
                                        id="min-items"
                                        type="number"
                                        min={0}
                                        value={field.minItems || ""}
                                        onChange={(e) =>
                                            setField({
                                                ...field,
                                                minItems: e.target.value ? parseInt(e.target.value) : undefined,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="max-items">Max Items</Label>
                                    <Input
                                        id="max-items"
                                        type="number"
                                        min={0}
                                        value={field.maxItems || ""}
                                        onChange={(e) =>
                                            setField({
                                                ...field,
                                                maxItems: e.target.value ? parseInt(e.target.value) : undefined,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!isNameValid}>
                        {isEdit ? "Update" : "Add"} Field
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
