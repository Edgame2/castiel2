"use client"

import * as React from "react"
import { useForm, FormProvider, UseFormReturn, FieldValues, DefaultValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z, ZodSchema } from "zod"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Form } from "@/components/ui/form"

// Types
import type {
  RichFieldDefinition,
  RichSchemaDefinition,
  FormLayoutConfig,
  FormGroup,
  FieldDesignConfig,
  VisibilityCondition,
  SelectOption,
  DEFAULT_FORM_LAYOUT,
} from "@castiel/shared-types"

// Field Renderer
import { FieldRenderer } from "./field-renderer"
import { trackException, trackTrace } from '@/lib/monitoring/app-insights'

// ============================================================================
// Types
// ============================================================================

export interface DynamicFormProps<T extends FieldValues = FieldValues> {
  /** Schema definition with fields and layout */
  schema: RichSchemaDefinition
  /** Initial form values */
  defaultValues?: DefaultValues<T>
  /** Submit handler */
  onSubmit: (data: T) => Promise<void> | void
  /** Cancel handler */
  onCancel?: () => void
  /** Submit button label */
  submitLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Show cancel button */
  showCancel?: boolean
  /** Form is submitting */
  isSubmitting?: boolean
  /** Form is disabled */
  disabled?: boolean
  /** Read-only mode */
  readOnly?: boolean
  /** Options for select fields (keyed by field name) */
  fieldOptions?: Record<string, SelectOption[]>
  /** Additional form validation schema */
  validationSchema?: ZodSchema
  /** Hide form buttons */
  hideButtons?: boolean
  /** Additional class name */
  className?: string
  /** Form ID */
  id?: string
  /** Render custom actions */
  renderActions?: (form: UseFormReturn<T>) => React.ReactNode
}

// ============================================================================
// Schema Generator
// ============================================================================

function generateZodSchema(fields: RichFieldDefinition[]): ZodSchema {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny

    switch (field.type) {
      case "text":
      case "textarea":
      case "richtext":
      case "email":
      case "url":
      case "phone":
        fieldSchema = z.string()
        if (field.type === "email") {
          fieldSchema = z.string().email("Invalid email address")
        }
        if (field.type === "url") {
          fieldSchema = z.string().url("Invalid URL")
        }
        break

      case "select":
        fieldSchema = z.string()
        break

      case "multiselect":
        fieldSchema = z.array(z.string())
        break

      case "date":
      case "datetime":
        fieldSchema = z.string().or(z.date())
        break

      case "daterange":
        fieldSchema = z.object({
          from: z.date().optional(),
          to: z.date().optional(),
        })
        break

      case "integer":
        fieldSchema = z.number().int()
        break

      case "float":
      case "currency":
      case "percentage":
        fieldSchema = z.number()
        break

      case "boolean":
        fieldSchema = z.boolean()
        break

      case "user":
      case "shard":
        fieldSchema = z.string().or(z.array(z.string()))
        break

      case "file":
      case "image":
        fieldSchema = z.any()
        break

      default:
        fieldSchema = z.any()
    }

    // Handle required/optional
    if (!field.required) {
      fieldSchema = fieldSchema.optional().nullable()
    }

    shape[field.name] = fieldSchema
  }

  return z.object(shape)
}

// ============================================================================
// Visibility Check
// ============================================================================

function checkVisibility(
  condition: VisibilityCondition | undefined,
  formValues: Record<string, unknown>
): boolean {
  if (!condition) return true

  const fieldValue = formValues[condition.field]

  switch (condition.condition) {
    case "equals":
      return fieldValue === condition.value
    case "notEquals":
      return fieldValue !== condition.value
    case "contains":
      if (typeof fieldValue === "string") {
        return fieldValue.includes(String(condition.value))
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(condition.value)
      }
      return false
    case "isEmpty":
      return fieldValue === null || fieldValue === undefined || fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
    case "isNotEmpty":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "" &&
        (!Array.isArray(fieldValue) || fieldValue.length > 0)
    case "greaterThan":
      return typeof fieldValue === "number" && fieldValue > Number(condition.value)
    case "lessThan":
      return typeof fieldValue === "number" && fieldValue < Number(condition.value)
    default:
      return true
  }
}

// ============================================================================
// Grid Layout Helpers
// ============================================================================

function getGridColumnClass(columns: number): string {
  const columnMap: Record<number, string> = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
    5: "col-span-5",
    6: "col-span-6",
    7: "col-span-7",
    8: "col-span-8",
    9: "col-span-9",
    10: "col-span-10",
    11: "col-span-11",
    12: "col-span-12",
  }
  return columnMap[columns] || "col-span-12"
}

