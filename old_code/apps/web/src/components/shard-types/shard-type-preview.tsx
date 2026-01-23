import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ShardTypeIcon } from "./shard-type-icon"
import { AlertCircle, Sparkles } from "lucide-react"
import type { ShardType } from "@/types/api"
import { trackTrace } from "@/lib/monitoring/app-insights"

interface ShardTypePreviewProps {
    shardType: ShardType
    onGenerateSampleData?: () => void
    isGenerating?: boolean
}

export function ShardTypePreview({
    shardType,
    onGenerateSampleData,
    isGenerating = false,
}: ShardTypePreviewProps) {
    const [formData, setFormData] = React.useState<Record<string, any>>({})
    const [errors, setErrors] = React.useState<Record<string, string>>({})

    const schema = shardType.schema
    const properties = schema?.properties || {}
    const required = (schema?.required || []) as string[]

    const handleChange = (fieldName: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [fieldName]: value,
        }))
        // Clear error for this field
        if (errors[fieldName]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[fieldName]
                return newErrors
            })
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        // Check required fields
        required.forEach((fieldName: string) => {
            if (!formData[fieldName]) {
                newErrors[fieldName] = "This field is required"
            }
        })

        // Additional validation based on schema constraints
        Object.entries(properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
            const value = formData[fieldName]

            if (value !== undefined && value !== null && value !== "") {
                // String validation
                if (fieldSchema.type === "string") {
                    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
                        newErrors[fieldName] = `Minimum length is ${fieldSchema.minLength}`
                    }
                    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
                        newErrors[fieldName] = `Maximum length is ${fieldSchema.maxLength}`
                    }
                    if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
                        newErrors[fieldName] = "Value does not match required pattern"
                    }
                }

                // Number validation
                if (fieldSchema.type === "number" || fieldSchema.type === "integer") {
                    const numValue = Number(value)
                    if (fieldSchema.minimum !== undefined && numValue < fieldSchema.minimum) {
                        newErrors[fieldName] = `Minimum value is ${fieldSchema.minimum}`
                    }
                    if (fieldSchema.maximum !== undefined && numValue > fieldSchema.maximum) {
                        newErrors[fieldName] = `Maximum value is ${fieldSchema.maximum}`
                    }
                }
            }
        })

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (validateForm()) {
            // Log form validation success in development only
            if (process.env.NODE_ENV === 'development') {
                trackTrace("Form is valid in shard-type-preview", 0, { formData })
            }
            alert("Form validation passed! Check console for data." as any)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShardTypeIcon
                            icon={shardType.icon}
                            color={shardType.color}
                            size="lg"
                        />
                        <div>
                            <CardTitle>Form Preview</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {shardType.displayName || shardType.name}
                            </p>
                        </div>
                    </div>
                    {onGenerateSampleData && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onGenerateSampleData}
                            disabled={isGenerating}
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {isGenerating ? "Generating..." : "Generate Sample"}
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {Object.keys(properties).length === 0 ? (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            No schema fields defined yet. Add fields to see the form preview.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {Object.entries(properties).map(([fieldName, fieldSchema]: [string, any]) => (
                            <FormField
                                key={fieldName}
                                name={fieldName}
                                schema={fieldSchema}
                                required={required.includes(fieldName)}
                                value={formData[fieldName]}
                                onChange={(value) => handleChange(fieldName, value)}
                                error={errors[fieldName]}
                            />
                        ))}

                        <div className="flex gap-2 pt-4 border-t">
                            <Button type="submit">Test Submission</Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setFormData({})
                                    setErrors({})
                                }}
                            >
                                Clear Form
                            </Button>
                        </div>

                        {Object.keys(errors).length > 0 && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Please fix the validation errors above.
                                </AlertDescription>
                            </Alert>
                        )}
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

/**
 * Render a single form field based on JSON Schema
 */
function FormField({
    name,
    schema,
    required,
    value,
    onChange,
    error,
}: {
    name: string
    schema: any
    required: boolean
    value: any
    onChange: (value: any) => void
    error?: string
}) {
    const renderInput = () => {
        const commonProps = {
            id: name,
            value: value || "",
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                onChange(e.target.value),
        }

        switch (schema.type) {
            case "string":
                if (schema.enum) {
                    return (
                        <select
                            {...commonProps}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">Select...</option>
                            {schema.enum.map((option: string) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    )
                }
                if (schema.maxLength && schema.maxLength > 100) {
                    return (
                        <textarea
                            {...commonProps}
                            rows={3}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                    )
                }
                return (
                    <input
                        type="text"
                        {...commonProps}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                )

            case "number":
            case "integer":
                return (
                    <input
                        type="number"
                        {...commonProps}
                        step={schema.type === "integer" ? 1 : "any"}
                        min={schema.minimum}
                        max={schema.maximum}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                )

            case "boolean":
                return (
                    <input
                        type="checkbox"
                        id={name}
                        checked={value || false}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                    />
                )

            case "date":
                return (
                    <input
                        type="date"
                        {...commonProps}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                )

            case "datetime":
                return (
                    <input
                        type="datetime-local"
                        {...commonProps}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                )

            default:
                return (
                    <input
                        type="text"
                        {...commonProps}
                        placeholder={`${schema.type} type`}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                )
        }
    }

    return (
        <div className="space-y-2">
            <label htmlFor={name} className="text-sm font-medium flex items-center gap-2">
                {name}
                {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                {schema.description && (
                    <span className="font-normal text-muted-foreground">
                        — {schema.description}
                    </span>
                )}
            </label>
            {renderInput()}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    )
}

/**
 * Loading skeleton for preview
 */
export function ShardTypePreviewSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
