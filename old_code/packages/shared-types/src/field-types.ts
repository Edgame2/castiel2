/**
 * Rich Field Types System
 * Comprehensive field type definitions for Shard structured data
 * 
 * @see docs/shards/field-types.md for full specification
 */

// ============================================================================
// Field Type Enum
// ============================================================================

/**
 * All available field types for Shard structured data
 */
export enum RichFieldType {
  // Text fields
  TEXT = 'text',
  TEXTAREA = 'textarea',
  RICHTEXT = 'richtext',

  // Selection fields
  SELECT = 'select',
  MULTISELECT = 'multiselect',

  // Date/Time fields
  DATE = 'date',
  DATETIME = 'datetime',
  DATERANGE = 'daterange',

  // Number fields
  INTEGER = 'integer',
  FLOAT = 'float',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',

  // Boolean field
  BOOLEAN = 'boolean',

  // Contact fields
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',

  // Reference fields
  USER = 'user',
  SHARD = 'shard',
  REFERENCE = 'reference', // Reference to another shard (alias for SHARD for clarity)

  // File fields
  FILE = 'file',
  IMAGE = 'image',

  // Structured data fields
  JSON = 'json', // JSON object/array field
}

// ============================================================================
// Select Option Types
// ============================================================================

/**
 * Option for select/multiselect fields
 */
export interface SelectOption {
  /** Stored value */
  value: string;
  /** Display text */
  label: string;
  /** Optional description shown in dropdown */
  description?: string;
  /** Icon name or emoji */
  icon?: string;
  /** Badge/tag color (hex or CSS color) */
  color?: string;
  /** Whether option is disabled */
  disabled?: boolean;
  /** Group name for grouped options */
  group?: string;
}

/**
 * Reusable option list (stored at system or tenant level)
 */