function getResponsiveClasses(design: FieldDesignConfig): string {
  const classes: string[] = []

  // Base columns
  classes.push(getGridColumnClass(design.grid?.columns || 12))

  // Tablet override
  if (design.responsive?.tablet?.columns) {
    classes.push(`md:${getGridColumnClass(design.responsive.tablet.columns)}`)
  }

  // Mobile override (always full width on mobile by default)
  const mobileColumns = design.responsive?.mobile?.columns ?? 12
  classes.push(`sm:${getGridColumnClass(mobileColumns)}`)

  return classes.join(" ")
}

// ============================================================================
// Form Group Component
// ============================================================================

interface FormGroupContainerProps {
  group: FormGroup
  children: React.ReactNode
}

function FormGroupContainer({ group, children }: FormGroupContainerProps) {
  const [isOpen, setIsOpen] = React.useState(!group.defaultCollapsed)

  if (group.collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={cn(group.bordered && "border", group.className)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {group.icon && <span className="text-lg">{group.icon}</span>}
                <div>
                  <CardTitle className="text-base">{group.label}</CardTitle>
                  {group.description && (
                    <CardDescription>{group.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>{children}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    )
  }

  return (
    <Card className={cn(group.bordered !== false && "border", group.className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {group.icon && <span className="text-lg">{group.icon}</span>}
          <div>
            <CardTitle className="text-base">{group.label}</CardTitle>
            {group.description && (
              <CardDescription>{group.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DynamicForm<T extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  showCancel = true,
  isSubmitting = false,
  disabled = false,
  readOnly = false,
  fieldOptions = {},
  validationSchema,
  hideButtons = false,
  className,
  id,
  renderActions,
}: DynamicFormProps<T>) {
  // Generate validation schema if not provided
  const zodSchema = React.useMemo(() => {
    return validationSchema || generateZodSchema(schema.fields)
  }, [validationSchema, schema.fields])

  // Initialize form
  const form = useForm<T>({
    resolver: (zodResolver as any)(zodSchema),
    defaultValues: defaultValues as DefaultValues<T>,
    mode: "onChange",
  })

  // Watch all values for conditional visibility
  const formValues = form.watch()

  // Get layout configuration
  const layout = schema.formLayout || {
    grid: { columns: 12, gap: 24 },
    groups: [],
  }

  // Organize fields by group
  const fieldsByGroup = React.useMemo(() => {
    const groups = new Map<string | undefined, RichFieldDefinition[]>()

    // Initialize with configured groups
    if (layout.groups) {
      for (const group of layout.groups) {
        groups.set(group.id, [])
      }
    }
    groups.set(undefined, []) // Ungrouped fields

    // Sort fields by order if specified
    const sortedFields = [...schema.fields].sort((a, b) => {
      const orderA = a.design?.grid?.order ?? 999
      const orderB = b.design?.grid?.order ?? 999
      return orderA - orderB
    })

    // Assign fields to groups
    for (const field of sortedFields) {
      const groupId = field.design?.group
      if (groupId && groups.has(groupId)) {
        groups.get(groupId)!.push(field)
      } else {
        groups.get(undefined)!.push(field)
      }
    }

    return groups
  }, [schema.fields, layout.groups])

  // Handle form submission
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      trackException(errorObj, 3)
      trackTrace("Form submission error", 3, {
        errorMessage: errorObj.message,
      })
    }
  })

  // Render a single field
  const renderField = (field: RichFieldDefinition) => {
    // Check visibility condition
    const isVisible = checkVisibility(field.design?.visibility, formValues as Record<string, unknown>)
    if (!isVisible) return null

    // Get design config or defaults
    const design: FieldDesignConfig = field.design || {
      grid: { columns: 12 },
    }

    return (
      <div
        key={field.name}
        className={cn(getResponsiveClasses(design), design.className)}
      >
        <FieldRenderer<T>
          field={field}
          name={field.name as any}
          options={fieldOptions[field.name]}
          disabled={disabled || isSubmitting}
          readOnly={readOnly}
        />
      </div>
    )
  }

  // Render fields grid
  const renderFieldsGrid = (fields: RichFieldDefinition[]) => (
    <div
      className="grid gap-6"
      style={{
        gridTemplateColumns: `repeat(${layout.grid?.columns || 12}, minmax(0, 1fr))`,
        gap: layout.grid?.gap,
        rowGap: layout.grid?.rowGap ?? layout.grid?.gap,
      }}
    >
      {fields.map(renderField)}
    </div>
  )

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          id={id}
          onSubmit={handleSubmit}
          className={cn("space-y-6", className)}
          style={{
            maxWidth: layout.maxWidth,
            padding: layout.padding,
          }}
        >
          {/* Render grouped fields */}
          {layout.groups && layout.groups.length > 0 && (
            <div className="space-y-6">
              {layout.groups.map((group) => {
                const groupFields = fieldsByGroup.get(group.id) || []
                if (groupFields.length === 0) return null

                return (
                  <FormGroupContainer key={group.id} group={group}>
                    {renderFieldsGrid(groupFields)}
                  </FormGroupContainer>
                )
              })}
            </div>
          )}

          {/* Render ungrouped fields */}
          {fieldsByGroup.get(undefined)?.length ? (
            <div
              className={cn(
                layout.groups && layout.groups.length > 0 && "mt-6"
              )}
            >
              {renderFieldsGrid(fieldsByGroup.get(undefined) || [])}
            </div>
          ) : null}

          {/* Form actions */}
          {!hideButtons && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {showCancel && onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </Button>
              )}
              {renderActions ? (
                renderActions(form)
              ) : (
                <Button
                  type="submit"
                  disabled={disabled || isSubmitting || readOnly}
                >
                  {isSubmitting ? "Saving..." : submitLabel}
                </Button>
              )}
            </div>
          )}
        </form>
      </Form>
    </FormProvider>
  )
}

// ============================================================================
// Controlled Form Variant
// ============================================================================

export interface ControlledDynamicFormProps<T extends FieldValues = FieldValues>
  extends Omit<DynamicFormProps<T>, "defaultValues" | "onSubmit"> {
  /** External form instance */
  form: UseFormReturn<T>
  /** Form submission is handled externally */
  onSubmit?: (data: T) => Promise<void> | void
}

export function ControlledDynamicForm<T extends FieldValues = FieldValues>({
  form,
  schema,
  onSubmit,
  disabled = false,
  readOnly = false,
  fieldOptions = {},
  className,
  id,
}: ControlledDynamicFormProps<T>) {
  // Watch all values for conditional visibility
  const formValues = form.watch()

  // Get layout configuration
  const layout = schema.formLayout || {
    grid: { columns: 12, gap: 24 },
    groups: [],
  }

  // Organize fields by group
  const fieldsByGroup = React.useMemo(() => {
    const groups = new Map<string | undefined, RichFieldDefinition[]>()

    if (layout.groups) {
      for (const group of layout.groups) {
        groups.set(group.id, [])
      }
    }
    groups.set(undefined, [])

    const sortedFields = [...schema.fields].sort((a, b) => {
      const orderA = a.design?.grid?.order ?? 999
      const orderB = b.design?.grid?.order ?? 999
      return orderA - orderB
    })

    for (const field of sortedFields) {
      const groupId = field.design?.group
      if (groupId && groups.has(groupId)) {
        groups.get(groupId)!.push(field)
      } else {
        groups.get(undefined)!.push(field)
      }
    }

    return groups
  }, [schema.fields, layout.groups])

  const renderField = (field: RichFieldDefinition) => {
    const isVisible = checkVisibility(field.design?.visibility, formValues as Record<string, unknown>)
    if (!isVisible) return null

    const design: FieldDesignConfig = field.design || { grid: { columns: 12 } }

    return (
      <div key={field.name} className={cn(getResponsiveClasses(design), design.className)}>
        <FieldRenderer<T>
          field={field}
          name={field.name as any}
          options={fieldOptions[field.name]}
          disabled={disabled}
          readOnly={readOnly}
        />
      </div>
    )
  }

  const renderFieldsGrid = (fields: RichFieldDefinition[]) => (
    <div
      className="grid gap-6"
      style={{
        gridTemplateColumns: `repeat(${layout.grid?.columns || 12}, minmax(0, 1fr))`,
        gap: layout.grid?.gap,
        rowGap: layout.grid?.rowGap ?? layout.grid?.gap,
      }}
    >
      {fields.map(renderField)}
    </div>
  )

  return (
    <FormProvider {...form}>
      <div id={id} className={cn("space-y-6", className)}>
        {layout.groups && layout.groups.length > 0 && (
          <div className="space-y-6">
            {layout.groups.map((group) => {
              const groupFields = fieldsByGroup.get(group.id) || []
              if (groupFields.length === 0) return null

              return (
                <FormGroupContainer key={group.id} group={group}>
                  {renderFieldsGrid(groupFields)}
                </FormGroupContainer>
              )
            })}
          </div>
        )}

        {fieldsByGroup.get(undefined)?.length ? (
          <div className={cn(layout.groups && layout.groups.length > 0 && "mt-6")}>
            {renderFieldsGrid(fieldsByGroup.get(undefined) || [])}
          </div>
        ) : null}
      </div>
    </FormProvider>
  )
}

export default DynamicForm











