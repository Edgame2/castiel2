# Shard Field Types Specification

> Comprehensive specification for structured data field types in the Castiel Shards system.

**Version**: 1.0.0  
**Last Updated**: November 30, 2025  
**Status**: Draft

---

## Table of Contents

1. [Overview](#overview)
2. [Field Type Categories](#field-type-categories)
3. [Text Fields](#text-fields)
4. [Selection Fields](#selection-fields)
5. [Date & Time Fields](#date--time-fields)
6. [Number Fields](#number-fields)
7. [Boolean Fields](#boolean-fields)
8. [Reference Fields](#reference-fields)
9. [File Fields](#file-fields)
10. [Design Configuration](#design-configuration)
11. [Validation Rules](#validation-rules)
12. [AI Form Design Generation](#ai-form-design-generation)
13. [API Schemas](#api-schemas)
14. [UI Components](#ui-components)

---

## Overview

Shard `structuredData` fields are schema-driven and support rich configuration for:

- **Data types** - Text, numbers, dates, selections, references, files
- **Validation** - Required, patterns, constraints, cross-field rules
- **UI rendering** - Input types, sizing, layout, conditional visibility
- **Design configuration** - Grid layout, grouping, responsive behavior

### Core Principles

1. **Schema-first** - Field definitions stored in ShardType schema
2. **Tenant-configurable** - Options lists and formats at tenant level
3. **Progressive enhancement** - Simple config for simple fields, rich config when needed
4. **AI-assisted** - Leverage AI to generate optimal form layouts

---

## Field Type Categories

| Category | Field Types |
|----------|-------------|
| **Text** | `text`, `textarea`, `richtext` |
| **Selection** | `select`, `multiselect` |
| **Date/Time** | `date`, `datetime`, `daterange` |
| **Number** | `integer`, `float`, `currency`, `percentage` |
| **Boolean** | `boolean` |
| **Contact** | `email`, `url`, `phone` |
| **Reference** | `user`, `shard` |
| **File** | `file`, `image` |

---

## Text Fields

### Plain Text (`text`)

Single-line text input for short strings.

```typescript
interface TextFieldConfig {
  type: 'text';
  
  // Validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;              // Regex pattern
  patternMessage?: string;       // Custom error for pattern mismatch
  
  // UI
  placeholder?: string;
  prefix?: string;               // e.g., "$", "@"
  suffix?: string;               // e.g., ".com", "kg"
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'search';
}
```

**Example:**
```json
{
  "name": "companyName",
  "label": "Company Name",
  "type": "text",
  "config": {
    "minLength": 2,
    "maxLength": 100,
    "placeholder": "Enter company name"
  }
}
```

---

### Textarea (`textarea`)

Multi-line text without formatting.

```typescript
interface TextareaFieldConfig {
  type: 'textarea';
  
  // Validation
  minLength?: number;
  maxLength?: number;            // Recommended max: 10,000
  
  // UI
  placeholder?: string;
  rows?: number;                 // Default: 4
  autoResize?: boolean;          // Grow with content
  showCharCount?: boolean;       // Show "123/500 characters"
}
```

**Example:**
```json
{
  "name": "description",
  "label": "Description",
  "type": "textarea",
  "config": {
    "maxLength": 2000,
    "rows": 6,
    "showCharCount": true,
    "placeholder": "Describe this item..."
  }
}
```

---

### Rich Text (`richtext`)

WYSIWYG editor using Quill.js with Markdown output.

```typescript
interface RichTextFieldConfig {
  type: 'richtext';
  
  // Validation
  maxSize?: number;              // Bytes, default: 102400 (100KB)
  
  // Toolbar configuration
  toolbar?: 'basic' | 'standard' | 'full' | 'custom';
  customToolbar?: QuillToolbarConfig;
  
  // UI
  placeholder?: string;
  minHeight?: number;            // Pixels
  maxHeight?: number;            // Pixels, enables scroll
}

// Toolbar presets
type ToolbarPreset = {
  basic: ['bold', 'italic', 'underline', 'list', 'link'];
  standard: ['bold', 'italic', 'underline', 'strike', 
             'header', 'list', 'link', 'image', 'blockquote'];
  full: ['bold', 'italic', 'underline', 'strike',
         'header', 'font', 'size', 'color', 'background',
         'list', 'indent', 'align',
         'link', 'image', 'video',
         'blockquote', 'code-block',
         'table', 'clean'];
};

// Custom toolbar config
interface QuillToolbarConfig {
  options: (string | { [key: string]: any })[];
}
```

**Example:**
```json
{
  "name": "content",
  "label": "Article Content",
  "type": "richtext",
  "config": {
    "toolbar": "standard",
    "maxSize": 102400,
    "minHeight": 200,
    "placeholder": "Write your content here..."
  }
}
```

**Custom Toolbar Example:**
```json
{
  "name": "notes",
  "label": "Meeting Notes",
  "type": "richtext",
  "config": {
    "toolbar": "custom",
    "customToolbar": {
      "options": [
        ["bold", "italic", "underline"],
        [{ "list": "ordered" }, { "list": "bullet" }],
        ["link"],
        ["clean"]
      ]
    }
  }
}
```

---

## Selection Fields

### Single Select (`select`)

Dropdown for selecting one option.

```typescript
interface SelectFieldConfig {
  type: 'select';
  
  // Options source
  options?: SelectOption[];           // Inline options
  optionsRef?: string;                // Reference to reusable option list
  
  // Behavior
  searchable?: boolean;               // Auto-enabled if options > 10
  searchThreshold?: number;           // Default: 10
  allowClear?: boolean;               // Allow deselection
  defaultValue?: string;              // Default selected value
  
  // UI
  placeholder?: string;
  displayFormat?: 'label' | 'value' | 'both';  // How to show selected
}

interface SelectOption {
  value: string;                      // Stored value
  label: string;                      // Display text
  
  // Optional metadata
  description?: string;               // Shown in dropdown
  icon?: string;                      // Icon name or emoji
  color?: string;                     // Badge/tag color
  disabled?: boolean;                 // Cannot select
  group?: string;                     // For grouped options
}
```

**Example - Inline Options:**
```json
{
  "name": "priority",
  "label": "Priority",
  "type": "select",
  "config": {
    "options": [
      { "value": "critical", "label": "Critical", "color": "#ef4444", "icon": "🔴" },
      { "value": "high", "label": "High", "color": "#f97316", "icon": "🟠" },
      { "value": "medium", "label": "Medium", "color": "#eab308", "icon": "🟡" },
      { "value": "low", "label": "Low", "color": "#22c55e", "icon": "🟢" }
    ],
    "defaultValue": "medium",
    "allowClear": false
  }
}
```

**Example - Referenced Option List:**
```json
{
  "name": "country",
  "label": "Country",
  "type": "select",
  "config": {
    "optionsRef": "system:countries",
    "searchable": true,
    "placeholder": "Select a country"
  }
}
```

---

### Multi-Select (`multiselect`)

Dropdown for selecting multiple options.

```typescript
interface MultiselectFieldConfig {
  type: 'multiselect';
  
  // Options source
  options?: SelectOption[];           // Inline options
  optionsRef?: string;                // Reference to reusable option list
  
  // Selection constraints
  minSelection?: number;              // Minimum required selections
  maxSelection?: number;              // Maximum allowed selections
  
  // Behavior
  searchable?: boolean;               // Auto-enabled if options > 10
  searchThreshold?: number;           // Default: 10
  defaultValue?: string[];            // Default selected values
  
  // UI
  placeholder?: string;
  displayAs?: 'tags' | 'chips' | 'list' | 'count';  // How to show selected
  tagColor?: 'auto' | 'primary' | 'secondary';      // Tag styling
}
```

**Example:**
```json
{
  "name": "skills",
  "label": "Skills",
  "type": "multiselect",
  "config": {
    "options": [
      { "value": "javascript", "label": "JavaScript", "group": "Frontend" },
      { "value": "typescript", "label": "TypeScript", "group": "Frontend" },
      { "value": "react", "label": "React", "group": "Frontend" },
      { "value": "nodejs", "label": "Node.js", "group": "Backend" },
      { "value": "python", "label": "Python", "group": "Backend" },
      { "value": "postgresql", "label": "PostgreSQL", "group": "Database" },
      { "value": "mongodb", "label": "MongoDB", "group": "Database" }
    ],
    "minSelection": 1,
    "maxSelection": 5,
    "searchable": true,
    "displayAs": "tags",
    "placeholder": "Select skills (1-5)"
  }
}
```

---

### Reusable Option Lists

Option lists can be defined at system or tenant level for reuse.

```typescript
interface OptionList {
  id: string;
  tenantId: string | 'system';        // 'system' for global lists
  name: string;                       // e.g., "countries", "currencies"
  description?: string;
  options: SelectOption[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

**System Option Lists (built-in):**
- `system:countries` - ISO 3166-1 country list
- `system:currencies` - ISO 4217 currency codes
- `system:languages` - ISO 639-1 language codes
- `system:timezones` - IANA timezone database

**Referencing:**
```json
{
  "optionsRef": "system:countries"      // System list
}
```
```json
{
  "optionsRef": "tenant:deal-stages"    // Tenant-specific list
}
```

---

## Date & Time Fields

### Date Formats

Date formats are configured at the **tenant level** for consistency.

```typescript
interface TenantDateConfig {
  tenantId: string;
  
  // Display formats
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'DD.MM.YYYY';
  timeFormat: '12h' | '24h';
  
  // First day of week
  weekStartsOn: 0 | 1;                // 0 = Sunday, 1 = Monday
  
  // Timezone
  defaultTimezone: string;            // IANA timezone, e.g., "America/New_York"
}
```

---

### Date (`date`)

Date picker without time.

```typescript
interface DateFieldConfig {
  type: 'date';
  
  // Constraints
  minDate?: string | 'today' | 'startOfMonth' | 'startOfYear';
  maxDate?: string | 'today' | 'endOfMonth' | 'endOfYear';
  disabledDates?: string[];           // Specific dates to disable
  disabledDaysOfWeek?: number[];      // 0-6 (Sun-Sat)
  
  // Default
  defaultValue?: string | 'today';
  
  // UI
  placeholder?: string;
  showWeekNumbers?: boolean;
  highlightToday?: boolean;
}
```

**Example:**
```json
{
  "name": "startDate",
  "label": "Start Date",
  "type": "date",
  "config": {
    "minDate": "today",
    "defaultValue": "today",
    "disabledDaysOfWeek": [0, 6],
    "placeholder": "Select start date"
  }
}
```

---

### DateTime (`datetime`)

Date and time picker.

```typescript
interface DateTimeFieldConfig {
  type: 'datetime';
  
  // Constraints
  minDate?: string | 'today';
  maxDate?: string;
  minTime?: string;                   // "09:00"
  maxTime?: string;                   // "17:00"
  
  // Precision
  precision: 'minute' | 'second';     // Default: 'minute'
  minuteStep?: number;                // 1, 5, 10, 15, 30 (default: 15)
  
  // Timezone
  showTimezone?: boolean;
  defaultTimezone?: string;           // Override tenant default
  storeAsUTC?: boolean;               // Default: true
  
  // Default
  defaultValue?: string | 'now';
  
  // UI
  placeholder?: string;
}
```

**Example:**
```json
{
  "name": "meetingTime",
  "label": "Meeting Time",
  "type": "datetime",
  "config": {
    "precision": "minute",
    "minuteStep": 15,
    "minTime": "08:00",
    "maxTime": "18:00",
    "showTimezone": true,
    "placeholder": "Select meeting time"
  }
}
```

---

### Date Range (`daterange`)

Start and end date picker.

```typescript
interface DateRangeFieldConfig {
  type: 'daterange';
  
  // Constraints
  minDate?: string | 'today';
  maxDate?: string;
  maxRangeDays?: number;              // Maximum span in days
  minRangeDays?: number;              // Minimum span in days
  
  // Behavior
  allowSameDay?: boolean;             // Start = End allowed
  linkedEndDate?: boolean;            // End date follows start
  
  // UI
  startPlaceholder?: string;
  endPlaceholder?: string;
  presets?: DateRangePreset[];        // Quick selection presets
}

interface DateRangePreset {
  label: string;
  value: {
    start: string | 'today' | 'startOfWeek' | 'startOfMonth';
    end: string | 'today' | 'endOfWeek' | 'endOfMonth';
  };
}
```

**Example:**
```json
{
  "name": "projectDuration",
  "label": "Project Duration",
  "type": "daterange",
  "config": {
    "minDate": "today",
    "maxRangeDays": 365,
    "presets": [
      { "label": "This Week", "value": { "start": "startOfWeek", "end": "endOfWeek" } },
      { "label": "This Month", "value": { "start": "startOfMonth", "end": "endOfMonth" } },
      { "label": "This Quarter", "value": { "start": "startOfQuarter", "end": "endOfQuarter" } }
    ]
  }
}
```

---

## Number Fields

### Integer (`integer`)

Whole numbers.

```typescript
interface IntegerFieldConfig {
  type: 'integer';
  
  // Constraints
  min?: number;
  max?: number;
  
  // UI
  inputType: 'input' | 'slider';      // Default: 'input'
  step?: number;                      // For slider and input arrows
  showStepButtons?: boolean;          // +/- buttons
  
  // Slider-specific
  sliderMarks?: { value: number; label: string }[];
  showSliderValue?: boolean;          // Show value while dragging
  
  // Display
  prefix?: string;
  suffix?: string;                    // e.g., "items", "users"
  thousandSeparator?: boolean;        // 1,000 vs 1000
  
  // Default
  defaultValue?: number;
  placeholder?: string;
}
```

**Example - Input:**
```json
{
  "name": "quantity",
  "label": "Quantity",
  "type": "integer",
  "config": {
    "min": 1,
    "max": 1000,
    "step": 1,
    "showStepButtons": true,
    "suffix": "items",
    "defaultValue": 1
  }
}
```

**Example - Slider:**
```json
{
  "name": "teamSize",
  "label": "Team Size",
  "type": "integer",
  "config": {
    "inputType": "slider",
    "min": 1,
    "max": 50,
    "step": 1,
    "showSliderValue": true,
    "sliderMarks": [
      { "value": 1, "label": "Solo" },
      { "value": 10, "label": "Small" },
      { "value": 25, "label": "Medium" },
      { "value": 50, "label": "Large" }
    ]
  }
}
```

---

### Float (`float`)

Decimal numbers.

```typescript
interface FloatFieldConfig {
  type: 'float';
  
  // Constraints
  min?: number;
  max?: number;
  
  // Precision
  decimalPlaces?: number;             // Default: 2
  
  // UI
  inputType: 'input' | 'slider';
  step?: number;                      // Default: 0.01
  
  // Display
  prefix?: string;
  suffix?: string;
  thousandSeparator?: boolean;
  
  // Default
  defaultValue?: number;
  placeholder?: string;
}
```

**Example:**
```json
{
  "name": "weight",
  "label": "Weight",
  "type": "float",
  "config": {
    "min": 0,
    "max": 1000,
    "decimalPlaces": 2,
    "step": 0.1,
    "suffix": "kg"
  }
}
```

---

### Currency (`currency`)

Money values with currency symbol.

```typescript
interface CurrencyFieldConfig {
  type: 'currency';
  
  // Currency
  currencyCode?: string;              // ISO 4217, e.g., "USD", "EUR"
  currencyField?: string;             // Dynamic: read from another field
  
  // Constraints
  min?: number;
  max?: number;
  
  // Precision
  decimalPlaces?: number;             // Default: 2
  
  // Display
  symbolPosition: 'prefix' | 'suffix';
  thousandSeparator?: boolean;        // Default: true
  
  // Default
  defaultValue?: number;
  placeholder?: string;
}
```

**Example:**
```json
{
  "name": "dealValue",
  "label": "Deal Value",
  "type": "currency",
  "config": {
    "currencyCode": "USD",
    "min": 0,
    "decimalPlaces": 2,
    "symbolPosition": "prefix",
    "thousandSeparator": true,
    "placeholder": "0.00"
  }
}
```

**Dynamic Currency:**
```json
{
  "name": "amount",
  "label": "Amount",
  "type": "currency",
  "config": {
    "currencyField": "currency",
    "decimalPlaces": 2
  }
}
```

---

### Percentage (`percentage`)

Percentage values (0-100).

```typescript
interface PercentageFieldConfig {
  type: 'percentage';
  
  // Constraints
  min?: number;                       // Default: 0
  max?: number;                       // Default: 100
  
  // Precision
  decimalPlaces?: number;             // Default: 0
  
  // UI
  inputType: 'input' | 'slider';
  showPercentSign?: boolean;          // Default: true
  
  // Default
  defaultValue?: number;
  placeholder?: string;
}
```

**Example:**
```json
{
  "name": "probability",
  "label": "Win Probability",
  "type": "percentage",
  "config": {
    "inputType": "slider",
    "min": 0,
    "max": 100,
    "step": 5,
    "defaultValue": 50
  }
}
```

---

## Boolean Fields

### Boolean (`boolean`)

True/false values with configurable display.

```typescript
interface BooleanFieldConfig {
  type: 'boolean';
  
  // Default
  defaultValue?: boolean | null;      // null = undecided state
  allowNull?: boolean;                // Three-state: true/false/null
  
  // Display
  displayAs: 'switch' | 'checkbox' | 'buttons' | 'radio';
  
  // Custom labels
  trueLabel?: string;                 // Default: "Yes" / "On"
  falseLabel?: string;                // Default: "No" / "Off"
  nullLabel?: string;                 // For three-state: "Not set"
  
  // Styling
  activeColor?: string;               // Color when true
  size?: 'sm' | 'md' | 'lg';
}
```

**Example - Switch:**
```json
{
  "name": "isActive",
  "label": "Active",
  "type": "boolean",
  "config": {
    "displayAs": "switch",
    "defaultValue": true,
    "trueLabel": "Active",
    "falseLabel": "Inactive"
  }
}
```

**Example - Buttons:**
```json
{
  "name": "approved",
  "label": "Approval Status",
  "type": "boolean",
  "config": {
    "displayAs": "buttons",
    "allowNull": true,
    "trueLabel": "Approved",
    "falseLabel": "Rejected",
    "nullLabel": "Pending Review",
    "defaultValue": null
  }
}
```

---

## Reference Fields

### Email (`email`)

Email address with validation.

```typescript
interface EmailFieldConfig {
  type: 'email';
  
  // Validation
  allowedDomains?: string[];          // Whitelist domains
  blockedDomains?: string[];          // Blacklist domains
  
  // UI
  placeholder?: string;
  showMailtoLink?: boolean;           // Make clickable in view mode
}
```

**Example:**
```json
{
  "name": "workEmail",
  "label": "Work Email",
  "type": "email",
  "config": {
    "blockedDomains": ["gmail.com", "yahoo.com", "hotmail.com"],
    "placeholder": "name@company.com",
    "showMailtoLink": true
  }
}
```

---

### URL (`url`)

URL with validation.

```typescript
interface UrlFieldConfig {
  type: 'url';
  
  // Validation
  allowedProtocols?: string[];        // Default: ['http', 'https']
  allowedDomains?: string[];          // Whitelist
  
  // UI
  placeholder?: string;
  showAsLink?: boolean;               // Make clickable in view mode
  showFavicon?: boolean;              // Show website favicon
}
```

**Example:**
```json
{
  "name": "website",
  "label": "Website",
  "type": "url",
  "config": {
    "allowedProtocols": ["https"],
    "placeholder": "https://example.com",
    "showAsLink": true,
    "showFavicon": true
  }
}
```

---

### Phone (`phone`)

Phone number with formatting.

```typescript
interface PhoneFieldConfig {
  type: 'phone';
  
  // Format
  defaultCountry?: string;            // ISO 3166-1 alpha-2, e.g., "US"
  allowedCountries?: string[];        // Limit to specific countries
  format?: 'national' | 'international' | 'e164';
  
  // UI
  placeholder?: string;
  showCountrySelect?: boolean;        // Country code dropdown
  showDialLink?: boolean;             // Make clickable (tel:)
}
```

**Example:**
```json
{
  "name": "phone",
  "label": "Phone Number",
  "type": "phone",
  "config": {
    "defaultCountry": "US",
    "showCountrySelect": true,
    "format": "national",
    "showDialLink": true
  }
}
```

---

### User Reference (`user`)

Reference to a user in the tenant.

```typescript
interface UserRefFieldConfig {
  type: 'user';
  
  // Filtering
  roles?: string[];                   // Filter by roles
  includeInactive?: boolean;          // Default: false
  
  // Selection
  multiple?: boolean;                 // Allow multiple users
  minSelection?: number;
  maxSelection?: number;
  
  // UI
  placeholder?: string;
  displayFormat?: 'name' | 'email' | 'avatar' | 'full';
  showAvatar?: boolean;
}
```

**Example:**
```json
{
  "name": "assignee",
  "label": "Assigned To",
  "type": "user",
  "config": {
    "roles": ["user", "admin"],
    "displayFormat": "full",
    "showAvatar": true,
    "placeholder": "Select assignee"
  }
}
```

---

### Shard Reference (`shard`)

Reference to another shard (creates relationship).

```typescript
interface ShardRefFieldConfig {
  type: 'shard';
  
  // Target
  shardTypeId: string;                // Required: which ShardType to reference
  shardTypeIds?: string[];            // Alternative: allow multiple types
  
  // Selection
  multiple?: boolean;
  minSelection?: number;
  maxSelection?: number;
  
  // Filtering
  filter?: {
    status?: string[];                // e.g., ['active']
    customFilter?: Record<string, any>;
  };
  
  // Relationship
  relationshipType?: string;          // Type of relationship created
  bidirectional?: boolean;            // Create reverse relationship
  
  // UI
  placeholder?: string;
  displayField?: string;              // Which field to show (default: 'name')
  searchFields?: string[];            // Fields to search
  showPreview?: boolean;              // Show shard preview on hover
  allowCreate?: boolean;              // Allow creating new shard inline
}
```

**Example:**
```json
{
  "name": "company",
  "label": "Company",
  "type": "shard",
  "config": {
    "shardTypeId": "c_company",
    "relationshipType": "belongs_to",
    "displayField": "name",
    "searchFields": ["name", "domain"],
    "showPreview": true,
    "allowCreate": true,
    "placeholder": "Search companies..."
  }
}
```

---

## File Fields

### File (`file`)

File upload and attachment.

```typescript
interface FileFieldConfig {
  type: 'file';
  
  // Constraints
  maxSize?: number;                   // Bytes, default: 10MB
  maxFiles?: number;                  // For multiple uploads
  allowedTypes?: string[];            // MIME types or extensions
  
  // Selection
  multiple?: boolean;
  
  // Storage
  storageContainer?: string;          // Azure blob container
  
  // UI
  dragDrop?: boolean;                 // Enable drag-drop zone
  showPreview?: boolean;              // Preview images/PDFs
  showFileSize?: boolean;
}
```

**Example:**
```json
{
  "name": "attachments",
  "label": "Attachments",
  "type": "file",
  "config": {
    "multiple": true,
    "maxFiles": 5,
    "maxSize": 10485760,
    "allowedTypes": [".pdf", ".doc", ".docx", ".xls", ".xlsx", "image/*"],
    "dragDrop": true,
    "showPreview": true
  }
}
```

### Image (`image`)

Image upload with preview and optimization.

```typescript
interface ImageFieldConfig {
  type: 'image';
  
  // Constraints
  maxSize?: number;                   // Bytes
  maxWidth?: number;                  // Pixels
  maxHeight?: number;                 // Pixels
  aspectRatio?: string;               // e.g., "16:9", "1:1"
  allowedFormats?: ('jpeg' | 'png' | 'gif' | 'webp')[];
  
  // Selection
  multiple?: boolean;
  maxImages?: number;
  
  // Processing
  autoResize?: boolean;               // Resize to max dimensions
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
  
  // UI
  cropEnabled?: boolean;
  showDimensions?: boolean;
}
```

**Example:**
```json
{
  "name": "profilePhoto",
  "label": "Profile Photo",
  "type": "image",
  "config": {
    "maxSize": 5242880,
    "aspectRatio": "1:1",
    "allowedFormats": ["jpeg", "png"],
    "cropEnabled": true,
    "autoResize": true,
    "maxWidth": 500,
    "maxHeight": 500
  }
}
```

---

## Design Configuration

### Field Layout Schema

Each field can have design configuration controlling its appearance and position.

```typescript
interface FieldDesignConfig {
  // Grid positioning (12-column grid)
  grid: {
    columns: number;                  // 1-12, how many columns to span
    order?: number;                   // Order in the form (lower = first)
  };
  
  // Responsive overrides
  responsive?: {
    tablet?: { columns: number };     // < 1024px
    mobile?: { columns: number };     // < 640px
  };
  
  // Grouping
  group?: string;                     // Group identifier
  
  // Conditional visibility
  visibility?: {
    condition: 'equals' | 'notEquals' | 'contains' | 'isEmpty' | 'isNotEmpty';
    field: string;                    // Field to check
    value?: any;                      // Value to compare
  };
  
  // Styling
  className?: string;                 // Custom CSS class
  labelPosition?: 'top' | 'left' | 'floating';
  hideLabel?: boolean;
  helpText?: string;                  // Below-field help text
  tooltip?: string;                   // Info icon with tooltip
}
```

---

### Form Layout Schema

Overall form layout configuration.

```typescript
interface FormLayoutConfig {
  // Grid settings
  grid: {
    columns: number;                  // Total columns (default: 12)
    gap: number;                      // Gap between fields (default: 16)
    rowGap?: number;                  // Vertical gap (default: same as gap)
  };
  
  // Groups
  groups?: FormGroup[];
  
  // Responsive breakpoints
  breakpoints?: {
    tablet: number;                   // Default: 1024
    mobile: number;                   // Default: 640
  };
  
  // Styling
  padding?: number;
  maxWidth?: number;
  labelWidth?: number;                // For left-aligned labels
}

interface FormGroup {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  fields: string[];                   // Field names in this group
  
  // Group-level design
  grid?: {
    columns: number;
  };
  bordered?: boolean;
  className?: string;
}
```

---

### Complete Field Definition

```typescript
interface FieldDefinition {
  // Identity
  name: string;                       // Unique field name (camelCase)
  label: string;                      // Display label
  description?: string;               // Field description
  
  // Type and config
  type: FieldType;
  config: FieldTypeConfig;            // Type-specific configuration
  
  // Validation
  required?: boolean;
  validation?: ValidationRule[];
  
  // Design
  design?: FieldDesignConfig;
  
  // Permissions
  readRoles?: string[];               // Roles that can read
  writeRoles?: string[];              // Roles that can write
  
  // System
  system?: boolean;                   // System-managed field
  immutable?: boolean;                // Cannot be changed after creation
}
```

---

### Example Form Layout

```json
{
  "formLayout": {
    "grid": {
      "columns": 12,
      "gap": 24
    },
    "groups": [
      {
        "id": "basic",
        "label": "Basic Information",
        "icon": "user",
        "fields": ["name", "email", "phone"]
      },
      {
        "id": "details",
        "label": "Details",
        "icon": "file-text",
        "collapsible": true,
        "fields": ["company", "role", "department"]
      },
      {
        "id": "preferences",
        "label": "Preferences",
        "icon": "settings",
        "collapsible": true,
        "defaultCollapsed": true,
        "fields": ["timezone", "language", "notifications"]
      }
    ]
  },
  "fields": [
    {
      "name": "name",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "design": {
        "grid": { "columns": 6 },
        "responsive": { "mobile": { "columns": 12 } }
      }
    },
    {
      "name": "email",
      "label": "Email",
      "type": "email",
      "required": true,
      "design": {
        "grid": { "columns": 6 },
        "responsive": { "mobile": { "columns": 12 } }
      }
    },
    {
      "name": "phone",
      "label": "Phone",
      "type": "phone",
      "design": {
        "grid": { "columns": 6 }
      }
    },
    {
      "name": "company",
      "label": "Company",
      "type": "shard",
      "config": { "shardTypeId": "c_company" },
      "design": {
        "grid": { "columns": 6 }
      }
    },
    {
      "name": "role",
      "label": "Role",
      "type": "select",
      "design": {
        "grid": { "columns": 6 },
        "visibility": {
          "condition": "isNotEmpty",
          "field": "company"
        }
      }
    }
  ]
}
```

---

## Validation Rules

### Validation Schema

```typescript
interface ValidationRule {
  type: ValidationType;
  message?: string;                   // Custom error message
  params?: Record<string, any>;       // Rule-specific parameters
}

type ValidationType =
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
  
  // Custom
  | 'unique'
  | 'custom';
```

---

### Cross-Field Validation Examples

```json
{
  "name": "endDate",
  "label": "End Date",
  "type": "date",
  "validation": [
    {
      "type": "greaterThan",
      "params": { "field": "startDate" },
      "message": "End date must be after start date"
    }
  ]
}
```

```json
{
  "name": "confirmEmail",
  "label": "Confirm Email",
  "type": "email",
  "validation": [
    {
      "type": "equalTo",
      "params": { "field": "email" },
      "message": "Emails must match"
    }
  ]
}
```

```json
{
  "name": "otherReason",
  "label": "Please specify",
  "type": "textarea",
  "validation": [
    {
      "type": "requiredIf",
      "params": { 
        "field": "reason",
        "value": "other"
      },
      "message": "Please specify the reason"
    }
  ]
}
```

---

### Unique Constraint

```json
{
  "name": "email",
  "label": "Email",
  "type": "email",
  "validation": [
    {
      "type": "unique",
      "params": {
        "scope": "shardType",
        "caseSensitive": false
      },
      "message": "This email is already in use"
    }
  ]
}
```

---

## AI Form Design Generation

### Overview

AI can automatically generate optimal form layouts based on field definitions.

### Input Schema

```typescript
interface AIFormDesignInput {
  // Required
  fields: {
    name: string;
    label: string;
    type: FieldType;
    description?: string;
    required?: boolean;
  }[];
  
  // Optional context
  shardTypeName?: string;
  shardTypeDescription?: string;
  
  // Preferences
  preferences?: {
    style?: 'compact' | 'spacious' | 'balanced';
    grouping?: 'auto' | 'minimal' | 'detailed';
    columns?: 1 | 2 | 3;
  };
}
```

### Output Schema

```typescript
interface AIFormDesignOutput {
  // Generated layout
  formLayout: FormLayoutConfig;
  
  // Generated field designs
  fieldDesigns: {
    [fieldName: string]: FieldDesignConfig;
  };
  
  // Suggested groups
  suggestedGroups?: FormGroup[];
  
  // Explanation
  reasoning?: string;
  
  // Confidence score
  confidence: number;                 // 0-1
}
```

### API Endpoint

```
POST /api/v1/ai/generate-form-design
```

**Request:**
```json
{
  "fields": [
    { "name": "firstName", "label": "First Name", "type": "text", "required": true },
    { "name": "lastName", "label": "Last Name", "type": "text", "required": true },
    { "name": "email", "label": "Email", "type": "email", "required": true },
    { "name": "phone", "label": "Phone", "type": "phone" },
    { "name": "company", "label": "Company", "type": "shard", "description": "Associated company" },
    { "name": "role", "label": "Role", "type": "select" },
    { "name": "startDate", "label": "Start Date", "type": "date" },
    { "name": "salary", "label": "Salary", "type": "currency" },
    { "name": "notes", "label": "Notes", "type": "textarea" },
    { "name": "isActive", "label": "Active", "type": "boolean" }
  ],
  "shardTypeName": "Employee",
  "shardTypeDescription": "Employee records for HR management",
  "preferences": {
    "style": "balanced",
    "grouping": "auto"
  }
}
```

**Response:**
```json
{
  "formLayout": {
    "grid": { "columns": 12, "gap": 24 },
    "groups": [
      {
        "id": "personal",
        "label": "Personal Information",
        "icon": "user",
        "fields": ["firstName", "lastName", "email", "phone"]
      },
      {
        "id": "employment",
        "label": "Employment Details",
        "icon": "briefcase",
        "fields": ["company", "role", "startDate", "salary"]
      },
      {
        "id": "additional",
        "label": "Additional Information",
        "icon": "file-text",
        "collapsible": true,
        "fields": ["notes", "isActive"]
      }
    ]
  },
  "fieldDesigns": {
    "firstName": { "grid": { "columns": 6 }, "order": 1 },
    "lastName": { "grid": { "columns": 6 }, "order": 2 },
    "email": { "grid": { "columns": 6 }, "order": 3 },
    "phone": { "grid": { "columns": 6 }, "order": 4 },
    "company": { "grid": { "columns": 6 }, "order": 5 },
    "role": { "grid": { "columns": 6 }, "order": 6 },
    "startDate": { "grid": { "columns": 6 }, "order": 7 },
    "salary": { "grid": { "columns": 6 }, "order": 8 },
    "notes": { "grid": { "columns": 12 }, "order": 9 },
    "isActive": { "grid": { "columns": 4 }, "order": 10 }
  },
  "reasoning": "Grouped fields by logical category (personal, employment, additional). Name fields placed side-by-side as they're commonly edited together. Notes given full width for better editing. Active status as a small toggle at the end.",
  "confidence": 0.92
}
```

### User Editing

Generated designs can be edited via:
1. **Visual editor** - Drag-drop fields, resize, regroup
2. **JSON editor** - Direct schema editing
3. **Regenerate** - Provide feedback and regenerate

---

## API Schemas

### Create/Update ShardType with Fields

```
POST /api/v1/shard-types
PATCH /api/v1/shard-types/:id
```

```json
{
  "name": "c_employee",
  "displayName": "Employee",
  "description": "Employee records",
  "schema": {
    "fields": [
      {
        "name": "firstName",
        "label": "First Name",
        "type": "text",
        "required": true,
        "config": {
          "maxLength": 100
        },
        "design": {
          "grid": { "columns": 6 }
        }
      }
    ],
    "formLayout": {
      "grid": { "columns": 12, "gap": 24 },
      "groups": []
    }
  }
}
```

### Validate Shard Data

```
POST /api/v1/shards/validate
```

```json
{
  "shardTypeId": "c_employee-uuid",
  "structuredData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "field": "email",
      "rule": "unique",
      "message": "This email is already in use"
    }
  ]
}
```

---

## UI Components

### Required Components

| Component | Purpose | Library |
|-----------|---------|---------|
| `DynamicForm` | Render form from schema | Custom |
| `FieldRenderer` | Render individual field by type | Custom |
| `TextInput` | text, email, url, phone | shadcn/ui |
| `Textarea` | textarea | shadcn/ui |
| `RichTextEditor` | richtext | Quill.js |
| `Select` | select | shadcn/ui + cmdk |
| `MultiSelect` | multiselect | Custom |
| `DatePicker` | date | shadcn/ui |
| `DateTimePicker` | datetime | shadcn/ui |
| `DateRangePicker` | daterange | shadcn/ui |
| `NumberInput` | integer, float, currency, percentage | Custom |
| `Slider` | integer/float with slider | shadcn/ui |
| `Switch` | boolean (switch) | shadcn/ui |
| `Checkbox` | boolean (checkbox) | shadcn/ui |
| `ButtonGroup` | boolean (buttons) | Custom |
| `UserPicker` | user reference | Custom |
| `ShardPicker` | shard reference | Custom |
| `FileUpload` | file | Custom |
| `ImageUpload` | image | Custom |
| `FormGroup` | Field grouping | Custom |
| `ConditionalField` | Visibility logic | Custom |

### Component Hierarchy

```
DynamicForm
├── FormGroup (for each group)
│   └── ConditionalField (for each field)
│       └── FieldRenderer
│           └── [Specific Input Component]
├── ValidationMessages
└── FormActions (Submit, Cancel)
```

---

## Implementation Checklist

### Backend

- [ ] Define field type TypeScript interfaces
- [ ] Update ShardType schema to include field definitions
- [ ] Create OptionList repository and service
- [ ] Implement field validation service
- [ ] Add cross-field validation support
- [ ] Create unique constraint checker
- [ ] Implement AI form design endpoint
- [ ] Add file upload endpoints
- [ ] Update Shard CRUD to validate fields

### Frontend

- [ ] Create `DynamicForm` component
- [ ] Create `FieldRenderer` component
- [ ] Implement all input components
- [ ] Add Quill.js integration for richtext
- [ ] Implement conditional visibility
- [ ] Add form layout grid system
- [ ] Create visual form designer
- [ ] Implement AI design generation UI
- [ ] Add responsive breakpoint handling

### Documentation

- [x] Field types specification (this document)
- [ ] API reference for field endpoints
- [ ] Component usage guide
- [ ] Migration guide for existing ShardTypes

---

**Last Updated**: November 30, 2025  
**Maintainer**: Castiel Development Team