export interface OptionList {
  id: string;
  /** 'system' for global lists, tenant UUID for tenant-specific */
  tenantId: string;
  /** Unique name (e.g., "countries", "currencies") */
  name: string;
  description?: string;
  options: SelectOption[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================================================
// Field Type Configurations
// ============================================================================

/**
 * Configuration for text field
 */
export interface TextFieldConfig {
  type: RichFieldType.TEXT;
  /** Minimum character length */
  minLength?: number;
  /** Maximum character length */
  maxLength?: number;
  /** Regex pattern for validation */
  pattern?: string;
  /** Custom error message for pattern mismatch */
  patternMessage?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Prefix shown before input (e.g., "$", "@") */
  prefix?: string;
  /** Suffix shown after input (e.g., ".com", "kg") */
  suffix?: string;
  /** Input mode hint for mobile keyboards */
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'search';
}

/**
 * Configuration for textarea field
 */
export interface TextareaFieldConfig {
  type: RichFieldType.TEXTAREA;
  /** Minimum character length */
  minLength?: number;
  /** Maximum character length (recommended max: 10,000) */
  maxLength?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Number of visible rows (default: 4) */
  rows?: number;
  /** Auto-resize to fit content */
  autoResize?: boolean;
  /** Show character count indicator */
  showCharCount?: boolean;
}

/**
 * Quill.js toolbar configuration
 */
export interface QuillToolbarConfig {
  options: (string | Record<string, unknown>)[];
}

/**
 * Toolbar preset type
 */
export type ToolbarPreset = 'basic' | 'standard' | 'full' | 'custom';

/**
 * Configuration for rich text (WYSIWYG) field
 */
export interface RichTextFieldConfig {
  type: RichFieldType.RICHTEXT;
  /** Maximum content size in bytes (default: 102400 = 100KB) */
  maxSize?: number;
  /** Toolbar preset or 'custom' */
  toolbar?: ToolbarPreset;
  /** Custom toolbar configuration (when toolbar = 'custom') */
  customToolbar?: QuillToolbarConfig;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum editor height in pixels */
  minHeight?: number;
  /** Maximum editor height in pixels (enables scroll) */
  maxHeight?: number;
}

/**
 * Configuration for single select field
 */
export interface SelectFieldConfig {
  type: RichFieldType.SELECT;
  /** Inline options */
  options?: SelectOption[];
  /** Reference to reusable option list (e.g., "system:countries") */
  optionsRef?: string;
  /** Enable search (auto-enabled if options > searchThreshold) */
  searchable?: boolean;
  /** Auto-enable search above this count (default: 10) */
  searchThreshold?: number;
  /** Allow clearing selection */
  allowClear?: boolean;
  /** Default selected value */
  defaultValue?: string;
  /** Placeholder text */
  placeholder?: string;
  /** How to display selected option */
  displayFormat?: 'label' | 'value' | 'both';
  /** Legacy: allow custom values */
  allowCustom?: boolean;
  /** Legacy: default value */
  default?: any;
}

/**
 * Configuration for multi-select field
 */
export interface MultiselectFieldConfig {
  type: RichFieldType.MULTISELECT;
  /** Inline options */
  options?: SelectOption[];
  /** Reference to reusable option list */
  optionsRef?: string;
  /** Minimum required selections */
  minSelection?: number;
  /** Maximum allowed selections */
  maxSelection?: number;
  /** Enable search (auto-enabled if options > searchThreshold) */
  searchable?: boolean;
  /** Auto-enable search above this count (default: 10) */
  searchThreshold?: number;
  /** Default selected values */
  defaultValue?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** How to display selected items */
  displayAs?: 'tags' | 'chips' | 'list' | 'count';
  /** Tag color style */
  tagColor?: 'auto' | 'primary' | 'secondary';
  /** Legacy: allow custom values */
  allowCustom?: boolean;
  /** Legacy: default value */
  default?: any;
}

/**
 * Configuration for date field
 */
export interface DateFieldConfig {
  type: RichFieldType.DATE;
  /** Minimum date (ISO string, 'today', or preset) */
  minDate?: string | 'today' | 'startOfMonth' | 'startOfYear';
  /** Maximum date (ISO string, 'today', or preset) */
  maxDate?: string | 'today' | 'endOfMonth' | 'endOfYear';
  /** Specific dates to disable (ISO strings) */
  disabledDates?: string[];
  /** Days of week to disable (0-6, Sun-Sat) */
  disabledDaysOfWeek?: number[];
  /** Default value (ISO string or 'today') */
  defaultValue?: string | 'today';
  /** Placeholder text */
  placeholder?: string;
  /** Show week numbers in calendar */
  showWeekNumbers?: boolean;
  /** Highlight today's date */
  highlightToday?: boolean;
}

/**
 * Configuration for datetime field
 */
export interface DateTimeFieldConfig {
  type: RichFieldType.DATETIME;
  /** Minimum date (ISO string or 'today') */
  minDate?: string | 'today';
  /** Maximum date (ISO string) */
  maxDate?: string;
  /** Minimum time (HH:mm format) */
  minTime?: string;
  /** Maximum time (HH:mm format) */
  maxTime?: string;
  /** Time precision (default: 'minute') */
  precision?: 'minute' | 'second';
  /** Minute step for time picker (default: 15) */
  minuteStep?: number;
  /** Show timezone selector */
  showTimezone?: boolean;
  /** Default timezone (IANA, overrides tenant default) */
  defaultTimezone?: string;
  /** Store as UTC (default: true) */
  storeAsUTC?: boolean;
  /** Default value (ISO string or 'now') */
  defaultValue?: string | 'now';
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Date range preset for quick selection
 */
export interface DateRangePreset {
  label: string;
  value: {
    start: string | 'today' | 'startOfWeek' | 'startOfMonth' | 'startOfQuarter' | 'startOfYear';
    end: string | 'today' | 'endOfWeek' | 'endOfMonth' | 'endOfQuarter' | 'endOfYear';
  };
}

/**
 * Configuration for date range field
 */
export interface DateRangeFieldConfig {
  type: RichFieldType.DATERANGE;
  /** Minimum date (ISO string or 'today') */
  minDate?: string | 'today';
  /** Maximum date (ISO string) */
  maxDate?: string;
  /** Maximum span in days */
  maxRangeDays?: number;
  /** Minimum span in days */
  minRangeDays?: number;
  /** Allow start and end on same day */
  allowSameDay?: boolean;
  /** End date follows start date changes */
  linkedEndDate?: boolean;
  /** Start date placeholder */
  startPlaceholder?: string;
  /** End date placeholder */
  endPlaceholder?: string;
  /** Quick selection presets */
  presets?: DateRangePreset[];
}

/**
 * Slider mark for number fields
 */
export interface SliderMark {
  value: number;
  label: string;
}

/**
 * Configuration for integer field
 */
export interface IntegerFieldConfig {
  type: RichFieldType.INTEGER;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Input type: regular input or slider */
  inputType?: 'input' | 'slider';
  /** Step value for input arrows and slider */
  step?: number;
  /** Show +/- step buttons */
  showStepButtons?: boolean;
  /** Marks for slider (labeled points) */
  sliderMarks?: SliderMark[];
  /** Show value label while dragging slider */
  showSliderValue?: boolean;
  /** Prefix displayed before value */
  prefix?: string;
  /** Suffix displayed after value (e.g., "items") */
  suffix?: string;
  /** Use thousand separator (1,000 vs 1000) */
  thousandSeparator?: boolean;
  /** Default value */
  defaultValue?: number;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Configuration for float field
 */
export interface FloatFieldConfig {
  type: RichFieldType.FLOAT;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Number of decimal places (default: 2) */
  decimalPlaces?: number;
  /** Input type: regular input or slider */
  inputType?: 'input' | 'slider';
  /** Step value (default: 0.01) */
  step?: number;
  /** Prefix displayed before value */
  prefix?: string;
  /** Suffix displayed after value */
  suffix?: string;
  /** Use thousand separator */
  thousandSeparator?: boolean;
  /** Default value */
  defaultValue?: number;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Configuration for currency field
 */
export interface CurrencyFieldConfig {
  type: RichFieldType.CURRENCY;
  /** ISO 4217 currency code (e.g., "USD", "EUR") */
  currencyCode?: string;
  /** Field name to read currency from (for dynamic currency) */
  currencyField?: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Number of decimal places (default: 2) */
  decimalPlaces?: number;
  /** Symbol position */
  symbolPosition?: 'prefix' | 'suffix';
  /** Use thousand separator (default: true) */
  thousandSeparator?: boolean;
  /** Default value */
  defaultValue?: number;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Configuration for percentage field
 */
export interface PercentageFieldConfig {
  type: RichFieldType.PERCENTAGE;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Number of decimal places (default: 0) */
  decimalPlaces?: number;
  /** Input type: regular input or slider */
  inputType?: 'input' | 'slider';
  /** Step value */
  step?: number;
  /** Show % sign (default: true) */
  showPercentSign?: boolean;
  /** Default value */
  defaultValue?: number;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Configuration for boolean field
 */
export interface BooleanFieldConfig {
  type: RichFieldType.BOOLEAN;
  /** Default value (null = undecided) */
  defaultValue?: boolean | null;
  /** Allow null/undecided state (three-state) */
  allowNull?: boolean;
  /** Display type */
  displayAs?: 'switch' | 'checkbox' | 'buttons' | 'radio';
  /** Label when true */
  trueLabel?: string;
  /** Label when false */
  falseLabel?: string;
  /** Label when null (for three-state) */
  nullLabel?: string;
  /** Color when true (hex or CSS color) */
  activeColor?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Legacy: default value */
  default?: any;
}

/**
 * Configuration for email field
 */
export interface EmailFieldConfig {
  type: RichFieldType.EMAIL;
  /** Allowed domains whitelist */
  allowedDomains?: string[];
  /** Blocked domains blacklist */
  blockedDomains?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Make clickable mailto: link in view mode */
  showMailtoLink?: boolean;
}

/**
 * Configuration for URL field
 */
export interface UrlFieldConfig {
  type: RichFieldType.URL;
  /** Allowed protocols (default: ['http', 'https']) */
  allowedProtocols?: string[];
  /** Allowed domains whitelist */
  allowedDomains?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Make clickable link in view mode */
  showAsLink?: boolean;
  /** Show website favicon */
  showFavicon?: boolean;
}

/**
 * Configuration for phone field
 */
export interface PhoneFieldConfig {
  type: RichFieldType.PHONE;
  /** Default country (ISO 3166-1 alpha-2, e.g., "US") */
  defaultCountry?: string;
  /** Limit to specific countries */
  allowedCountries?: string[];
  /** Output format */
  format?: 'national' | 'international' | 'e164';
  /** Placeholder text */
  placeholder?: string;
  /** Show country code selector */
  showCountrySelect?: boolean;
  /** Make clickable tel: link in view mode */
  showDialLink?: boolean;
}

/**
 * Configuration for user reference field
 */
export interface UserRefFieldConfig {
  type: RichFieldType.USER;
  /** Filter by roles */
  roles?: string[];
  /** Include inactive users */
  includeInactive?: boolean;
  /** Allow selecting multiple users */
  multiple?: boolean;
  /** Minimum required selections (for multiple) */
  minSelection?: number;
  /** Maximum allowed selections (for multiple) */
  maxSelection?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Display format for selected user */
  displayFormat?: 'name' | 'email' | 'avatar' | 'full';
  /** Show user avatar */
  showAvatar?: boolean;
}

/**
 * Configuration for shard reference field
 */
export interface ShardRefFieldConfig {
  type: RichFieldType.SHARD | RichFieldType.REFERENCE;
  /** Target ShardType ID (required) */
  shardTypeId: string;
  /** Alternative: allow multiple ShardTypes */
  shardTypeIds?: string[];
  /** Allow selecting multiple shards */
  multiple?: boolean;
  /** Minimum required selections (for multiple) */
  minSelection?: number;
  /** Maximum allowed selections (for multiple) */
  maxSelection?: number;
  /** Filter shards */
  filter?: {
    /** Filter by status */
    status?: string[];
    /** Custom filter conditions */
    customFilter?: Record<string, unknown>;
  };
  /** Relationship type created when selected */
  relationshipType?: string;
  /** Create reverse relationship */
  bidirectional?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Field to display for selected shard (default: 'name') */
  displayField?: string;
  /** Fields to search when filtering */
  searchFields?: string[];
  /** Show shard preview on hover */
  showPreview?: boolean;
  /** Allow creating new shard inline */
  allowCreate?: boolean;
}

/**
 * Configuration for file upload field
 */
export interface FileFieldConfig {
  type: RichFieldType.FILE;
  /** Maximum file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Maximum number of files (for multiple uploads) */
  maxFiles?: number;
  /** Allowed MIME types or extensions */
  allowedTypes?: string[];
  /** Allow multiple files */
  multiple?: boolean;
  /** Azure blob container for storage */
  storageContainer?: string;
  /** Enable drag-drop zone */
  dragDrop?: boolean;
  /** Show file preview (for images/PDFs) */
  showPreview?: boolean;
  /** Show file size */
  showFileSize?: boolean;
}

/**
 * Configuration for image upload field
 */
export interface ImageFieldConfig {
  type: RichFieldType.IMAGE;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Required aspect ratio (e.g., "16:9", "1:1") */
  aspectRatio?: string;
  /** Allowed image formats */
  allowedFormats?: ('jpeg' | 'png' | 'gif' | 'webp')[];
  /** Allow multiple images */
  multiple?: boolean;
  /** Maximum number of images */
  maxImages?: number;
  /** Auto-resize to max dimensions */
  autoResize?: boolean;
  /** Generate thumbnail */
  generateThumbnail?: boolean;
  /** Thumbnail dimensions */
  thumbnailSize?: { width: number; height: number };
  /** Enable crop tool */
  cropEnabled?: boolean;
  /** Show image dimensions */
  showDimensions?: boolean;
}

/**
 * Configuration for JSON field
 */
export interface JsonFieldConfig {
  type: RichFieldType.JSON;
  /** JSON schema for validation */
  schema?: Record<string, unknown>;
  /** Placeholder text */
  placeholder?: string;
  /** Show formatted JSON editor */
  showEditor?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Default value */
  defaultValue?: Record<string, unknown> | unknown[];
}

/**
 * Union type of all field configurations
 */
export type FieldTypeConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | RichTextFieldConfig
  | SelectFieldConfig
  | MultiselectFieldConfig
  | DateFieldConfig
  | DateTimeFieldConfig
  | DateRangeFieldConfig
  | IntegerFieldConfig
  | FloatFieldConfig
  | CurrencyFieldConfig
  | PercentageFieldConfig
  | BooleanFieldConfig
  | EmailFieldConfig
  | UrlFieldConfig
  | PhoneFieldConfig
  | UserRefFieldConfig
  | ShardRefFieldConfig
  | FileFieldConfig
  | ImageFieldConfig
  | JsonFieldConfig;

// ============================================================================
// Design Configuration
// ============================================================================

/**
 * Visibility condition for conditional field display
 */
export interface VisibilityCondition {
  /** Condition type */
  condition: 'equals' | 'notEquals' | 'contains' | 'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan';
  /** Field to check */
  field: string;
  /** Value to compare (not needed for isEmpty/isNotEmpty) */
  value?: unknown;
}

/**
 * Grid configuration for field layout
 */
export interface FieldGridConfig {
  /** Number of columns to span (1-12) */
  columns: number;
  /** Order in form (lower = first) */
  order?: number;
}

/**
 * Responsive grid overrides
 */
export interface ResponsiveGridConfig {
  /** Tablet breakpoint (< 1024px) */
  tablet?: { columns: number };
  /** Mobile breakpoint (< 640px) */
  mobile?: { columns: number };
}

/**
 * Design configuration for a field
 */
export interface FieldDesignConfig {
  /** Grid positioning (12-column grid) */
  grid?: FieldGridConfig;
  /** Direct column count (legacy support) */
  columns?: number;
  /** Responsive overrides */
  responsive?: ResponsiveGridConfig;
  /** Group identifier */
  group?: string;
  /** Conditional visibility */
  visibility?: VisibilityCondition;
  /** Legacy: conditional visibility */
  conditionalVisibility?: any;
  /** Custom CSS class */
  className?: string;
  /** Label position */
  labelPosition?: 'top' | 'left' | 'floating';
  /** Hide label */
  hideLabel?: boolean;
  /** Help text below field */
  helpText?: string;
  /** Info icon with tooltip */
  tooltip?: string;
}

/**
 * Form group definition
 */
export interface FormGroup {
  /** Unique group identifier */
  id: string;
  /** Display label */
  label: string;
  /** Group description */
  description?: string;
  /** Group icon */
  icon?: string;
  /** Allow collapsing */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Field names in this group */
  fields: string[];
  /** Group-specific grid columns */
  grid?: { columns: number };
  /** Show border around group */
  bordered?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Overall form layout configuration
 */
export interface FormLayoutConfig {
  /** Grid settings */
  grid?: {
    /** Total columns (default: 12) */
    columns: number;
    /** Gap between fields in pixels (default: 16) */
    gap: number;
    /** Vertical gap (default: same as gap) */
    rowGap?: number;
  };
  /** Field groups */
  groups?: FormGroup[];
  /** Responsive breakpoints */
  breakpoints?: {
    /** Tablet breakpoint (default: 1024) */
    tablet: number;
    /** Mobile breakpoint (default: 640) */
    mobile: number;
  };
  /** Form padding in pixels */
  padding?: number;
  /** Maximum form width in pixels */
  maxWidth?: number;
  /** Label width for left-aligned labels */
  labelWidth?: number;
  /** Direct column count (legacy support) */
  columns?: number;
}

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Validation rule types for field validation
 */
export type FieldValidationRuleType =
  // String validations
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'email'
  | 'url'
  | 'phone'
  // Number validations
  | 'min'
  | 'max'
  | 'integer'
  | 'positive'
  | 'negative'
  // Date validations
  | 'minDate'
  | 'maxDate'
  | 'futureDate'
  | 'pastDate'
  // Selection validations
  | 'minSelection'
  | 'maxSelection'
  // Cross-field validations
  | 'equalTo'
  | 'notEqualTo'
  | 'greaterThan'
  | 'lessThan'
  | 'requiredIf'
  | 'requiredUnless'
  // Custom validations
  | 'unique'
  | 'custom';

/**
 * Validation rule definition
 */
export interface FieldValidationRule {
  /** Rule type */
  type: FieldValidationRuleType;
  /** Custom error message */
  message?: string;
  /** Rule-specific parameters */
  params?: {
    /** Reference field (for cross-field validation) */
    field?: string;
    /** Value to compare */
    value?: unknown;
    /** Regex pattern */
    pattern?: string;
    /** Scope for unique constraint */
    scope?: 'shardType' | 'tenant' | 'global';
    /** Case sensitivity for unique */
    caseSensitive?: boolean;
    /** Custom validator function name */
    validatorName?: string;
  };
}

// ============================================================================
// Complete Field Definition
// ============================================================================

/**
 * Complete field definition for ShardType schema
 */
export interface RichFieldDefinition {
  /** Unique field name (camelCase) */
  name: string;
  /** Legacy: field ID */
  id?: string;
  /** Display label */
  label: string;
  /** Field description */
  description?: string;
  /** Field type */
  type: RichFieldType;
  /** Type-specific configuration */
  config?: FieldTypeConfig | Record<string, any>;
  /** Is field required */
  required?: boolean;
  /** Validation rules */
  validation?: FieldValidationRule[];
  /** Design configuration */
  design?: FieldDesignConfig;
  /** Roles that can read this field */
  readRoles?: string[];
  /** Roles that can write this field */
  writeRoles?: string[];
  /** System-managed field (read-only) */
  system?: boolean;
  /** Cannot be changed after creation */
  immutable?: boolean;
}

/**
 * Complete schema definition with rich field types
 */
export interface RichSchemaDefinition {
  /** Schema format indicator */
  format: 'rich';
  /** Field definitions */
  fields: RichFieldDefinition[];
  /** Form layout configuration */
  formLayout?: FormLayoutConfig;
  /** Allow unstructured data */
  allowUnstructuredData?: boolean;
  /** Legacy: embedding configuration */
  embedding?: any;
}

// ============================================================================
// AI Form Design Generation
// ============================================================================

/**
 * Input for AI form design generation
 */
export interface AIFormDesignInput {
  /** Field definitions */
  fields: {
    name: string;
    label: string;
    type: RichFieldType;
    description?: string;
    required?: boolean;
  }[];
  /** ShardType name for context */
  shardTypeName?: string;
  /** ShardType description for context */
  shardTypeDescription?: string;
  /** Design preferences */
  preferences?: {
    /** Layout style */
    style?: 'compact' | 'spacious' | 'balanced';
    /** Grouping preference */
    grouping?: 'auto' | 'minimal' | 'detailed';
    /** Preferred column count */
    columns?: 1 | 2 | 3;
  };
}

/**
 * Output from AI form design generation
 */
export interface AIFormDesignOutput {
  /** Generated form layout */
  formLayout: FormLayoutConfig;
  /** Generated field designs */
  fieldDesigns: Record<string, FieldDesignConfig>;
  /** Suggested field groups */
  suggestedGroups?: FormGroup[];
  /** AI's reasoning for the design */
  reasoning?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

// ============================================================================
// Tenant Configuration
// ============================================================================

/**
 * Tenant-wide date format configuration
 */
export interface TenantDateConfig {
  tenantId: string;
  /** Date display format */
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD.MM.YYYY';
  /** Time format */
  timeFormat: '12h' | '24h';
  /** First day of week (0 = Sunday, 1 = Monday) */
  weekStartsOn: 0 | 1;
  /** Default timezone (IANA, e.g., "America/New_York") */
  defaultTimezone: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract config type for a specific field type
 */
export type ConfigForFieldType<T extends RichFieldType> =
  T extends RichFieldType.TEXT ? TextFieldConfig :
  T extends RichFieldType.TEXTAREA ? TextareaFieldConfig :
  T extends RichFieldType.RICHTEXT ? RichTextFieldConfig :
  T extends RichFieldType.SELECT ? SelectFieldConfig :
  T extends RichFieldType.MULTISELECT ? MultiselectFieldConfig :
  T extends RichFieldType.DATE ? DateFieldConfig :
  T extends RichFieldType.DATETIME ? DateTimeFieldConfig :
  T extends RichFieldType.DATERANGE ? DateRangeFieldConfig :
  T extends RichFieldType.INTEGER ? IntegerFieldConfig :
  T extends RichFieldType.FLOAT ? FloatFieldConfig :
  T extends RichFieldType.CURRENCY ? CurrencyFieldConfig :
  T extends RichFieldType.PERCENTAGE ? PercentageFieldConfig :
  T extends RichFieldType.BOOLEAN ? BooleanFieldConfig :
  T extends RichFieldType.EMAIL ? EmailFieldConfig :
  T extends RichFieldType.URL ? UrlFieldConfig :
  T extends RichFieldType.PHONE ? PhoneFieldConfig :
  T extends RichFieldType.USER ? UserRefFieldConfig :
  T extends RichFieldType.SHARD ? ShardRefFieldConfig :
  T extends RichFieldType.REFERENCE ? ShardRefFieldConfig :
  T extends RichFieldType.FILE ? FileFieldConfig :
  T extends RichFieldType.IMAGE ? ImageFieldConfig :
  T extends RichFieldType.JSON ? JsonFieldConfig :
  never;

/**
 * Type guard to check if field is a text field type
 */
export function isTextFieldType(type: RichFieldType): type is RichFieldType.TEXT | RichFieldType.TEXTAREA | RichFieldType.RICHTEXT {
  return type === RichFieldType.TEXT || type === RichFieldType.TEXTAREA || type === RichFieldType.RICHTEXT;
}

/**
 * Type guard to check if field is a selection field type
 */
export function isSelectionFieldType(type: RichFieldType): type is RichFieldType.SELECT | RichFieldType.MULTISELECT {
  return type === RichFieldType.SELECT || type === RichFieldType.MULTISELECT;
}

/**
 * Type guard to check if field is a date field type
 */
export function isDateFieldType(type: RichFieldType): type is RichFieldType.DATE | RichFieldType.DATETIME | RichFieldType.DATERANGE {
  return type === RichFieldType.DATE || type === RichFieldType.DATETIME || type === RichFieldType.DATERANGE;
}

/**
 * Type guard to check if field is a number field type
 */
export function isNumberFieldType(type: RichFieldType): type is RichFieldType.INTEGER | RichFieldType.FLOAT | RichFieldType.CURRENCY | RichFieldType.PERCENTAGE {
  return type === RichFieldType.INTEGER || type === RichFieldType.FLOAT || type === RichFieldType.CURRENCY || type === RichFieldType.PERCENTAGE;
}

/**
 * Type guard to check if field is a reference field type
 */
export function isReferenceFieldType(type: RichFieldType): type is RichFieldType.USER | RichFieldType.SHARD | RichFieldType.REFERENCE {
  return type === RichFieldType.USER || type === RichFieldType.SHARD || type === RichFieldType.REFERENCE;
}

/**
 * Type guard to check if field is a file field type
 */
export function isFileFieldType(type: RichFieldType): type is RichFieldType.FILE | RichFieldType.IMAGE {
  return type === RichFieldType.FILE || type === RichFieldType.IMAGE;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default form layout configuration
 */
export const DEFAULT_FORM_LAYOUT: FormLayoutConfig = {
  grid: {
    columns: 12,
    gap: 24,
    rowGap: 24,
  },
  breakpoints: {
    tablet: 1024,
    mobile: 640,
  },
  padding: 24,
};

/**
 * Default field design for full width
 */
export const DEFAULT_FIELD_DESIGN: FieldDesignConfig = {
  grid: {
    columns: 12,
  },
  labelPosition: 'top',
};

/**
 * Toolbar configuration item (can be a string or an object with format options)
 */
export type ToolbarItem = string | Record<string, unknown>;

/**
 * Toolbar presets for rich text editor
 */
export const TOOLBAR_PRESETS: Record<Exclude<ToolbarPreset, 'custom'>, ToolbarItem[][]> = {
  basic: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
  ],
  standard: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ header: [1, 2, 3, false] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['blockquote'],
  ],
  full: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }, { size: [] }],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'image', 'video'],
    ['blockquote', 'code-block'],
    ['clean'],
  ],
};







