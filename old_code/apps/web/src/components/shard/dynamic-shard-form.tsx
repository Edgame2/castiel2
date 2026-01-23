"use client"

import * as React from "react"
import { useForm, UseFormReturn, Path, PathValue } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, AlertCircle, HelpCircle, Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import type { ShardType } from "@/types/api"
import type { WidgetFormProps } from "@/types/widget-compatible"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

// JSON Schema property type
interface JsonSchemaProperty {
  type: string
  title?: string
  description?: string
  default?: unknown
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  enum?: string[]
  enumLabels?: string[]
  items?: JsonSchemaProperty
  minItems?: number
  maxItems?: number
  placeholder?: string
  checkboxLabel?: string
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  readOnly?: boolean
  writeOnly?: boolean
  examples?: unknown[]
  // UI hints
  "ui:widget"?: string
  "ui:options"?: Record<string, unknown>
  "ui:help"?: string
  "ui:placeholder"?: string
}

interface JsonSchema {
  type: string
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  title?: string
  description?: string
}

interface DynamicShardFormProps extends Partial<WidgetFormProps<Record<string, unknown>>> {
  shardType: ShardType
  initialData?: Record<string, unknown>
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  showRequiredIndicator?: boolean
  compact?: boolean
  columns?: 1 | 2
}

/**
 * Dynamic form generator that creates forms based on ShardType JSON schemas
 * 
 * Supports:
 * - Text, number, boolean, select, textarea, date field types
 * - Array fields with comma-separated input
 * - Object fields (simplified)
 * - Pattern validation with regex
 * - Min/max constraints
 * - Required field handling
 * - Read-only and widget-compatible modes
 * 
 * @example
 * ```tsx
 * <DynamicShardForm
 *   shardType={shardType}
 *   initialData={shard.metadata}
 *   onSubmit={handleSubmit}
 *   onCancel={() => router.back()}
 * />
 * ```
 */
