# Content Generation - Placeholder System

## Overview

The Content Generation Module enables tenant admins to create templates from existing Google Drive or Microsoft OneDrive documents, and allows users to generate personalized documents from those templates. The system automatically extracts placeholders embedded in documents, lets admins configure AI generation instructions, and produces AI-filled documents stored in users' Drive/OneDrive folders.

> **Philosophy**: "Point, configure, generate—transform existing templates into personalized content at scale."

This system serves as the foundation of a Seismic-like content automation platform, allowing organizations to maintain brand-consistent templates while enabling AI-powered personalization.

### Key Features

- **Template Management**: Admins create and configure templates from existing documents
- **User Generation**: Users select templates and generate personalized documents
- **Folder Selection**: Users specify destination folder in their Drive/OneDrive
- **No File Storage**: App does NOT store generated files - only metadata records
- **Multi-Format Support**: Google Slides, Google Docs, Microsoft Word, Microsoft PowerPoint
- **Context Integration**: Optional linking to Castiel Shards for auto-fill
- **Chart Generation**: Google Charts integration with template colors

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Architecture](#database-architecture)
3. [Workflow](#workflow)
4. [Placeholder Format Specification](#placeholder-format-specification)
5. [Placeholder Extraction](#placeholder-extraction)
6. [Placeholder Configuration](#placeholder-configuration)
7. [AI Content Generation](#ai-content-generation)
8. [Document Rewriting](#document-rewriting)
9. [Version Management](#version-management)
10. [Supported Formats](#supported-formats)
11. [Security & Compliance](#security--compliance)
12. [API Reference](#api-reference)
13. [Integration with Castiel](#integration-with-castiel)
14. [Async Processing](#async-processing)
15. [Related Documentation](#related-documentation)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              ADMIN WORKFLOW (Template Creation)                 │
│  1. Select Source Document (Google Drive/OneDrive)             │
│  2. Extract Placeholders                                        │
│  3. Configure Placeholders                                      │
│  4. Activate Template                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER WORKFLOW (Document Generation)                │
│  1. Browse Available Templates                                 │
│  2. Select Template                                             │
│  3. Select Destination Folder (Drive/OneDrive)                 │
│  4. Provide Context (Optional)                                  │
│  5. Request Generation                                          │
│  6. Receive Generated Document                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACTION SERVICE                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Document Parser (per format)                            │   │
│  │  ├── Google Slides API                                   │   │
│  │  ├── Google Docs API                                     │   │
│  │  ├── Microsoft Graph (Word)                             │   │
│  │  └── Microsoft Graph (PowerPoint)                        │   │
│  │                                                           │   │
│  │  Placeholder Parser                                      │   │
│  │  ├── Regex: /\{\{([^}]+)\}\}/g                          │   │
│  │  ├── Metadata extraction                                 │   │
│  │  ├── Location tracking                                   │   │
│  │  └── Deduplication                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE CONTAINER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Azure Cosmos DB: "document-templates"                   │   │
│  │  ├── DocumentTemplate (root document)                   │   │
│  │  ├── PlaceholderDefinition[]                             │   │
│  │  ├── PlaceholderConfiguration[]                          │   │
│  │  ├── TemplateVersion[] (max 5)                           │   │
│  │  └── dominantColors[] (max 6)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION UI                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tenant Admin Interface                                  │   │
│  │  ├── Edit placeholder type                               │   │
│  │  ├── Set description (AI prompt)                         │   │
│  │  ├── Configure tone, constraints                         │   │
│  │  ├── Chart configuration (if chart type)                │   │
│  │  ├── Link to context template (optional)                 │   │
│  │  └── Preview/test generation                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION SERVICE                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  AI Content Generator                                     │   │
│  │  ├── Build prompt from config                             │   │
│  │  ├── Assemble context (c_contextTemplate)                │   │
│  │  ├── Generate per placeholder                            │   │
│  │  ├── Chart rendering (Google Charts)                    │   │
│  │  └── Validation                                          │   │
│  │                                                           │   │
│  │  Document Rewriter                                        │   │
│  │  ├── Replace placeholders                                 │   │
│  │  ├── Insert charts/images                                │   │
│  │  ├── Preserve styles/layout                              │   │
│  │  └── Create new document                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTPUT STORAGE                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  c_document Shard (Generated)                            │   │
│  │  ├── Links to template (generated_from_template)         │   │
│  │  ├── Links to context (generated_for)                    │   │
│  │  └── Azure Blob Storage                                  │   │
│  │                                                           │   │
│  │  Azure Service Bus                                       │   │
│  │  ├── GenerationJob messages                              │   │
│  │  └── Azure Function workers                              │   │
│  │                                                           │   │
│  │  Notification System                                     │   │
│  │  ├── Success notifications                               │   │
│  │  └── Error notifications                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Document Extractor** | Parse documents, extract placeholders, track locations |
| **Placeholder Parser** | Parse placeholder syntax, extract metadata, deduplicate |
| **Template Container** | Store templates, configurations, version history |
| **Template Service** | Manage templates (CRUD), list for users |
| **Configuration Service** | Manage placeholder configurations, admin UI |
| **AI Generator** | Generate content based on placeholder configs |
| **Chart Renderer** | Generate charts using Google Charts API |
| **Document Rewriter** | Replace placeholders, insert content, preserve styles |
| **Folder Picker** | UI component for selecting Drive/OneDrive folders |
| **Job Queue** | Async processing via Azure Service Bus + Functions |
| **Notification Service** | Send success/error notifications |

---

## Database Architecture

### Template Container Structure

**Storage**: Azure Cosmos DB Container (separate from Shards)  
**Container Name**: `document-templates`  
**Partition Key**: `/tenantId`

### Data Models

#### DocumentTemplate (Root Document)

```typescript
interface DocumentTemplate {
  id: string;                    // UUID
  tenantId: string;              // Partition key
  userId: string;                // Creator
  name: string;                  // Template name
  description?: string;
  documentFormat: 'google_slides' | 'google_docs' | 'word' | 'powerpoint';
  sourceDocumentId: string;       // External ID (Google Drive/OneDrive file ID)
  sourceDocumentUrl?: string;    // Original document URL
  
  // Template Colors (up to 6 dominant colors)
  dominantColors: string[];      // Array of hex colors (max 6)
  
  // Placeholder Configuration
  placeholders: PlaceholderDefinition[];  // All unique placeholders
  
  // Optional Context Template Link
  contextTemplateId?: string;    // Optional link to c_contextTemplate Shard
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  
  // Version History (subdocuments)
  currentVersion: number;        // Current version number
  versions: TemplateVersion[];   // Max 5 previous versions stored as subdocuments
  
  // Status
  status: 'draft' | 'active' | 'archived';
}
```

#### PlaceholderDefinition

```typescript
interface PlaceholderDefinition {
  id: string;                    // Unique placeholder ID
  name: string;                  // Placeholder name (e.g., "company_name")
  rawPlaceholder: string;        // Original text: "{{company_name}}" or "{{company_name:text|min=10}}"
  
  // Extracted Metadata
  type: PlaceholderType;         // 'text' | 'number' | 'email' | 'domain' | 'list' | 'chart' | 'image'
  extractedMetadata?: {          // From placeholder syntax
    min?: number;
    max?: number;
    tone?: string;
    [key: string]: any;
  };
  
  // Admin Configuration (editable by tenant admin)
  configuration: PlaceholderConfiguration;
  
  // Document Locations (where this placeholder appears)
  locations: PlaceholderLocation[];
  
  // Optional Context Link
  contextLink?: {
    contextTemplateId: string;   // Link to c_contextTemplate
    shardField?: string;          // Field to extract from Shard
  };
}

interface PlaceholderConfiguration {
  type: PlaceholderType;         // Admin can override extracted type
  description: string;           // What AI should generate
  tone?: 'formal' | 'casual' | 'marketing' | 'analytical' | 'executive' | 'neutral';
  minLength?: number;            // Characters or words
  maxLength?: number;
  required: boolean;
  
  // Chart-specific config (if type is 'chart')
  chartConfig?: {
    chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'funnel' | 'histogram';
    xAxis?: string;
    yAxis?: string;
    dataset?: 'shards' | 'manual' | 'api' | 'ai';
    dataSource?: {
      type: 'shards' | 'manual' | 'api' | 'ai';
      shardType?: string;        // If from Shards
      shardField?: string;
      apiEndpoint?: string;      // If from API
      manualData?: any[];        // If manual
    };
    filters?: Record<string, any>;
  };
  
  // Preview (generated on test)
  preview?: {
    generatedValue: any;
    generatedAt: Date;
    model: string;
  };
}

interface PlaceholderLocation {
  documentFormat: 'google_slides' | 'google_docs' | 'word' | 'powerpoint';
  elementId: string;             // Element ID in source document
  elementType: 'text' | 'shape' | 'table' | 'header' | 'footer' | 'note';
  pageNumber?: number;           // For slides/pages
  position: {
    startIndex?: number;          // Character index in text
    endIndex?: number;
  };
  context?: string;              // Surrounding text for context
}

type PlaceholderType = 'text' | 'number' | 'email' | 'domain' | 'list' | 'chart' | 'image';
```

#### TemplateVersion (Subdocument)

```typescript
interface TemplateVersion {
  versionNumber: number;
  createdAt: Date;
  createdBy: string;
  
  // Snapshot of template at this version
  name: string;
  placeholders: PlaceholderDefinition[];
  dominantColors: string[];
  
  // Generated document reference
  generatedDocumentId?: string;  // c_document Shard ID
}
```

### Relationships

#### DocumentTemplate → c_document (Generated Documents)
- **Relationship Type**: `generated_from_template`
- **Stored in**: c_document Shard's `internal_relationships`
- **Direction**: c_document → DocumentTemplate (one-way)

#### DocumentTemplate → c_contextTemplate (Optional)
- **Relationship Type**: `uses_context_template`
- **Stored in**: DocumentTemplate's `contextTemplateId` field
- **Direction**: DocumentTemplate → c_contextTemplate (reference only)

#### c_document → c_project/c_opportunity/etc. (Context)
- **Relationship Type**: `generated_for`
- **Stored in**: c_document Shard's `internal_relationships`
- **Direction**: c_document → Source Shard

---

## Workflow

### Admin Workflow: Template Creation

#### Step 1: Admin Selects Source Document

Tenant admin points to a Google Drive or OneDrive document:
- Paste document URL
- Select from file picker (OAuth)
- Upload document (future)

**Supported Formats**:
- Google Slides (`.gslides`)
- Google Docs (`.gdoc`)
- Microsoft Word (`.docx`)
- Microsoft PowerPoint (`.pptx`)

#### Step 2: Placeholder Extraction

System automatically:
1. Authenticates with Google/Microsoft APIs
2. Reads document content
3. Extracts all placeholders using regex: `/\{\{([^}]+)\}\}/g`
4. Parses placeholder metadata (type, constraints)
5. Tracks all locations where each placeholder appears
6. Deduplicates placeholders (same name = one definition)

**Extraction Locations**:
- **Google Slides**: Text boxes, shapes, tables, speaker notes
- **Google Docs**: Paragraphs, headers, tables, inline text
- **Word**: Paragraphs, headers/footers, tables, content controls
- **PowerPoint**: Text boxes, shapes, tables, notes

#### Step 3: Placeholder Configuration (Admin UI)

Tenant admin configures each placeholder:

**Editable Fields**:
- **Type**: Override auto-detected type
- **Description**: What AI should generate (required)
- **Tone**: formal, casual, marketing, analytical, executive, neutral
- **Constraints**: Min/max length (characters or words)
- **Required/Optional**: Flag for validation
- **Chart Config** (if chart type):
  - Chart type: bar, line, pie, area, scatter, funnel, histogram
  - X/Y axis fields
  - Data source: shards, manual, API, AI
  - Filters
- **Context Link** (optional):
  - Link to `c_contextTemplate` Shard
  - Specify field to extract from related Shards

**Template Colors**:
- Admin can set up to 6 dominant colors (hexadecimal)
- Used for chart colors and theme consistency
- UI: shadcn color picker

**Preview/Test**:
- Test generation for individual placeholders
- Preview generated content before full generation
- Validate constraints

#### Step 4: Template Activation

Admin activates template for use:
- Set status to `active`
- Template becomes available to users
- Admin can archive inactive templates

---

### User Workflow: Document Generation

#### Step 1: User Selects Template

User browses available templates:
- View all active templates in tenant
- Filter by format (Slides, Docs, Word, PowerPoint)
- Filter by category (if implemented)
- Preview template details

**Template List Display**:
- Template name
- Document format
- Number of placeholders
- Last updated date
- Preview thumbnail (future)

#### Step 2: User Selects Destination Folder

User specifies where generated document should be stored:
- **Google Drive**: Use Google Drive folder picker
- **OneDrive**: Use OneDrive folder picker
- Folder must be accessible to user's OAuth account
- Folder ID stored in generation request

**Folder Selection UI**:
- Folder picker component (Google/OneDrive SDK)
- Display selected folder path
- Allow changing folder before generation

#### Step 3: User Provides Context (Optional)

User can optionally link context Shard:
- Select project, opportunity, company, etc.
- Context used to auto-fill placeholders (if template has context template linked)
- User can override placeholder values

#### Step 4: User Requests Generation

User triggers document generation:
- Review template and folder selection
- Optionally provide manual overrides for placeholders
- Submit generation request
- Receive job ID for tracking

#### Step 5: AI Content Generation

System processes generation request:

1. **Build Generation Prompts**:
   - For each placeholder, build prompt from configuration
   - Include description, tone, constraints
   - Include context from linked Shards (if context template linked)

2. **Assemble Context** (if `contextTemplateId` provided):
   - Load `c_contextTemplate` Shard
   - Traverse relationships (company, project, opportunity)
   - Extract field values for placeholders
   - Merge with user-provided overrides

3. **Generate Content**:
   - Call AI model (via Model Provider)
   - Generate value for each placeholder
   - Validate constraints (length, format)
   - Generate chart data (if chart type)

4. **Render Charts** (if needed):
   - Use Google Charts API
   - Apply template dominant colors
   - Generate PNG/SVG images
   - Store in Azure Blob Storage

5. **Validate**:
   - Check all required placeholders have values
   - Validate format constraints
   - Flag warnings for review

#### Step 6: Document Rewriting

System creates new document with generated content:

1. **Copy Original Document**:
   - Create duplicate via Google/Microsoft APIs
   - Preserve all styles, fonts, themes, layout

2. **Replace Placeholders**:
   - For each placeholder location:
     - Replace `{{placeholder}}` with generated value
     - Preserve surrounding formatting
     - Handle multiline replacements

3. **Insert Charts/Images**:
   - Upload chart images to document
   - Position in placeholder locations
   - Resize to match original shape dimensions
   - Apply theme colors

4. **Create Output**:
   - Save as new document in user's selected Drive/OneDrive folder
   - **App does NOT store the file** - only creates record
   - Create `c_document` Shard with metadata
   - Link to template via `generated_from_template`
   - Link to context Shard via `generated_for` (if provided)
   - Store document URL and folder location in Shard

**c_document Shard Metadata**:
```typescript
{
  structuredData: {
    name: "Generated Document Name",
    documentType: "presentation" | "document",
    source: "google_drive" | "onedrive",
    documentUrl: "https://docs.google.com/presentation/d/...",
    folderId: "drive-folder-id",
    folderPath: "/My Documents/Generated",
    templateId: "template-uuid",
    generatedAt: "2025-12-01T10:00:00Z",
    generationMetadata: {
      model: "gpt-4",
      tokensUsed: 4500,
      placeholdersGenerated: 12,
      contextShardId: "project-uuid" // Optional
    }
  },
  internal_relationships: [
    {
      targetShardId: "template-uuid",
      relationshipType: "generated_from_template"
    },
    {
      targetShardId: "project-uuid", // If context provided
      relationshipType: "generated_for"
    }
  ]
}
```

#### Step 7: User Notification

User receives notification:
- Success: Document generated, link to view
- Error: Generation failed, error details
- Notification includes document URL (if successful)

#### Step 8: User Access

User can:
- View generated document via link in notification
- Access document in their Drive/OneDrive folder
- View document record in Castiel (c_document Shard)
- Download document from Drive/OneDrive

---

### Version Management (Admin)

After generation:
- Create new version snapshot in template
- Store in `versions` array (max 5 previous versions)
- Link generated document ID to version
- Allow rollback to previous version
- Show diff between versions

---

## Placeholder Format Specification

### General Syntax

```
{{ NAME }}
{{ NAME: type }}
{{ NAME: type|key=value|key=value }}
```

### Allowed Characters

- `name` must be alphanumeric with underscores: `[a-zA-Z0-9_]+`
- `type` must be one of: `text`, `number`, `email`, `domain`, `list`, `chart`, `image`
- `key=value` pairs are optional metadata

### Placeholder Types

#### Text Placeholder

```
{{ product_description: text|min=50|max=200|tone=formal }}
```

**Metadata**:
- `min`: Minimum length (characters)
- `max`: Maximum length (characters)
- `tone`: formal, casual, marketing, analytical, executive, neutral
- `domain_context`: sales, finance, HR, etc.

#### Number Placeholder

```
{{ avg_deal_size: number|min=0|max=500000 }}
```

AI generates a precise numeric value, optionally formatted with currency.

#### List Placeholder

```
{{ top_industries: list|min=3|max=10|item_type=text }}
```

Generated as bullet list or table (depending on document context).

#### Email Placeholder

```
{{ contact_email: email }}
```

Generates valid email based on domain or project context.

#### Domain Placeholder

```
{{ vendor_domain: domain }}
```

AI returns domain name (e.g., `company.com`).

#### Chart Placeholder

**Minimal**:
```
{{ sales_chart: chart }}
```

**Detailed**:
```
{{ revenue_forecast: chart|type=line|x=month|y=revenue|dataset=sales_forecast_q1|filter=region:emea }}
```

**Metadata**:
- `type`: bar, line, pie, area, scatter, funnel, histogram
- `x`: X-axis field name
- `y`: Y-axis field name
- `dataset`: Data source identifier
- `filter`: Optional filters (key:value pairs)

---

## Placeholder Extraction

### Extraction Process

1. **Document Parsing**:
   - Authenticate with Google/Microsoft APIs
   - Read document structure (pages, elements, text)
   - Extract all text content

2. **Regex Matching**:
   - Pattern: `/\{\{([^}]+)\}\}/g`
   - Find all placeholder occurrences
   - Capture full placeholder text

3. **Metadata Parsing**:
   - Parse `NAME: type|key=value|key=value` format
   - Extract type (default: `text` if not specified)
   - Extract key-value pairs
   - Validate syntax

4. **Location Tracking**:
   - Record element ID where placeholder found
   - Record page/slide number
   - Record character position (start/end index)
   - Capture surrounding context text

5. **Deduplication**:
   - Group placeholders by name
   - Create single `PlaceholderDefinition` per unique name
   - Track all locations in `locations` array

### Extraction Examples

**Google Slides**:
- Text box: `{{company_name}}` at slide 1, text box ID `abc123`
- Shape: `{{product_description: text|tone=marketing}}` at slide 2, shape ID `def456`
- Table cell: `{{revenue: number}}` at slide 3, table ID `ghi789`, cell (2,3)

**Google Docs**:
- Paragraph: `{{executive_summary: text|min=100|max=300}}` at paragraph index 5
- Header: `{{document_title}}` at header level 1
- Table: `{{quarterly_data: chart|type=bar}}` at table index 2

---

## Placeholder Configuration

### Configuration UI

Tenant admin interface for editing placeholders:

**Configuration Form**:
- **Placeholder Name**: Display name (read-only)
- **Type**: Dropdown (text, number, email, domain, list, chart, image)
- **Description**: Textarea (required) - "What should AI generate?"
- **Tone**: Dropdown (formal, casual, marketing, analytical, executive, neutral)
- **Min Length**: Number input (characters or words)
- **Max Length**: Number input (characters or words)
- **Required**: Checkbox
- **Chart Config** (if chart type):
  - Chart Type: Dropdown
  - X Axis: Text input
  - Y Axis: Text input
  - Data Source: Radio (shards, manual, API, AI)
  - Filters: Key-value pairs
- **Context Link** (optional):
  - Context Template: Shard picker (c_contextTemplate)
  - Shard Field: Text input

**Template Colors**:
- Color picker (shadcn) for up to 6 dominant colors
- Hexadecimal format
- Used for charts and theme consistency

**Preview/Test**:
- "Test Generation" button per placeholder
- Shows generated preview
- Displays model used, generation time
- Allows regeneration

### Validation

Before generation:
- All required placeholders must have description
- Chart placeholders must have chart config
- Context-linked placeholders must have valid context template
- Min/max length constraints must be valid

---

## AI Content Generation

### Prompt Building

For each placeholder, build prompt:

```typescript
const prompt = `
Generate ${placeholder.configuration.type} content:

Description: ${placeholder.configuration.description}
Tone: ${placeholder.configuration.tone || 'neutral'}
Constraints: ${minLength ? `Min ${minLength} characters` : ''} ${maxLength ? `Max ${maxLength} characters` : ''}

${context ? `Context: ${JSON.stringify(context)}` : ''}

Output only the generated content, no explanations.
`;
```

### Context Assembly

If `contextTemplateId` is linked:

1. Load `c_contextTemplate` Shard
2. Get source Shard (project, opportunity, etc.)
3. Traverse relationships:
   - `has_client` → `c_company`
   - `has_stakeholder` → `c_contact[]`
   - `has_opportunity` → `c_opportunity`
4. Extract field values for placeholders
5. Merge with user-provided overrides (user values take precedence)

### Chart Generation

For chart placeholders:

1. **Get Data**:
   - If `shards`: Extract from related Shards
   - If `manual`: Use provided data
   - If `api`: Call API endpoint
   - If `ai`: Generate sample data via AI

2. **Render Chart**:
   - Use Google Charts API
   - Apply chart type (bar, line, pie, etc.)
   - Apply template dominant colors
   - Generate PNG/SVG image
   - Upload to Azure Blob Storage

3. **Insert Chart**:
   - Replace placeholder with chart image
   - Resize to match original shape dimensions
   - Preserve aspect ratio

---

## Document Rewriting

### Rewriting Process

1. **Create Duplicate**:
   - Use Google/Microsoft APIs to copy original document
   - Preserve all styles, fonts, themes, layout

2. **Replace Text Placeholders**:
   - For each placeholder location:
     - Find placeholder text in element
     - Replace with generated value
     - Preserve surrounding formatting
     - Handle multiline text

3. **Insert Charts**:
   - Upload chart image to Drive/OneDrive
   - Insert image at placeholder location
   - Resize to match original shape
   - Apply theme colors if applicable

4. **Insert Lists**:
   - Convert list data to bullets or table
   - Match document style
   - Preserve formatting

5. **Create Output**:
   - Save as new document
   - Set sharing permissions
   - Return document URL/ID

### Style Preservation

- Fonts: Preserve original font families
- Colors: Use template dominant colors for charts
- Layout: Maintain original layout structure
- Themes: Preserve document theme

---

## Version Management

### Version Creation

After each generation:
1. Create version snapshot
2. Store in `versions` array (max 5)
3. Include:
   - Template name
   - Placeholder configurations
   - Dominant colors
   - Generated document ID

### Version Rollback

- Admin can rollback to any previous version
- Restores placeholder configurations
- Can regenerate from previous version

### Version Diff

- Show differences between versions
- Highlight changed placeholders
- Show color changes
- Display generated document links

---

## Supported Formats

| Format | Status | Extraction | Generation | Notes |
|--------|--------|-------------|------------|-------|
| **Google Slides** | ✅ Phase 1 | Full | Full | Text, shapes, tables, notes |
| **Google Docs** | 🔄 Phase 2 | Full | Full | Paragraphs, headers, tables |
| **Microsoft Word** | 🔄 Phase 3 | Full | Full | Paragraphs, headers, tables |
| **Microsoft PowerPoint** | 🔄 Phase 4 | Full | Full | Text, shapes, tables, notes |

See format-specific documentation:
- [Google Slides](./GOOGLE-SLIDES.md)
- [Google Docs](./GOOGLE-DOCS.md)
- [OneDrive Word](./ONEDRIVE-WORD.md)
- [OneDrive PowerPoint](./ONEDRIVE-POWERPOINT.md)

---

## Security & Compliance

### Authentication

**Google**:
- OAuth2 with scopes: `drive.readonly`, `presentations`, `documents`, `drive.file`
- Service Account (optional, for server-to-server)
- Token storage: Encrypted in database
- User tokens required for folder access and document creation

**Microsoft**:
- OAuth2 with Azure AD
- Scopes: `Files.ReadWrite`, `Files.ReadWrite.All`, `offline_access`
- Token storage: Encrypted in database
- User tokens required for folder access and document creation

### Tenant Isolation

- All templates scoped by `tenantId` (partition key)
- Users can only access templates in their tenant
- Generated documents inherit tenant isolation
- Users can only generate to folders they have access to

### Data Handling

- **No file storage**: App does NOT store generated document files
- **Metadata only**: Only c_document Shard record is stored
- **Document location**: Documents stored in user's Drive/OneDrive folder
- **OAuth tokens**: Encrypted at rest
- **GDPR compatible**: User can delete templates/data, documents remain in their Drive/OneDrive

### Access Control

**Template Management**:
- **Template Creation**: Tenant admin only
- **Template Configuration**: Tenant admin only
- **Template Activation/Deactivation**: Tenant admin only
- **Template Viewing**: All users in tenant (active templates only)

**Document Generation**:
- **Generation Request**: All users in tenant (unless restricted by admin)
- **Template Selection**: Users can see all active templates
- **Folder Selection**: Users can only select folders they have access to
- **Context Linking**: Users can link their accessible Shards (projects, opportunities, etc.)

**Generated Documents**:
- **Document Ownership**: User who generated owns the document
- **Document Location**: Stored in user's selected Drive/OneDrive folder
- **Document Access**: User accesses via Drive/OneDrive (not stored in Castiel)
- **Record Access**: c_document Shard follows standard ACL rules

---

## API Reference

### Extract Placeholders

```http
POST /api/v1/content/templates/extract
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentUrl": "https://docs.google.com/presentation/d/...",
  "documentFormat": "google_slides",
  "name": "Sales Pitch Template"
}
```

**Response**:
```json
{
  "templateId": "template-uuid",
  "placeholders": [
    {
      "id": "placeholder-uuid",
      "name": "company_name",
      "rawPlaceholder": "{{company_name}}",
      "type": "text",
      "locations": [
        {
          "elementId": "abc123",
          "pageNumber": 1,
          "elementType": "text"
        }
      ]
    }
  ],
  "dominantColors": []
}
```

### Configure Placeholder

```http
PUT /api/v1/content/templates/{templateId}/placeholders/{placeholderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "configuration": {
    "type": "text",
    "description": "Target company name for this sales pitch",
    "tone": "formal",
    "minLength": 2,
    "maxLength": 100,
    "required": true
  },
  "contextLink": {
    "contextTemplateId": "context-template-uuid",
    "shardField": "company.name"
  }
}
```

### Update Template Colors

```http
PUT /api/v1/content/templates/{templateId}/colors
Authorization: Bearer {token}
Content-Type: application/json

{
  "dominantColors": ["#0066FF", "#00AACC", "#FF6B35", "#7B2CBF", "#2EC4B6", "#1A1A1A"]
}
```

### Test Placeholder Generation

```http
POST /api/v1/content/templates/{templateId}/placeholders/{placeholderId}/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "contextShardId": "project-uuid"  // Optional
}
```

**Response**:
```json
{
  "preview": {
    "generatedValue": "Acme Corporation",
    "generatedAt": "2025-12-01T10:00:00Z",
    "model": "gpt-4"
  }
}
```

### List Templates (User)

```http
GET /api/v1/content/templates?status=active&format=google_slides
Authorization: Bearer {token}
```

**Response**:
```json
{
  "templates": [
    {
      "id": "template-uuid",
      "name": "Sales Pitch Deck",
      "description": "Professional sales presentation",
      "documentFormat": "google_slides",
      "placeholderCount": 12,
      "updatedAt": "2025-12-01T10:00:00Z",
      "createdBy": "admin-user-id"
    }
  ]
}
```

### Get Template Details

```http
GET /api/v1/content/templates/{templateId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "template-uuid",
  "name": "Sales Pitch Deck",
  "documentFormat": "google_slides",
  "placeholders": [
    {
      "id": "placeholder-uuid",
      "name": "company_name",
      "type": "text",
      "required": true,
      "description": "Target company name"
    }
  ],
  "dominantColors": ["#0066FF", "#00AACC"]
}
```

### Generate Document

```http
POST /api/v1/content/templates/{templateId}/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "destinationFolder": {
    "provider": "google_drive",  // or "onedrive"
    "folderId": "drive-folder-id"
  },
  "contextShardId": "project-uuid",  // Optional
  "options": {
    "skipPlaceholders": ["placeholder-uuid-1"],
    "overrideValues": {
      "company_name": "Manual Override"
    }
  }
}
```

**Response (Sync - small documents)**:
```json
{
  "jobId": "job-uuid",
  "status": "completed",
  "generatedDocumentId": "document-uuid",
  "documentUrl": "https://docs.google.com/presentation/d/...",
  "folderPath": "/My Documents/Generated",
  "generatedAt": "2025-12-01T10:00:00Z"
}
```

**Response (Async - large documents)**:
```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "estimatedCompletionMs": 30000,
  "statusUrl": "/api/v1/content/jobs/job-uuid"
}
```

**Response (Sync - small documents)**:
```json
{
  "jobId": "job-uuid",
  "status": "completed",
  "generatedDocumentId": "document-uuid",
  "outputUrl": "https://docs.google.com/presentation/d/...",
  "generatedAt": "2025-12-01T10:00:00Z"
}
```

**Response (Async - large documents)**:
```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "estimatedCompletionMs": 30000,
  "statusUrl": "/api/v1/content/jobs/job-uuid"
}
```

### Get Job Status

```http
GET /api/v1/content/jobs/{jobId}
Authorization: Bearer {token}
```

### Get Generated Document

```http
GET /api/v1/content/documents/{documentId}
Authorization: Bearer {token}
```

**Response**:
```json
{
  "id": "document-uuid",
  "name": "Sales Pitch - Acme Corp",
  "documentUrl": "https://docs.google.com/presentation/d/...",
  "folderPath": "/My Documents/Generated",
  "templateId": "template-uuid",
  "templateName": "Sales Pitch Deck",
  "generatedAt": "2025-12-01T10:00:00Z",
  "generationMetadata": {
    "model": "gpt-4",
    "tokensUsed": 4500,
    "placeholdersGenerated": 12
  }
}
```

### List User's Generated Documents

```http
GET /api/v1/content/documents?templateId={templateId}
Authorization: Bearer {token}
```

### Rollback Version

```http
POST /api/v1/content/templates/{templateId}/rollback
Authorization: Bearer {token}
Content-Type: application/json

{
  "versionNumber": 2
}
```

---

## Integration with Castiel

### Existing Systems Used

| System | Usage |
|--------|-------|
| **Shard System** | Store generated documents as `c_document` Shards |
| **c_contextTemplate** | Optional context assembly for placeholders |
| **c_assistant** | AI personality/tone (future enhancement) |
| **Model Provider** | AI model selection and routing |
| **Tenant Isolation** | All operations scoped by `tenantId` |
| **Azure Blob Storage** | Store chart images, generated assets |
| **Notification System** | Send success/error notifications for jobs |
| **Azure Service Bus** | Async job queue |
| **Azure Functions** | Generation workers |

### New Components

| Component | Purpose |
|-----------|---------|
| **Template Container** | Cosmos DB container for templates (not Shards) |
| **Document Extractor** | Parse Google/Microsoft documents |
| **Placeholder Parser** | Extract and parse placeholders |
| **Configuration Service** | Manage placeholder configurations |
| **Document Rewriter** | Replace placeholders, insert content |
| **Chart Renderer** | Generate charts via Google Charts API |

---

## Async Processing

### Job Queue Architecture

**Azure Service Bus**:
- Topic: `content-generation`
- Messages: `GenerationJob` objects
- Partitioning: By `tenantId`

**Azure Functions**:
- Function: `ContentGenerationWorker`
- Trigger: Service Bus topic subscription
- Processing:
  1. Read template from container
  2. Generate content for all placeholders
  3. Rewrite document
  4. Create `c_document` Shard
  5. Send notification (success/error)

### Job Status Flow

```
pending → processing → completed
                    ↓
                 failed
```

### User Token Management

**Critical**: Generation jobs require user's OAuth token:
- User token stored in job message (encrypted)
- Token used to access user's Drive/OneDrive folder
- Token used to create document in user's folder
- Token refreshed if expired during processing

**Token Storage**:
- Tokens encrypted in job message
- Tokens not stored long-term
- Tokens scoped to specific operations

### Notification Integration

**Success Notification**:
```typescript
await notificationService.create({
  type: 'content_generation_completed',
  tenantId: job.tenantId,
  userId: job.userId,
  title: 'Document generation completed',
  summary: `Template "${template.name}" generated successfully`,
  content: {
    templateId: template.id,
    templateName: template.name,
    generatedDocumentId: document.id,
    documentUrl: document.structuredData.documentUrl,
    folderPath: document.structuredData.folderPath,
    actionUrl: document.structuredData.documentUrl  // Direct link to document
  },
  priority: 'normal'
});
```

**Error Notification**:
```typescript
await notificationService.create({
  type: 'content_generation_failed',
  tenantId: job.tenantId,
  userId: job.userId,
  title: 'Document generation failed',
  summary: `Template "${template.name}" generation failed: ${error.message}`,
  content: {
    templateId: template.id,
    jobId: job.jobId,
    error: error.message
  },
  priority: 'high'
});
```

### Job Monitoring

- Track job status in Service Bus
- Store job metadata in Cosmos DB (optional)
- Monitor queue depth
- Alert on failed jobs

---

## Related Documentation

| Document | Description |
|---------|-------------|
| [Google Slides Guide](./GOOGLE-SLIDES.md) | Complete Google Slides implementation |
| [Google Docs Guide](./GOOGLE-DOCS.md) | Complete Google Docs implementation |
| [OneDrive Word Guide](./ONEDRIVE-WORD.md) | Complete Word implementation |
| [OneDrive PowerPoint Guide](./ONEDRIVE-POWERPOINT.md) | Complete PowerPoint implementation |
| [Configuration](./CONFIGURATION.md) | Environment variables and settings |
| [Implementation TODO](./IMPLEMENTATION_TODO.md) | Phase-by-phase implementation plan |
| [c_document](../shards/core-types/c_document.md) | Document ShardType |
| [c_contextTemplate](../shards/core-types/c_contextTemplate.md) | Context assembly |
| [Notification System](../ai-insights/NOTIFICATIONS.md) | Notification service |

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintainer**: Castiel Development Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Mostly Complete** - Content generation system implemented

#### Implemented Features (✅)

- ✅ Document template management
- ✅ Placeholder extraction
- ✅ Placeholder configuration
- ✅ AI content generation
- ✅ Document rewriting
- ✅ Version management
- ✅ Multi-format support (Google Slides, Google Docs, Word, PowerPoint)
- ✅ Context integration with Castiel Shards
- ✅ Chart generation
- ✅ Async processing

#### Known Limitations

- ⚠️ **Template Testing** - Template testing interface may not be fully implemented
- ⚠️ **Error Recovery** - Error recovery in async processing may need improvement
- ⚠️ **Rate Limiting** - Rate limiting for external APIs may not be fully implemented

### Code References

- **Backend Services:**
  - `apps/api/src/services/content-generation/` - Content generation services
  - `apps/api/src/services/content-generation/template.service.ts` - Template management
  - `apps/api/src/services/content-generation/generation-processor.service.ts` - Generation processing (1,774 lines)

- **API Routes:**
  - `/api/v1/content-generation/*` - Content generation endpoints
  - `/api/v1/templates/*` - Template management
  - `/api/v1/document-templates/*` - Document template management

- **Frontend:**
  - `apps/web/src/components/content-generation/` - Content generation UI

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Implementation TODO](./IMPLEMENTATION_TODO.md) - Implementation plan
