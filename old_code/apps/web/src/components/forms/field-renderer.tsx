"use client"

import * as React from "react"
import { useFormContext, Controller, FieldValues, Path } from "react-hook-form"
import { format, parseISO, isValid } from "date-fns"
import { CalendarIcon, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// UI Components
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Custom Components
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { MultiSelect, type SelectOption } from "@/components/ui/multi-select"
import { NumberInput, CurrencyInput, PercentageInput } from "@/components/ui/number-input"
import { DateRangePicker, type DateRangeValue } from "@/components/ui/date-range-picker"
import { UserPicker } from "@/components/ui/user-picker"
import { ShardPicker } from "@/components/ui/shard-picker"
import { FileFieldRenderer } from "./file-field-renderer"

// Types
import type {
  RichFieldDefinition,
  RichFieldType,
  FieldTypeConfig,
  TextFieldConfig,
  TextareaFieldConfig,
  RichTextFieldConfig,
  SelectFieldConfig,
  MultiselectFieldConfig,
  DateFieldConfig,
  DateTimeFieldConfig,
  DateRangeFieldConfig,
  IntegerFieldConfig,
  FloatFieldConfig,
  CurrencyFieldConfig,
  PercentageFieldConfig,
  BooleanFieldConfig,
  EmailFieldConfig,
  UrlFieldConfig,
  PhoneFieldConfig,
  UserRefFieldConfig,
  ShardRefFieldConfig,
  FieldDesignConfig,
} from "@castiel/shared-types"

// ============================================================================
// Types
// ============================================================================

export interface FieldRendererProps<T extends FieldValues = FieldValues> {
  /** Field definition */
  field: RichFieldDefinition
  /** Form field name (path) */
  name: Path<T>
  /** Additional options for select fields */
  options?: SelectOption[]
  /** Disabled state */
  disabled?: boolean
  /** Read-only state */
  readOnly?: boolean
  /** Hide label */
  hideLabel?: boolean
  /** Override label */
  label?: string
  /** Additional class name */
  className?: string
  /** Callback when "Create new" is clicked (for shard reference fields) */
  onCreateNew?: () => void
}

// ============================================================================
// Field Wrapper with Label
// ============================================================================

interface FieldWrapperProps {
  field: RichFieldDefinition
  children: React.ReactNode
  hideLabel?: boolean
  label?: string
  className?: string
}

function FieldWrapper({
  field,
  children,
  hideLabel,
  label,
  className,
}: FieldWrapperProps) {
  const design = field.design
  const showLabel = !hideLabel && !design?.hideLabel
  const displayLabel = label || field.label
  const labelPosition = design?.labelPosition || "top"

  return (
    <div
      className={cn(
        "space-y-2",
        labelPosition === "left" && "flex items-start gap-4",
        className
      )}
    >
      {showLabel && (
        <div
          className={cn(
            "flex items-center gap-1",
            labelPosition === "left" && "w-1/3 pt-2"
          )}
        >
          <Label className={cn(field.required && "after:content-['*'] after:text-destructive after:ml-0.5")}>
            {displayLabel}
          </Label>
          {design?.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{design.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      <div className={cn(labelPosition === "left" && "flex-1")}>
        {children}
        {design?.helpText && (
          <p className="text-xs text-muted-foreground mt-1">{design.helpText}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Text Field Renderer
// ============================================================================

function TextFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as TextFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormControl>
            <div className="relative">
              {config.prefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {config.prefix}
                </span>
              )}
              <Input
                {...formField}
                value={formField.value ?? ""}
                placeholder={config.placeholder}
                disabled={disabled}
                readOnly={readOnly}
                maxLength={config.maxLength}
                className={cn(
                  config.prefix && "pl-8",
                  config.suffix && "pr-8"
                )}
              />
              {config.suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {config.suffix}
                </span>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Textarea Field Renderer
// ============================================================================

function TextareaFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as TextareaFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormControl>
            <div className="relative">
              <Textarea
                {...formField}
                value={formField.value ?? ""}
                placeholder={config.placeholder}
                disabled={disabled}
                readOnly={readOnly}
                rows={config.rows || 4}
                maxLength={config.maxLength}
                className={cn(config.autoResize && "resize-none")}
              />
              {config.showCharCount && config.maxLength && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {(formField.value?.length || 0).toLocaleString()} / {config.maxLength.toLocaleString()}
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Rich Text Field Renderer
// ============================================================================

function RichTextFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as RichTextFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <RichTextEditor
              value={formField.value ?? ""}
              onChange={formField.onChange}
              onBlur={formField.onBlur}
              toolbar={config.toolbar}
              customToolbar={config.customToolbar as unknown as (string | Record<string, unknown>)[][]}
              placeholder={config.placeholder}
              minHeight={config.minHeight}
              maxHeight={config.maxHeight}
              maxSize={config.maxSize}
              readOnly={readOnly}
              disabled={disabled}
              error={!!fieldState.error}
              showCount
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Select Field Renderer
// ============================================================================

function SelectFieldRenderer<T extends FieldValues>({
  field,
  name,
  options,
  disabled,
}: {
  field: RichFieldDefinition
  name: Path<T>
  options?: SelectOption[]
  disabled?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as SelectFieldConfig

  // Use provided options or config options
  const selectOptions = options || config.options || []

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormControl>
            <Select
              value={formField.value ?? ""}
              onValueChange={formField.onChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={config.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon && (
                        <span>{option.icon}</span>
                      )}
                      {option.color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Multi-Select Field Renderer
// ============================================================================

function MultiselectFieldRenderer<T extends FieldValues>({
  field,
  name,
  options,
  disabled,
}: {
  field: RichFieldDefinition
  name: Path<T>
  options?: SelectOption[]
  disabled?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as MultiselectFieldConfig

  // Use provided options or config options
  const selectOptions = options || config.options || []

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <MultiSelect
              options={selectOptions}
              value={formField.value ?? []}
              onChange={formField.onChange}
              searchable={config.searchable}
              searchThreshold={config.searchThreshold}
              minSelection={config.minSelection}
              maxSelection={config.maxSelection}
              placeholder={config.placeholder}
              displayAs={config.displayAs === "list" ? "tags" : config.displayAs}
              tagColor={config.tagColor === "auto" ? "secondary" : config.tagColor}
              disabled={disabled}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Date Field Renderer
// ============================================================================

function DateFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as DateFieldConfig

  // Parse min/max dates
  const minDate = React.useMemo(() => {
    if (!config.minDate) return undefined
    if (config.minDate === "today") return new Date()
    return parseISO(config.minDate)
  }, [config.minDate])

  const maxDate = React.useMemo(() => {
    if (!config.maxDate) return undefined
    if (config.maxDate === "today") return new Date()
    return parseISO(config.maxDate)
  }, [config.maxDate])

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => {
        const dateValue = formField.value
          ? typeof formField.value === "string"
            ? parseISO(formField.value)
            : formField.value
          : undefined

        return (
          <FormItem>
            <FormControl>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateValue && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue && isValid(dateValue)
                      ? format(dateValue, "PPP")
                      : config.placeholder || "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={(date) => {
                      formField.onChange(date?.toISOString())
                    }}
                    disabled={(date) => {
                      if (minDate && date < minDate) return true
                      if (maxDate && date > maxDate) return true
                      if (config.disabledDaysOfWeek?.includes(date.getDay())) return true
                      return false
                    }}
                    showWeekNumber={config.showWeekNumbers}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

// ============================================================================
// Date Range Field Renderer
// ============================================================================

function DateRangeFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as DateRangeFieldConfig

  const minDate = config.minDate === "today" ? new Date() : config.minDate ? parseISO(config.minDate) : undefined
  const maxDate = config.maxDate ? parseISO(config.maxDate) : undefined

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <DateRangePicker
              value={formField.value as DateRangeValue | undefined}
              onChange={formField.onChange}
              minDate={minDate}
              maxDate={maxDate}
              maxRangeDays={config.maxRangeDays}
              minRangeDays={config.minRangeDays}
              allowSameDay={config.allowSameDay}
              startPlaceholder={config.startPlaceholder}
              endPlaceholder={config.endPlaceholder}
              disabled={disabled}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Number Field Renderer
// ============================================================================

function NumberFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as IntegerFieldConfig | FloatFieldConfig

  const decimalPlaces = "decimalPlaces" in config ? config.decimalPlaces : 0

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <NumberInput
              value={formField.value}
              onChange={formField.onChange}
              onBlur={formField.onBlur}
              inputType={config.inputType}
              min={config.min}
              max={config.max}
              step={config.step}
              decimalPlaces={decimalPlaces}
              showStepButtons={(config as any).showStepButtons}
              sliderMarks={(config as any).sliderMarks}
              showSliderValue={(config as any).showSliderValue}
              prefix={(config as any).prefix}
              suffix={config.suffix}
              thousandSeparator={config.thousandSeparator}
              placeholder={config.placeholder}
              disabled={disabled}
              readOnly={readOnly}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Currency Field Renderer
// ============================================================================

function CurrencyFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as CurrencyFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <CurrencyInput
              value={formField.value}
              onChange={formField.onChange}
              onBlur={formField.onBlur}
              currencyCode={config.currencyCode}
              symbolPosition={config.symbolPosition}
              min={config.min}
              max={config.max}
              thousandSeparator={config.thousandSeparator}
              placeholder={config.placeholder}
              disabled={disabled}
              readOnly={readOnly}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Percentage Field Renderer
// ============================================================================

function PercentageFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as PercentageFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <PercentageInput
              value={formField.value}
              onChange={formField.onChange}
              onBlur={formField.onBlur}
              inputType={config.inputType}
              min={config.min}
              max={config.max}
              step={config.step}
              decimalPlaces={config.decimalPlaces}
              showPercentSign={config.showPercentSign}
              placeholder={config.placeholder}
              disabled={disabled}
              readOnly={readOnly}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Boolean Field Renderer
// ============================================================================

function BooleanFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as BooleanFieldConfig
  const displayAs = config.displayAs || "switch"

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormControl>
            {displayAs === "switch" && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={formField.value ?? false}
                  onCheckedChange={formField.onChange}
                  disabled={disabled}
                />
                <span className="text-sm">
                  {formField.value
                    ? config.trueLabel || "Yes"
                    : config.falseLabel || "No"}
                </span>
              </div>
            )}
            {displayAs === "checkbox" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formField.value ?? false}
                  onCheckedChange={formField.onChange}
                  disabled={disabled}
                />
                <span className="text-sm">
                  {config.trueLabel || field.label}
                </span>
              </div>
            )}
            {displayAs === "buttons" && (
              <div className="flex gap-2">
                {config.allowNull && (
                  <Button
                    type="button"
                    variant={formField.value === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => formField.onChange(null)}
                    disabled={disabled}
                  >
                    {config.nullLabel || "Not set"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant={formField.value === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => formField.onChange(true)}
                  disabled={disabled}
                >
                  {config.trueLabel || "Yes"}
                </Button>
                <Button
                  type="button"
                  variant={formField.value === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => formField.onChange(false)}
                  disabled={disabled}
                >
                  {config.falseLabel || "No"}
                </Button>
              </div>
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Email/URL/Phone Field Renderer
// ============================================================================

function ContactFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  readOnly,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  readOnly?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as EmailFieldConfig | UrlFieldConfig | PhoneFieldConfig

  const inputType = field.type === "email" ? "email" : field.type === "url" ? "url" : "tel"
  const placeholder = "placeholder" in config ? config.placeholder : undefined

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormControl>
            <Input
              {...formField}
              value={formField.value ?? ""}
              type={inputType}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// User Reference Field Renderer
// ============================================================================

function UserFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
}) {
  const { control } = useFormContext<T>()
  const config = field.config as UserRefFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <UserPicker
              value={formField.value}
              onChange={formField.onChange}
              multiple={config.multiple}
              roles={config.roles}
              includeInactive={config.includeInactive}
              minSelection={config.minSelection}
              maxSelection={config.maxSelection}
              placeholder={config.placeholder}
              displayFormat={config.displayFormat}
              showAvatar={config.showAvatar}
              disabled={disabled}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Shard Reference Field Renderer
// ============================================================================

function ShardFieldRenderer<T extends FieldValues>({
  field,
  name,
  disabled,
  onCreateNew,
}: {
  field: RichFieldDefinition
  name: Path<T>
  disabled?: boolean
  onCreateNew?: () => void
}) {
  const { control } = useFormContext<T>()
  const config = field.config as ShardRefFieldConfig

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormControl>
            <ShardPicker
              value={formField.value}
              onChange={formField.onChange}
              shardTypeId={config.shardTypeId}
              shardTypeIds={config.shardTypeIds}
              multiple={config.multiple}
              minSelection={config.minSelection}
              maxSelection={config.maxSelection}
              statusFilter={config.filter?.status}
              placeholder={config.placeholder}
              displayField={config.displayField}
              searchFields={config.searchFields}
              showPreview={config.showPreview}
              allowCreate={config.allowCreate}
              onCreateNew={onCreateNew}
              disabled={disabled}
              error={!!fieldState.error}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// ============================================================================
// Main Field Renderer
// ============================================================================

export function FieldRenderer<T extends FieldValues>({
  field,
  name,
  options,
  disabled,
  readOnly,
  hideLabel,
  label,
  className,
  onCreateNew,
}: FieldRendererProps<T>) {
  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <TextFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "textarea":
        return (
          <TextareaFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "richtext":
        return (
          <RichTextFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "select":
        return (
          <SelectFieldRenderer field={field} name={name} options={options} disabled={disabled} />
        )
      case "multiselect":
        return (
          <MultiselectFieldRenderer field={field} name={name} options={options} disabled={disabled} />
        )
      case "date":
        return <DateFieldRenderer field={field} name={name} disabled={disabled} />
      case "datetime":
        return <DateFieldRenderer field={field} name={name} disabled={disabled} />
      case "daterange":
        return <DateRangeFieldRenderer field={field} name={name} disabled={disabled} />
      case "integer":
      case "float":
        return (
          <NumberFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "currency":
        return (
          <CurrencyFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "percentage":
        return (
          <PercentageFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "boolean":
        return <BooleanFieldRenderer field={field} name={name} disabled={disabled} />
      case "email":
      case "url":
      case "phone":
        return (
          <ContactFieldRenderer field={field} name={name} disabled={disabled} readOnly={readOnly} />
        )
      case "user":
        return <UserFieldRenderer field={field} name={name} disabled={disabled} />
      case "shard":
        return (
          <ShardFieldRenderer
            field={field}
            name={name}
            disabled={disabled}
            onCreateNew={onCreateNew}
          />
        )
      case "file":
      case "image":
        return (
          <FileFieldRenderer
            field={field}
            name={name}
            disabled={disabled}
            readOnly={readOnly}
          />
        )
      default:
        return (
          <div className="text-sm text-muted-foreground p-2 border rounded-md">
            Unsupported field type: {field.type}
          </div>
        )
    }
  }

  return (
    <FieldWrapper
      field={field}
      hideLabel={hideLabel}
      label={label}
      className={className}
    >
      {renderField()}
    </FieldWrapper>
  )
}

export default FieldRenderer