export function DynamicShardForm({
  shardType,
  initialData,
  onSubmit,
  onCancel,
  mode = "edit",
  readOnly = false,
  isSubmitting = false,
  errors: externalErrors,
  submitLabel,
  cancelLabel,
  showRequiredIndicator = true,
  compact = false,
  columns = 1,
}: DynamicShardFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { t } = (useTranslation as any)(['shards', 'common'])
  const schema = shardType.schema as unknown as JsonSchema

  // Convert JSON Schema to Zod schema
  const zodSchema = React.useMemo(() => jsonSchemaToZod(schema), [schema])

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: initialData || getDefaultValues(schema),
    mode: "onChange",
  })

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // Handle error at the form level
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Form submission error in dynamic shard form", 3, {
        errorMessage: errorObj.message,
        shardTypeId: shardType.id,
      })
    }
  }

  const isReadOnly = mode === "view" || readOnly

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* External errors display */}
        {externalErrors && Object.keys(externalErrors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {Object.entries(externalErrors).map(([field, message]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Form fields */}
        <div className={cn(
          columns === 2 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"
        )}>
          {renderFields(schema, form, {
            isReadOnly,
            showRequiredIndicator,
            compact,
            t,
          })}
        </div>

        {/* Form actions */}
        {!isReadOnly && (
          <>
            <Separator />
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting || form.formState.isSubmitting}
                >
                  {cancelLabel || t('common:cancel' as any)}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || form.formState.isSubmitting || !form.formState.isDirty}
              >
                {(isSubmitting || form.formState.isSubmitting) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {submitLabel || (mode === "create" ? t('shards:form.createShard' as any) : t('shards:form.update' as any))}
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  )
}

/**
 * Convert JSON Schema to Zod validation schema
 */
function jsonSchemaToZod(schema: JsonSchema): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  const shape: Record<string, z.ZodType<unknown>> = {}
  const properties = schema.properties || {}

  Object.entries(properties).forEach(([key, prop]) => {
    let zodType: z.ZodType<unknown>

    switch (prop.type) {
      case "string":
        zodType = buildStringSchema(prop)
        break

      case "number":
      case "integer":
        zodType = buildNumberSchema(prop)
        break

      case "boolean":
        zodType = z.boolean()
        break

      case "array":
        zodType = buildArraySchema(prop)
        break

      case "object":
        if (prop.properties) {
          zodType = jsonSchemaToZod(prop as JsonSchema)
        } else {
          zodType = z.record(z.string(), z.unknown())
        }
        break

      default:
        zodType = z.unknown()
    }

    // Make field optional if not in required array
    if (!schema.required?.includes(key)) {
      zodType = zodType.optional()
    }

    shape[key] = zodType
  })

  return z.object(shape)
}

function buildStringSchema(prop: JsonSchemaProperty): z.ZodString | z.ZodEffects<z.ZodString, string, string> {
  let zodType = z.string()

  if (prop.minLength !== undefined) {
    zodType = zodType.min(prop.minLength, `Minimum ${prop.minLength} characters required`)
  }
  if (prop.maxLength !== undefined) {
    zodType = zodType.max(prop.maxLength, `Maximum ${prop.maxLength} characters allowed`)
  }

  // Handle special formats
  switch (prop.format) {
    case "email":
      return z.string().email("Invalid email address")
    case "url":
    case "uri":
      return z.string().url("Invalid URL")
    case "uuid":
      return z.string().uuid("Invalid UUID")
    default:
      break
  }

  // Handle pattern validation
  if (prop.pattern) {
    return zodType.regex(new RegExp(prop.pattern), `Must match pattern: ${prop.pattern}`)
  }

  return zodType
}

function buildNumberSchema(prop: JsonSchemaProperty): z.ZodNumber {
  let zodType = z.number()

  if (prop.minimum !== undefined) {
    zodType = zodType.min(prop.minimum, `Minimum value is ${prop.minimum}`)
  }
  if (prop.maximum !== undefined) {
    zodType = zodType.max(prop.maximum, `Maximum value is ${prop.maximum}`)
  }
  if (prop.type === "integer") {
    zodType = zodType.int("Must be a whole number" as any)
  }

  return zodType
}

function buildArraySchema(prop: JsonSchemaProperty): z.ZodArray<z.ZodType<unknown>> {
  let itemSchema: z.ZodType<unknown> = z.unknown()

  if (prop.items) {
    switch (prop.items.type) {
      case "string":
        itemSchema = z.string()
        break
      case "number":
        itemSchema = z.number()
        break
      case "boolean":
        itemSchema = z.boolean()
        break
      default:
        itemSchema = z.unknown()
    }
  }

  let zodType = z.array(itemSchema)

  if (prop.minItems) {
    zodType = zodType.min(prop.minItems, `At least ${prop.minItems} items required`)
  }
  if (prop.maxItems) {
    zodType = zodType.max(prop.maxItems, `Maximum ${prop.maxItems} items allowed`)
  }

  return zodType
}

/**
 * Generate default values from JSON Schema
 */
function getDefaultValues(schema: JsonSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  const properties = schema.properties || {}

  Object.entries(properties).forEach(([key, prop]) => {
    if (prop.default !== undefined) {
      defaults[key] = prop.default
    } else {
      switch (prop.type) {
        case "string":
          defaults[key] = ""
          break
        case "number":
        case "integer":
          defaults[key] = undefined
          break
        case "boolean":
          defaults[key] = false
          break
        case "array":
          defaults[key] = []
          break
        case "object":
          defaults[key] = prop.properties ? getDefaultValues(prop as JsonSchema) : {}
          break
        default:
          defaults[key] = undefined
      }
    }
  })

  return defaults
}

interface RenderFieldsOptions {
  isReadOnly: boolean
  showRequiredIndicator: boolean
  compact: boolean
  t: (key: string) => string
}

/**
 * Render form fields based on JSON Schema properties
 */
function renderFields(
  schema: JsonSchema,
  form: UseFormReturn<Record<string, unknown>>,
  options: RenderFieldsOptions
) {
  const properties = schema.properties || {}

  return Object.entries(properties).map(([key, prop]) => {
    const label = prop.title || formatLabel(key)
    const description = prop.description || prop["ui:help"]
    const isRequired = schema.required?.includes(key)
    const placeholder = prop["ui:placeholder"] || prop.placeholder

    // Read-only mode
    if (options.isReadOnly) {
      return renderReadOnlyField(key, prop, label, form, options)
    }

    return (
      <FormField
        key={key}
        control={form.control}
        name={key as Path<Record<string, unknown>>}
        render={({ field }) => (
          <FormItem className={options.compact ? "space-y-1" : undefined}>
            <FormLabel className="flex items-center gap-2">
              {label}
              {options.showRequiredIndicator && isRequired && (
                <span className="text-destructive">*</span>
              )}
              {description && !options.compact && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p>{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </FormLabel>
            <FormControl>
              {renderFieldInput(prop, field, { placeholder, isReadOnly: prop.readOnly || false })}
            </FormControl>
            {description && options.compact && (
              <FormDescription>{description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    )
  })
}

/**
 * Render read-only field display
 */
function renderReadOnlyField(
  key: string,
  prop: JsonSchemaProperty,
  label: string,
  form: UseFormReturn<Record<string, unknown>>,
  options: RenderFieldsOptions
) {
  const value = form.getValues(key as Path<Record<string, unknown>>)

  return (
    <div key={key} className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">
        {formatReadOnlyValue(value, prop)}
      </div>
    </div>
  )
}

/**
 * Format value for read-only display
 */
function formatReadOnlyValue(value: unknown, prop: JsonSchemaProperty): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">—</span>
  }

  switch (prop.type) {
    case "boolean":
      return value ? (
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
          <Check className="h-3 w-3 mr-1" /> Yes
        </Badge>
      ) : (
        <Badge variant="secondary">
          <X className="h-3 w-3 mr-1" /> No
        </Badge>
      )

    case "array":
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item, i) => (
              <Badge key={i} variant="outline">
                {String(item)}
              </Badge>
            ))}
          </div>
        )
      }
      return String(value)

    case "object":
      return (
        <Card>
          <CardContent className="p-3">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )

    default:
      // Handle enum with labels
      if (prop.enum && prop.enumLabels) {
        const index = prop.enum.indexOf(String(value))
        if (index !== -1 && prop.enumLabels[index]) {
          return prop.enumLabels[index]
        }
      }
      return String(value)
  }
}

/**
 * Render appropriate input component based on field type
 */
function renderFieldInput(
  prop: JsonSchemaProperty,
  field: { value: unknown; onChange: (value: unknown) => void; onBlur: () => void; name: string },
  options: { placeholder?: string; isReadOnly: boolean }
): React.ReactNode {
  const { type, format: schemaFormat, enum: enumValues, enumLabels, maxLength } = prop
  const widget = prop["ui:widget"]

  // Disabled if read-only
  const disabled = options.isReadOnly || prop.readOnly

  // Check for custom widget first
  if (widget) {
    switch (widget) {
      case "textarea":
        return (
          <Textarea
            {...field}
            value={field.value as string}
            placeholder={options.placeholder}
            rows={6}
            disabled={disabled}
            className="resize-y"
          />
        )
      case "switch":
        return (
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
              disabled={disabled}
              id={field.name}
            />
            <label htmlFor={field.name} className="text-sm">
              {prop.checkboxLabel || "Enable"}
            </label>
          </div>
        )
      case "hidden":
        return <input type="hidden" {...field} value={field.value as string} />
      case "tiptap":
        return (
          <div className="min-h-[200px] border rounded-md">
            <TipTapEditor
              content={field.value as (string | object)}
              onChange={field.onChange}
              editable={!disabled}
              placeholder={options.placeholder}
              outputFormat={prop.type === 'object' ? 'json' : 'html'}
              minHeight="200px"
            />
          </div>
        )
    }
  }

  switch (type) {
    case "string":
      // Enum select
      if (enumValues && Array.isArray(enumValues)) {
        return (
          <Select
            value={field.value as string}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={options.placeholder || `Select ${prop.title || "option"}`} />
            </SelectTrigger>
            <SelectContent>
              {enumValues.map((option, index) => (
                <SelectItem key={option} value={option}>
                  {enumLabels?.[index] || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      // Textarea for long text
      if (schemaFormat === "textarea" || (maxLength && maxLength > 200)) {
        return (
          <Textarea
            {...field}
            value={field.value as string}
            placeholder={options.placeholder}
            rows={schemaFormat === "textarea" ? 6 : 3}
            disabled={disabled}
            className="resize-y"
          />
        )
      }

      // Date input
      if (schemaFormat === "date") {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !field.value && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                {field.value ? (
                  format(new Date(field.value as string), "PPP")
                ) : (
                  <span>{options.placeholder || "Pick a date"}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value as string) : undefined}
                onSelect={(date) => field.onChange(date?.toISOString().split("T" as any)[0])}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      }

      // Date-time input
      if (schemaFormat === "date-time") {
        return (
          <Input
            {...field}
            value={field.value as string}
            type="datetime-local"
            disabled={disabled}
          />
        )
      }

      // Time input
      if (schemaFormat === "time") {
        return (
          <Input
            {...field}
            value={field.value as string}
            type="time"
            disabled={disabled}
          />
        )
      }

      // Email input
      if (schemaFormat === "email") {
        return (
          <Input
            {...field}
            value={field.value as string}
            type="email"
            placeholder={options.placeholder || "email@example.com"}
            disabled={disabled}
          />
        )
      }

      // URL input
      if (schemaFormat === "url" || schemaFormat === "uri") {
        return (
          <Input
            {...field}
            value={field.value as string}
            type="url"
            placeholder={options.placeholder || "https://example.com"}
            disabled={disabled}
          />
        )
      }

      // Password input
      if (schemaFormat === "password") {
        return (
          <Input
            {...field}
            value={field.value as string}
            type="password"
            placeholder={options.placeholder}
            disabled={disabled}
          />
        )
      }

      // Color input
      if (schemaFormat === "color") {
        return (
          <div className="flex items-center gap-2">
            <Input
              {...field}
              value={field.value as string}
              type="color"
              className="w-12 h-10 p-1 cursor-pointer"
              disabled={disabled}
            />
            <Input
              {...field}
              value={field.value as string}
              placeholder="#000000"
              className="flex-1"
              disabled={disabled}
            />
          </div>
        )
      }

      // Default text input
      return (
        <Input
          {...field}
          value={field.value as string}
          type="text"
          placeholder={options.placeholder}
          maxLength={maxLength}
          disabled={disabled}
        />
      )

    case "number":
    case "integer":
      return (
        <Input
          {...field}
          value={field.value === undefined ? "" : String(field.value)}
          type="number"
          step={type === "integer" ? 1 : "any"}
          min={prop.minimum}
          max={prop.maximum}
          placeholder={options.placeholder}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value
            field.onChange(value === "" ? undefined : Number(value))
          }}
        />
      )

    case "boolean":
      return (
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            checked={field.value as boolean}
            onCheckedChange={field.onChange}
            disabled={disabled}
            id={field.name}
          />
          <label
            htmlFor={field.name}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {prop.checkboxLabel || "Enable"}
          </label>
        </div>
      )

    case "array":
      // For string arrays, use tag-like input
      if (prop.items?.type === "string") {
        return (
          <div className="space-y-2">
            <Input
              placeholder={options.placeholder || "Type and press Enter to add"}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const input = e.currentTarget
                  const value = input.value.trim()
                  if (value) {
                    const currentArray = (field.value as string[]) || []
                    if (!currentArray.includes(value)) {
                      field.onChange([...currentArray, value])
                    }
                    input.value = ""
                  }
                }
              }}
            />
            {Array.isArray(field.value) && field.value.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(field.value as string[]).map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {item}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => {
                          const newArray = [...(field.value as string[])]
                          newArray.splice(index, 1)
                          field.onChange(newArray)
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )
      }

      // For other arrays, fallback to comma-separated
      return (
        <Input
          placeholder={options.placeholder || "Comma-separated values"}
          disabled={disabled}
          value={Array.isArray(field.value) ? (field.value as string[]).join(", ") : ""}
          onChange={(e) => {
            const values = e.target.value
              .split("," as any)
              .map((v) => v.trim())
              .filter(Boolean)
            field.onChange(values)
          }}
        />
      )

    default:
      return (
        <Input
          {...field}
          value={field.value as string}
          placeholder={options.placeholder}
          disabled={disabled}
        />
      )
  }
}

/**
 * Format camelCase or snake_case to Title Case
 */
function formatLabel(key: string): string {
  return key
    // Handle camelCase
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Handle snake_case
    .replace(/_/g, " ")
    // Capitalize first letter of each word
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default DynamicShardForm
