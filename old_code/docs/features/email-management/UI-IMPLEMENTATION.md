# Email Templates UI Implementation

## Overview

This document describes all UI pages and components required for the email management system. All pages are accessible only to super admins.

---

## Table of Contents

1. [Pages](#pages)
2. [Components](#components)
3. [Component Details](#component-details)
4. [Routing Structure](#routing-structure)
5. [User Interactions](#user-interactions)

---

## Pages

### Super Admin Pages

#### `/admin/email-templates`

**Purpose**: List all email templates

**Features**:
- List all templates with filters (category, language, status)
- Search templates by name or display name
- View template details
- Quick actions: Edit, Delete, Duplicate, Enable/Disable
- Language badges showing available languages per template
- Filter by category, language, and active status

**Components Used**:
- `EmailTemplateList`
- `EmailTemplateCard`
- `EmailTemplateFilters`

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Email Templates                    [+ New]      │
├─────────────────────────────────────────────────┤
│  [Filters: Category ▼] [Language ▼] [Status ▼] │
│  [Search templates...]                          │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐             │
│  │ Welcome     │  │ Task Alert  │             │
│  │ Email       │  │             │             │
│  │ [en][fr]    │  │ [en]        │             │
│  │ Category:   │  │ Category:   │             │
│  │ notifications│ │ alerts      │             │
│  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────┘
```

---

#### `/admin/email-templates/new`

**Purpose**: Create new email template

**Features**:
- Form to create new template
- Language selection (create all at once or one at a time)
- TipTap editor for subject, HTML body, and text body
- Placeholder definitions table
- Email metadata (from, reply-to)
- Provider selection (optional)
- Live preview
- Template validation

**Components Used**:
- `EmailTemplateForm`
- `TipTapEditor` (with email mode)
- `PlaceholderHelper`
- `EmailTemplatePreview`

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Create Email Template            [Cancel] [Save]│
├─────────────────────────────────────────────────┤
│  Basic Information                              │
│  ┌───────────────────────────────────────────┐ │
│  │ Name: [welcome-email        ]              │ │
│  │ Language: [en ▼] [+ Add Language]          │ │
│  │ Display Name: [Welcome Email]              │ │
│  │ Category: [notifications ▼]                │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Email Content                                  │
│  ┌───────────────────────────────────────────┐ │
│  │ Subject: [TipTap Editor]                  │ │
│  │ HTML Body: [TipTap Editor - Email Mode]   │ │
│  │ Text Body: [TipTap Editor - Plain]         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Placeholders                                   │
│  ┌───────────────────────────────────────────┐ │
│  │ [Add Placeholder]                         │ │
│  │ Name | Description | Example | Required   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Preview] [Test]                               │
└─────────────────────────────────────────────────┘
```

---

#### `/admin/email-templates/[id]`

**Purpose**: View/edit email template

**Features**:
- View template details
- Edit template content
- Language tabs for managing multiple language variants
- Add new language variant
- Delete language variant
- Live preview
- Test template rendering
- Template history/versioning (future)

**Components Used**:
- `EmailTemplateForm`
- `EmailTemplateLanguageTabs`
- `EmailTemplatePreview`
- `EmailTemplateTest`
- `TipTapEditor`

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Welcome Email                    [Edit] [Test] │
├─────────────────────────────────────────────────┤
│  [en] [fr] [de] [+ Add Language]                │
├─────────────────────────────────────────────────┤
│  Template Details                               │
│  ┌───────────────────────────────────────────┐ │
│  │ Name: welcome-email                        │ │
│  │ Language: en                               │ │
│  │ Category: notifications                   │ │
│  │ Status: Active                             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Content                                        │
│  [Edit with TipTap Editor]                     │
│                                                 │
│  [Preview]                                      │
└─────────────────────────────────────────────────┘
```

---

#### `/admin/email-templates/[id]/test`

**Purpose**: Test template rendering

**Features**:
- Test template with custom placeholder values
- Preview rendered subject, HTML, and text
- Validate placeholder values
- Send test email
- Show missing/extra placeholders

**Components Used**:
- `EmailTemplateTest`
- `EmailTemplatePreview`
- `PlaceholderInputForm`

**Layout**:
```
┌─────────────────────────────────────────────────┐
│  Test Template: Welcome Email        [Close]    │
├─────────────────────────────────────────────────┤
│  Placeholder Values                             │
│  ┌───────────────────────────────────────────┐ │
│  │ userName: [John Doe        ]               │ │
│  │ tenantName: [Acme Corp     ]               │ │
│  │ loginUrl: [https://...     ]               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Rendered Output                                │
│  ┌───────────────────────────────────────────┐ │
│  │ Subject: Welcome to Acme Corp!            │ │
│  │ HTML: [Preview]                            │ │
│  │ Text: [Preview]                            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Send Test Email] [Update Preview]             │
└─────────────────────────────────────────────────┘
```

---

## Components

### EmailTemplateList

**Purpose**: Display list of email templates

**Props**:
```typescript
interface EmailTemplateListProps {
  templates: EmailTemplateDocument[];
  filters: {
    category?: string;
    language?: string;
    isActive?: boolean;
    search?: string;
  };
  onFilterChange: (filters: FilterState) => void;
  onTemplateClick: (templateId: string) => void;
  onEdit: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
}
```

**Features**:
- Grid/list view toggle
- Language badges
- Category tags
- Status indicators
- Quick actions menu

---

### EmailTemplateForm

**Purpose**: Create/edit email template form

**Props**:
```typescript
interface EmailTemplateFormProps {
  template?: EmailTemplateDocument;
  mode: 'create' | 'edit';
  onSave: (template: EmailTemplateDocument) => Promise<void>;
  onCancel: () => void;
}
```

**Features**:
- Basic information fields
- Language selection
- TipTap editors for content
- Placeholder management
- Email metadata fields
- Provider selection
- Form validation
- Auto-save (optional)

---

### EmailTemplateLanguageTabs

**Purpose**: Manage multiple language variants

**Props**:
```typescript
interface EmailTemplateLanguageTabsProps {
  templateName: string;
  languages: Array<{
    language: string;
    templateId: string;
    displayName: string;
    isActive: boolean;
  }>;
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  onAddLanguage: () => void;
  onDeleteLanguage: (language: string) => void;
}
```

**Features**:
- Tab interface for languages
- Language completion status
- Add/remove language variants
- Warning for missing translations

---

### EmailTemplatePreview

**Purpose**: Live preview of rendered template

**Props**:
```typescript
interface EmailTemplatePreviewProps {
  template: EmailTemplateDocument;
  placeholders: Record<string, any>;
  mode: 'desktop' | 'mobile';
}
```

**Features**:
- Real-time preview
- Desktop/mobile toggle
- Rendered subject, HTML, and text
- Email client preview simulation

---

### EmailTemplateTest

**Purpose**: Test template rendering

**Props**:
```typescript
interface EmailTemplateTestProps {
  template: EmailTemplateDocument;
  onSendTest: (email: string, placeholders: Record<string, any>) => Promise<void>;
}
```

**Features**:
- Placeholder input form
- Rendered output preview
- Validation feedback
- Send test email
- Missing placeholder warnings

---

### PlaceholderHelper

**Purpose**: Helper for managing placeholders

**Props**:
```typescript
interface PlaceholderHelperProps {
  placeholders: PlaceholderDefinition[];
  onInsert: (placeholder: string) => void;
  onAdd: (placeholder: PlaceholderDefinition) => void;
  onEdit: (placeholder: PlaceholderDefinition) => void;
  onDelete: (placeholderName: string) => void;
}
```

**Features**:
- List of available placeholders
- Insert placeholder button
- Add/edit/delete placeholders
- Placeholder autocomplete suggestions
- Required placeholder indicators

---

### TipTap Editor Integration

**Purpose**: Rich text editing with placeholder support

**Usage in Email Templates**:
```typescript
<TipTapEditor
  content={template.subject}
  onChange={(content) => setSubject(content)}
  mode="email"
  placeholderDefinitions={template.placeholders}
  onPlaceholderInsert={(placeholder) => insertPlaceholder(placeholder)}
  showToolbar={true}
/>
```

**Features**:
- Email-safe HTML generation
- Placeholder autocomplete (triggers on `{{`)
- Placeholder insert button in toolbar
- Visual placeholder indicators
- Live preview

---

## Component Details

### EmailTemplateCard

Displays a single template in the list:

```typescript
interface EmailTemplateCardProps {
  template: EmailTemplateDocument;
  languages: string[]; // Available languages
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
}
```

**Visual Elements**:
- Template name and display name
- Language badges (en, fr, de, etc.)
- Category tag
- Status indicator (active/inactive)
- Last updated timestamp
- Quick actions menu

---

### EmailTemplateFilters

Filter templates by various criteria:

```typescript
interface EmailTemplateFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}
```

**Filters**:
- Category dropdown
- Language dropdown
- Status toggle (active/inactive/all)
- Search input

---

## Routing Structure

```
/admin/email-templates
  ├── / (list)
  ├── /new (create)
  ├── /[id] (view/edit)
  └── /[id]/test (test)
```

---

## User Interactions

### Creating a Template

1. Navigate to `/admin/email-templates/new`
2. Fill in basic information (name, language, category)
3. Option to create all languages at once or one at a time
4. Use TipTap editor to create content
5. Define placeholders
6. Preview template
7. Save template

### Editing a Template

1. Navigate to template from list
2. Select language tab (if multiple languages)
3. Edit content using TipTap editor
4. Update placeholders if needed
5. Preview changes
6. Save changes

### Adding Language Variant

1. Open template edit page
2. Click "Add Language" button
3. Select target language
4. Option to duplicate from existing language
5. Translate content
6. Save new language variant

### Testing a Template

1. Navigate to template test page
2. Enter placeholder values
3. View rendered output
4. Optionally send test email
5. Verify rendering is correct

### Duplicating to Another Language

1. Open template
2. Click "Duplicate" button
3. Select target language
4. Optionally translate content
5. Save new language variant

---

## Best Practices

### 1. Template Validation

- Validate before save
- Check required placeholders are defined
- Validate placeholder syntax
- Check email format for from/reply-to fields

### 2. User Feedback

- Show success/error messages
- Loading states during save
- Confirmation dialogs for destructive actions
- Auto-save indicators

### 3. Accessibility

- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

### 4. Performance

- Lazy load template list
- Debounce search input
- Optimize TipTap editor rendering
- Cache template data

---

## Related Documentation

- [TipTap Editor](./TIPTAP-EDITOR.md) - Editor implementation
- [Multi-Language Support](./MULTI-LANGUAGE.md) - Language management
- [API Implementation](./API-IMPLEMENTATION.md) - API endpoints







