# Knowledge Base Module - Complete Specification v2.0 (Part 1)

**Notion-like Collaborative Knowledge Management with AI Integration**

---

## EXECUTIVE SUMMARY

This specification defines a comprehensive Knowledge Base module that:
- **Matches Notion's capabilities**: Block-based editing, databases, multiple views, rich content
- **Deeply integrates with IDE**: Links to code, tasks, plans, projects
- **AI-powered throughout**: Content creation, organization, extraction, discovery
- **Flexible organization**: Categories, tags, collections, hierarchies, custom properties
- **Real-time collaboration**: Multiplayer editing, comments, sharing
- **Extensible**: API-first, integrations, templates

---

## TABLE OF CONTENTS

**Part 1 (This Document):**
1. Vision & Core Principles
2. Content Model & Architecture
3. Organization System
4. Block-Based Editor
5. AI Integration Overview

**Part 2:**
6. Collaboration Features
7. Integration with Planning Module
8. Database Schema
9. API Endpoints
10. UI Components

---

## 1. VISION & CORE PRINCIPLES

### 1.1 Vision Statement

Create the **central knowledge hub** for the Coder IDE that:
- Serves as the team's single source of truth
- Automatically captures knowledge from code, conversations, and commits
- Enables flexible, powerful organization without rigid structure
- Leverages AI to eliminate knowledge management overhead
- Deeply integrates with Planning, Tasks, and entire workflow

### 1.2 Core Principles

**1. Flexibility First**
- No forced structure - users create their own organization systems
- Multiple simultaneous organization methods (folders, tags, properties, categories)
- Rich content types beyond text (code, tables, databases, diagrams, embeds)
- Any page can contain anything

**2. AI as Co-Pilot**
- AI assists at every step: writing, organizing, searching, extracting
- Proactive suggestions, not just reactive commands
- Learns from user behavior and improves over time
- Transparent - always show why AI suggests something

**3. Integration-Centric**
- Two-way deep integration with Planning Module
- Links to code, tasks, projects, conversations
- Bidirectional sync with external tools
- API-first for extensibility

**4. Collaboration-Ready**
- Real-time multiplayer editing
- Granular permissions and sharing
- Comments and discussions
- Version history and change tracking

**5. Performance at Scale**
- Instant search across thousands of pages
- Fast loading even for large databases
- Efficient real-time sync
- Offline-capable

---

## 2. CONTENT MODEL & ARCHITECTURE

### 2.1 Hierarchical Structure

```
Workspace (Top-level container for organization)
  ├─ Space (Team, Project, or Topic-based grouping)
  │   ├─ Page (Core content unit)
  │   │   ├─ Sub-Page (Infinite nesting)
  │   │   │   └─ Blocks (Atomic content pieces)
  │   │   └─ Blocks
  │   └─ Database (Special page with structured data)
  │       └─ Database Items (Each item is a page)
  └─ Space
```

### 2.2 Core Entities

#### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  icon?: string;  // Emoji or icon identifier
  description?: string;
  
  // Ownership
  ownerId: string;
  teamId?: string;
  
  // Settings
  defaultSpaceId?: string;
  theme?: 'light' | 'dark' | 'auto';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Purpose**: Container for all knowledge, typically one per team or organization

#### Space
```typescript
interface Space {
  id: string;
  workspaceId: string;
  
  // Identity
  name: string;
  icon?: string;
  cover?: string;  // Cover image URL
  description?: string;
  
  // Type
  type: 'personal' | 'team' | 'project' | 'wiki' | 'custom';
  
  // Settings
  defaultViewType: 'page' | 'table' | 'board' | 'calendar' | 'gallery';
  sidebarPosition: number;  // Order in sidebar
  
  // Permissions
  isPublic: boolean;
  permissions: Permission[];
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Purpose**: Logical grouping of related pages (e.g., "Engineering", "Product", "Project Alpha")

#### Page
```typescript
interface Page {
  id: string;
  spaceId: string;
  parentPageId?: string;  // null for top-level pages
  
  // Content
  title: string;
  icon?: string;
  cover?: {
    type: 'image' | 'gradient' | 'color';
    value: string;
  };
  
  // Organization
  path: string;  // Full hierarchical path "/space/parent/page"
  level: number;  // Nesting depth (0 = top-level)
  position: number;  // Order among siblings
  
  // Properties (custom fields - Notion-style)
  properties: Record<string, PropertyValue>;
  
  // Classification
  categoryIds: string[];  // Multiple categories allowed
  tags: string[];  // Tag names
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  lastEditedBy: string;
  lastEditedAt: Date;
  
  // Version control
  version: number;
  
  // Status
  isTemplate: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  
  // User-specific
  favorites: string[];  // User IDs who favorited
  
  // Links
  linkedPages: string[];  // Manually linked pages
  linkedProjects: string[];  // IDE project links
  linkedTasks: string[];  // Task links
  linkedPlans: string[];  // Plan links
  
  // Statistics
  viewCount: number;
  editCount: number;
  commentCount: number;
  
  // AI-generated
  summary?: string;  // AI summary of content
  suggestedLinks?: string[];  // AI-suggested related pages
}
```

**Purpose**: Core content unit - can be a document, database, or any rich content

#### Block
```typescript
interface Block {
  id: string;
  pageId: string;
  parentBlockId?: string;  // For nested blocks (list items, toggle children)
  
  // Type
  type: BlockType;
  
  // Content
  content: BlockContent;
  
  // Formatting
  format?: BlockFormat;
  
  // Position
  position: number;  // Order among siblings
  level: number;  // Indentation/nesting level
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  
  // Comments
  hasComments: boolean;
  commentCount: number;
}

type BlockType = 
  // Text
  | 'paragraph'
  | 'heading_1' | 'heading_2' | 'heading_3'
  | 'bulleted_list' | 'numbered_list'
  | 'todo' | 'toggle'
  | 'quote' | 'callout'
  
  // Code
  | 'code'
  
  // Media
  | 'image' | 'video' | 'audio' | 'file' | 'pdf'
  
  // Embeds
  | 'embed' | 'bookmark'
  
  // Advanced
  | 'table' | 'database_inline'
  | 'equation' | 'diagram'
  
  // IDE-specific
  | 'code_reference'  // Link to specific code
  | 'task_reference'  // Link to task
  | 'plan_reference'  // Link to plan
  | 'conversation_snippet'  // Quote from conversation
  
  // Layout
  | 'divider'
  | 'table_of_contents'
  | 'breadcrumb'
  | 'column_list'  // Multi-column layout
  | 'column';  // Single column in column_list
```

### 2.3 Rich Text Model

```typescript
interface RichText {
  text: string;
  
  // Formatting
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  
  // Styling
  color?: TextColor;
  backgroundColor?: TextColor;
  
  // Links
  link?: {
    type: 'url' | 'page' | 'user' | 'date';
    url?: string;
    pageId?: string;
    userId?: string;
    date?: Date;
  };
  
  // Mentions
  mention?: {
    type: 'user' | 'page' | 'date' | 'reminder';
    id: string;
    name?: string;
  };
  
  // Math
  equation?: {
    latex: string;
  };
}

type TextColor = 
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow'
  | 'green' | 'blue' | 'purple' | 'pink' | 'red';
```

### 2.4 Block Content Types

```typescript
interface BlockContent {
  // Text blocks
  text?: RichText[];
  
  // Code block
  code?: {
    language: string;
    code: string;
    caption?: RichText[];
    showLineNumbers?: boolean;
    highlightedLines?: number[];
    theme?: 'light' | 'dark';
  };
  
  // Media blocks
  file?: {
    type: 'image' | 'video' | 'audio' | 'pdf' | 'file';
    url: string;
    name?: string;
    size?: number;
    caption?: RichText[];
    
    // Image-specific
    width?: number;
    height?: number;
    
    // File metadata
    uploadedBy?: string;
    uploadedAt?: Date;
  };
  
  // Embed block
  embed?: {
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    provider?: string;  // youtube, figma, etc.
  };
  
  // Bookmark block
  bookmark?: {
    url: string;
    title?: string;
    description?: string;
    favicon?: string;
    cover?: string;
  };
  
  // Table block
  table?: {
    hasColumnHeaders: boolean;
    hasRowHeaders: boolean;
    columns: TableColumn[];
    rows: TableRow[];
  };
  
  // Todo block
  todo?: {
    checked: boolean;
  };
  
  // Callout block
  callout?: {
    icon: string;
    color: TextColor;
  };
  
  // Toggle block (has children)
  toggle?: {
    isOpen: boolean;
  };
  
  // Equation block
  equation?: {
    latex: string;
    display?: 'inline' | 'block';
  };
  
  // Diagram block
  diagram?: {
    type: 'mermaid' | 'plantuml' | 'graphviz';
    code: string;
    renderedSvg?: string;
  };
  
  // References (IDE-specific)
  reference?: {
    type: 'code' | 'task' | 'plan' | 'conversation';
    targetId: string;
    displayText?: string;
    
    // Code reference specific
    filePath?: string;
    lineStart?: number;
    lineEnd?: number;
    snippet?: string;
    
    // Task/Plan specific
    title?: string;
    status?: string;
    
    // Conversation specific
    excerpt?: string;
    author?: string;
    timestamp?: Date;
  };
  
  // Column layout
  columns?: {
    columnRatio?: number[];  // Relative widths [1, 2] = 1/3 and 2/3
  };
}
```

### 2.5 Database Model (Notion-style)

```typescript
/**
 * Databases are special pages that contain structured data
 * Can be displayed as: table, board, calendar, gallery, list, timeline
 */

interface Database {
  id: string;
  pageId: string;  // Database is a special type of page
  workspaceId: string;
  
  // Schema
  schema: DatabaseSchema;
  
  // Views
  views: DatabaseView[];
  defaultViewId: string;
  
  // Settings
  settings: {
    allowCreation: boolean;
    allowDeletion: boolean;
    allowPropertyEditing: boolean;
    showDescription: boolean;
  };
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DatabaseSchema {
  properties: DatabaseProperty[];
}

interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  description?: string;
  
  // Configuration based on type
  config: PropertyConfig;
  
  // UI settings
  width?: number;
  visible?: boolean;
  position?: number;
}

type PropertyType =
  | 'title'           // Text - one per database (required)
  | 'rich_text'       // Multi-line rich text
  | 'number'          // Number
  | 'select'          // Single select dropdown
  | 'multi_select'    // Multiple select dropdown
  | 'status'          // Status with workflow
  | 'date'            // Date or date range
  | 'person'          // User(s)
  | 'files'           // File attachments
  | 'checkbox'        // Boolean
  | 'url'             // URL
  | 'email'           // Email address
  | 'phone'           // Phone number
  | 'formula'         // Calculated field
  | 'relation'        // Relation to another database
  | 'rollup'          // Aggregate from relation
  | 'created_time'    // Auto-filled creation time
  | 'created_by'      // Auto-filled creator
  | 'last_edited_time'  // Auto-filled last edit time
  | 'last_edited_by';   // Auto-filled last editor

interface PropertyConfig {
  // Select/Multi-select
  options?: SelectOption[];
  
  // Number
  numberFormat?: 'number' | 'dollar' | 'euro' | 'pound' | 'yen' | 'percent';
  
  // Date
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'relative';
  includeTime?: boolean;
  
  // Formula
  formula?: {
    expression: string;
    type: 'string' | 'number' | 'boolean' | 'date';
  };
  
  // Relation
  relation?: {
    targetDatabaseId: string;
    type: 'single' | 'multiple';
    twoWay?: boolean;
    twoWayPropertyId?: string;
  };
  
  // Rollup
  rollup?: {
    relationPropertyId: string;
    targetPropertyId: string;
    aggregation: 'count' | 'count_unique' | 'sum' | 'average' | 'min' | 'max' | 'range' | 'show_original';
  };
}

interface SelectOption {
  id: string;
  name: string;
  color: TextColor;
}

interface DatabaseView {
  id: string;
  databaseId: string;
  name: string;
  type: 'table' | 'board' | 'calendar' | 'gallery' | 'list' | 'timeline';
  
  // Filters
  filters: ViewFilter[];
  filterOperator?: 'and' | 'or';
  
  // Sorts
  sorts: ViewSort[];
  
  // Grouping
  groupBy?: string;  // Property ID
  
  // Visible properties
  visibleProperties: string[];  // Property IDs
  propertyOrder: string[];  // Property IDs in order
  propertyWidths: Record<string, number>;  // Property ID → width
  
  // View-specific settings
  boardSettings?: {
    groupByProperty: string;
    hideEmptyGroups?: boolean;
  };
  
  calendarSettings?: {
    dateProperty: string;
    showWeekends?: boolean;
  };
  
  gallerySettings?: {
    cardSize: 'small' | 'medium' | 'large';
    coverProperty?: string;
    fitCover?: boolean;
  };
  
  timelineSettings?: {
    startDateProperty: string;
    endDateProperty?: string;
    showToday?: boolean;
  };
  
  // Permissions
  isLocked?: boolean;
  
  createdBy: string;
  createdAt: Date;
}

interface ViewFilter {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: any;
}

type FilterOperator =
  // Text
  | 'text_is' | 'text_is_not'
  | 'text_contains' | 'text_does_not_contain'
  | 'text_starts_with' | 'text_ends_with'
  | 'text_is_empty' | 'text_is_not_empty'
  // Number
  | 'number_equals' | 'number_does_not_equal'
  | 'number_greater_than' | 'number_less_than'
  | 'number_greater_than_or_equal' | 'number_less_than_or_equal'
  | 'number_is_empty' | 'number_is_not_empty'
  // Select
  | 'select_is' | 'select_is_not'
  | 'select_is_empty' | 'select_is_not_empty'
  // Multi-select
  | 'multi_select_contains' | 'multi_select_does_not_contain'
  | 'multi_select_is_empty' | 'multi_select_is_not_empty'
  // Date
  | 'date_is' | 'date_is_before' | 'date_is_after'
  | 'date_is_on_or_before' | 'date_is_on_or_after'
  | 'date_is_within' | 'date_is_empty' | 'date_is_not_empty'
  // Checkbox
  | 'checkbox_is' | 'checkbox_is_not'
  // Person
  | 'person_contains' | 'person_does_not_contain'
  | 'person_is_empty' | 'person_is_not_empty';

interface ViewSort {
  propertyId: string;
  direction: 'ascending' | 'descending';
}

interface DatabaseItem {
  id: string;
  databaseId: string;
  
  // Each item is also a page
  pageId: string;
  
  // Property values
  properties: Record<string, PropertyValue>;
  
  // Position in database
  position: number;
  
  createdAt: Date;
  updatedAt: Date;
}

type PropertyValue =
  | { type: 'title'; title: RichText[] }
  | { type: 'rich_text'; rich_text: RichText[] }
  | { type: 'number'; number: number | null }
  | { type: 'select'; select: SelectOption | null }
  | { type: 'multi_select'; multi_select: SelectOption[] }
  | { type: 'status'; status: SelectOption | null }
  | { type: 'date'; date: { start: Date; end?: Date } | null }
  | { type: 'person'; person: string[] }  // User IDs
  | { type: 'files'; files: FileAttachment[] }
  | { type: 'checkbox'; checkbox: boolean }
  | { type: 'url'; url: string | null }
  | { type: 'email'; email: string | null }
  | { type: 'phone'; phone: string | null }
  | { type: 'formula'; formula: any }
  | { type: 'relation'; relation: string[] }  // Related item IDs
  | { type: 'rollup'; rollup: any }
  | { type: 'created_time'; created_time: Date }
  | { type: 'created_by'; created_by: string }
  | { type: 'last_edited_time'; last_edited_time: Date }
  | { type: 'last_edited_by'; last_edited_by: string };

interface FileAttachment {
  name: string;
  url: string;
  type: string;  // MIME type
  size: number;
}
```

---

## 3. ORGANIZATION SYSTEM

### 3.1 Multi-Dimensional Organization

Knowledge can be organized using **multiple methods simultaneously**:

1. **Hierarchical** (Spaces → Pages → Sub-pages)
2. **Categories** (Predefined or custom categories)
3. **Tags** (Free-form tags)
4. **Collections** (Manual or smart grouping)
5. **Favorites** (Personal quick access)
6. **Custom Properties** (In databases)

### 3.2 Categories

```typescript
interface Category {
  id: string;
  workspaceId: string;
  
  // Identity
  name: string;
  icon?: string;
  color?: TextColor;
  description?: string;
  
  // Hierarchy
  parentCategoryId?: string;
  level: number;
  path: string;  // "/documentation/api-reference"
  
  // Usage
  pageCount: number;  // Number of pages in category
  
  // Settings
  isSystem: boolean;  // System categories can't be deleted
  isArchived: boolean;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Default system categories (auto-created)
const SYSTEM_CATEGORIES = [
  { name: 'Documentation', icon: '📚', description: 'Code and product documentation' },
  { name: 'Best Practices', icon: '⭐', description: 'Team best practices and standards' },
  { name: 'Guides & Tutorials', icon: '🎓', description: 'How-to guides and tutorials' },
  { name: 'Meeting Notes', icon: '📝', description: 'Meeting notes and minutes' },
  { name: 'Project Documentation', icon: '📊', description: 'Project-specific docs' },
  { name: 'API Reference', icon: '🔌', description: 'API documentation and specs' },
  { name: 'Architecture', icon: '🏗️', description: 'Architecture decisions and diagrams' },
  { name: 'Troubleshooting', icon: '🔧', description: 'Troubleshooting guides and solutions' },
  { name: 'FAQs', icon: '❓', description: 'Frequently asked questions' },
  { name: 'Templates', icon: '📋', description: 'Reusable templates' },
  { name: 'Onboarding', icon: '🚀', description: 'Onboarding materials' },
  { name: 'Runbooks', icon: '📖', description: 'Operational runbooks and procedures' },
  { name: 'Design', icon: '🎨', description: 'Design docs and specs' },
  { name: 'Research', icon: '🔬', description: 'Research and experiments' },
];
```

### 3.3 Tags

```typescript
interface Tag {
  id: string;
  workspaceId: string;
  
  // Identity
  name: string;
  color?: TextColor;
  description?: string;
  
  // Usage tracking
  usageCount: number;
  lastUsedAt: Date;
  
  // Origin
  createdBy: string;
  isAIGenerated: boolean;  // AI-suggested vs user-created
  
  // Related tags (for suggestions)
  relatedTags: string[];  // Tag IDs
  
  createdAt: Date;
}
```

### 3.4 Collections

```typescript
interface Collection {
  id: string;
  workspaceId: string;
  
  // Identity
  name: string;
  description?: string;
  icon?: string;
  color?: TextColor;
  
  // Type
  type: 'manual' | 'smart';
  
  // Manual collection
  pageIds?: string[];
  
  // Smart collection (auto-updated based on rules)
  rules?: CollectionRule[];
  
  // Display
  defaultView: 'list' | 'grid' | 'table';
  sortBy?: 'created' | 'updated' | 'title' | 'manual';
  sortDirection?: 'asc' | 'desc';
  
  // Permissions
  isPublic: boolean;
  isShared: boolean;
  sharedWith: string[];  // User IDs
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CollectionRule {
  id: string;
  type: 'property' | 'tag' | 'category' | 'created_by' | 'date_range';
  
  // Property-based
  propertyName?: string;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value?: any;
  
  // Tag-based
  tags?: string[];
  tagOperator?: 'all' | 'any' | 'none';
  
  // Category-based
  categories?: string[];
  categoryOperator?: 'all' | 'any' | 'none';
  
  // Date-based
  dateRange?: {
    start?: Date;
    end?: Date;
    type: 'created' | 'updated';
  };
  
  // Combine rules
  combineOperator: 'and' | 'or';
}
```

### 3.5 AI-Powered Auto-Organization

```typescript
interface OrganizationSuggestion {
  id: string;
  pageId: string;
  type: 'category' | 'tag' | 'collection' | 'link' | 'structure';
  
  // Suggestion content
  suggestion: {
    // Category suggestion
    categoryId?: string;
    categoryName?: string;
    
    // Tag suggestions
    tags?: string[];
    
    // Collection suggestion
    collectionId?: string;
    collectionName?: string;
    
    // Link suggestion
    linkedPageId?: string;
    linkedPageTitle?: string;
    linkReason?: string;
    
    // Structure suggestion
    restructureProposal?: RestructureProposal;
  };
  
  // Justification
  confidence: number;  // 0-100
  reason: string;
  basedOn: string[];  // What triggered this suggestion
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'auto_applied';
  
  // User action
  actionedBy?: string;
  actionedAt?: Date;
  
  createdAt: Date;
}

interface RestructureProposal {
  type: 'split_page' | 'merge_pages' | 'extract_section' | 'add_headings' | 'add_toc';
  description: string;
  changes: Array<{
    action: string;
    target: string;
    newStructure?: any;
  }>;
}
```

---

## 4. BLOCK-BASED EDITOR

### 4.1 Editor Modes

```typescript
/**
 * The editor supports multiple interaction modes
 */

type EditorMode = 
  | 'edit'        // Full editing (default)
  | 'read'        // Read-only
  | 'present'     // Presentation mode (full-screen, clean)
  | 'focus'       // Focus mode (hide sidebar, minimize distractions)
  | 'comment';    // Comment/review mode

interface EditorState {
  pageId: string;
  mode: EditorMode;
  
  // Content
  blocks: Block[];
  
  // Selection
  selection: EditorSelection | null;
  
  // History
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
    canUndo: boolean;
    canRedo: boolean;
  };
  
  // UI state
  activeBlockId: string | null;
  hoveredBlockId: string | null;
  commandMenuOpen: boolean;
  commandMenuPosition?: { x: number; y: number };
}

interface EditorSelection {
  blockId: string;
  offset: number;  // Character offset in block
  length: number;  // Selection length
  isCollapsed: boolean;  // true if cursor, false if selection
}

interface HistoryEntry {
  timestamp: Date;
  operation: 'insert' | 'delete' | 'update' | 'move' | 'format';
  before: any;
  after: any;
}
```

### 4.2 Block Commands (/ Menu)

```typescript
interface BlockCommand {
  id: string;
  trigger: string;  // /text, /h1, /code, etc.
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'media' | 'advanced' | 'database' | 'ai' | 'embed';
  
  // What it creates
  blockType: BlockType;
  defaultContent?: Partial<BlockContent>;
  defaultFormat?: Partial<BlockFormat>;
  
  // Shortcuts
  keyboardShortcut?: string;  // Ctrl+Alt+1
  markdownShortcut?: string;  // # for heading
  
  // Availability
  requiresPro?: boolean;
  requiresIntegration?: string;  // 'figma', 'github', etc.
}

// Complete list of block commands
const BLOCK_COMMANDS: BlockCommand[] = [
  // BASIC TEXT
  { id: 'text', trigger: 'text', name: 'Text', description: 'Plain text paragraph', 
    icon: 'text', category: 'basic', blockType: 'paragraph' },
  { id: 'h1', trigger: 'h1', name: 'Heading 1', description: 'Large section heading', 
    icon: 'heading', category: 'basic', blockType: 'heading_1', markdownShortcut: '# ' },
  { id: 'h2', trigger: 'h2', name: 'Heading 2', description: 'Medium section heading', 
    icon: 'heading', category: 'basic', blockType: 'heading_2', markdownShortcut: '## ' },
  { id: 'h3', trigger: 'h3', name: 'Heading 3', description: 'Small section heading', 
    icon: 'heading', category: 'basic', blockType: 'heading_3', markdownShortcut: '### ' },
  
  // LISTS
  { id: 'bullet', trigger: 'bullet', name: 'Bulleted list', description: 'Create a simple bulleted list', 
    icon: 'list', category: 'basic', blockType: 'bulleted_list', markdownShortcut: '- ' },
  { id: 'number', trigger: 'number', name: 'Numbered list', description: 'Create a numbered list', 
    icon: 'list-ordered', category: 'basic', blockType: 'numbered_list', markdownShortcut: '1. ' },
  { id: 'todo', trigger: 'todo', name: 'To-do list', description: 'Track tasks with a to-do list', 
    icon: 'check-square', category: 'basic', blockType: 'todo', markdownShortcut: '[] ' },
  { id: 'toggle', trigger: 'toggle', name: 'Toggle list', description: 'Toggleable list', 
    icon: 'chevron-right', category: 'basic', blockType: 'toggle', markdownShortcut: '> ' },
  
  // CODE
  { id: 'code', trigger: 'code', name: 'Code', description: 'Code block with syntax highlighting', 
    icon: 'code', category: 'basic', blockType: 'code', markdownShortcut: '```' },
  
  // MEDIA
  { id: 'image', trigger: 'image', name: 'Image', description: 'Upload or embed image', 
    icon: 'image', category: 'media', blockType: 'image' },
  { id: 'video', trigger: 'video', name: 'Video', description: 'Upload or embed video', 
    icon: 'video', category: 'media', blockType: 'video' },
  { id: 'file', trigger: 'file', name: 'File', description: 'Upload any file', 
    icon: 'file', category: 'media', blockType: 'file' },
  { id: 'pdf', trigger: 'pdf', name: 'PDF', description: 'Embed PDF document', 
    icon: 'file-text', category: 'media', blockType: 'pdf' },
  
  // EMBEDS
  { id: 'embed', trigger: 'embed', name: 'Embed', description: 'Embed from 500+ sources', 
    icon: 'link', category: 'embed', blockType: 'embed' },
  { id: 'bookmark', trigger: 'bookmark', name: 'Bookmark', description: 'Save link with preview', 
    icon: 'bookmark', category: 'embed', blockType: 'bookmark' },
  
  // ADVANCED
  { id: 'table', trigger: 'table', name: 'Table', description: 'Add a table', 
    icon: 'table', category: 'advanced', blockType: 'table' },
  { id: 'quote', trigger: 'quote', name: 'Quote', description: 'Capture a quote', 
    icon: 'quote', category: 'basic', blockType: 'quote', markdownShortcut: '> ' },
  { id: 'callout', trigger: 'callout', name: 'Callout', description: 'Make writing stand out', 
    icon: 'message-square', category: 'basic', blockType: 'callout' },
  { id: 'equation', trigger: 'equation', name: 'Equation', description: 'LaTeX equation', 
    icon: 'function', category: 'advanced', blockType: 'equation' },
  { id: 'diagram', trigger: 'diagram', name: 'Diagram', description: 'Create diagram (Mermaid)', 
    icon: 'git-branch', category: 'advanced', blockType: 'diagram' },
  { id: 'divider', trigger: 'divider', name: 'Divider', description: 'Visually divide blocks', 
    icon: 'minus', category: 'basic', blockType: 'divider', keyboardShortcut: '---' },
  { id: 'toc', trigger: 'toc', name: 'Table of contents', description: 'Auto table of contents', 
    icon: 'list', category: 'advanced', blockType: 'table_of_contents' },
  { id: 'columns', trigger: 'columns', name: 'Columns', description: 'Multi-column layout', 
    icon: 'columns', category: 'advanced', blockType: 'column_list' },
  
  // DATABASES
  { id: 'table-inline', trigger: 'table-inline', name: 'Table - Inline', description: 'Create inline database', 
    icon: 'table', category: 'database', blockType: 'database_inline' },
  { id: 'board', trigger: 'board', name: 'Board - Inline', description: 'Create inline board', 
    icon: 'trello', category: 'database', blockType: 'database_inline', 
    defaultContent: { database: { viewType: 'board' } } },
  { id: 'calendar', trigger: 'calendar', name: 'Calendar - Inline', description: 'Create inline calendar', 
    icon: 'calendar', category: 'database', blockType: 'database_inline',
    defaultContent: { database: { viewType: 'calendar' } } },
  { id: 'gallery', trigger: 'gallery', name: 'Gallery - Inline', description: 'Create inline gallery', 
    icon: 'grid', category: 'database', blockType: 'database_inline',
    defaultContent: { database: { viewType: 'gallery' } } },
  { id: 'list', trigger: 'list', name: 'List - Inline', description: 'Create inline list', 
    icon: 'list', category: 'database', blockType: 'database_inline',
    defaultContent: { database: { viewType: 'list' } } },
  { id: 'timeline', trigger: 'timeline', name: 'Timeline - Inline', description: 'Create inline timeline', 
    icon: 'clock', category: 'database', blockType: 'database_inline',
    defaultContent: { database: { viewType: 'timeline' } } },
  
  // AI-POWERED
  { id: 'ai-write', trigger: 'ai', name: 'AI Writer', description: 'Generate content with AI', 
    icon: 'zap', category: 'ai', blockType: 'paragraph' },
  { id: 'ai-continue', trigger: 'continue', name: 'Continue writing', description: 'AI continues your text', 
    icon: 'zap', category: 'ai', blockType: 'paragraph' },
  { id: 'ai-summarize', trigger: 'summarize', name: 'Summarize', description: 'AI summarizes selection', 
    icon: 'zap', category: 'ai', blockType: 'paragraph' },
  { id: 'ai-improve', trigger: 'improve', name: 'Improve writing', description: 'AI improves selected text', 
    icon: 'zap', category: 'ai', blockType: 'paragraph' },
  { id: 'ai-diagram', trigger: 'diagram-ai', name: 'AI Diagram', description: 'Generate diagram from description', 
    icon: 'zap', category: 'ai', blockType: 'diagram' },
  
  // IDE-SPECIFIC
  { id: 'code-ref', trigger: 'code-ref', name: 'Code Reference', description: 'Link to code in IDE', 
    icon: 'code', category: 'advanced', blockType: 'code_reference' },
  { id: 'task-ref', trigger: 'task-ref', name: 'Task Reference', description: 'Link to task', 
    icon: 'check-circle', category: 'advanced', blockType: 'task_reference' },
  { id: 'plan-ref', trigger: 'plan-ref', name: 'Plan Reference', description: 'Link to plan', 
    icon: 'map', category: 'advanced', blockType: 'plan_reference' },
  { id: 'conversation', trigger: 'conversation', name: 'Conversation Snippet', description: 'Quote from conversation', 
    icon: 'message-circle', category: 'advanced', blockType: 'conversation_snippet' },
];
```

### 4.3 Block Operations

```typescript
interface BlockOperations {
  // CRUD
  createBlock(pageId: string, type: BlockType, position: number, content?: BlockContent): Promise<Block>;
  updateBlock(blockId: string, updates: Partial<Block>): Promise<Block>;
  deleteBlock(blockId: string): Promise<void>;
  duplicateBlock(blockId: string): Promise<Block>;
  
  // Movement
  moveBlockUp(blockId: string): Promise<void>;
  moveBlockDown(blockId: string): Promise<void>;
  moveBlockTo(blockId: string, targetPageId: string, position: number): Promise<void>;
  
  // Indentation
  indentBlock(blockId: string): Promise<void>;  // Make child of previous block
  outdentBlock(blockId: string): Promise<void>;  // Make sibling of parent
  
  // Conversion
  convertBlockType(blockId: string, newType: BlockType): Promise<Block>;
  turnIntoPage(blockId: string): Promise<Page>;  // Convert block to new page
  
  // Bulk operations
  deleteBlocks(blockIds: string[]): Promise<void>;
  moveBlocks(blockIds: string[], targetPageId: string, position: number): Promise<void>;
  mergeBlocks(blockIds: string[]): Promise<Block>;
  
  // Formatting
  applyFormat(blockId: string, format: BlockFormat): Promise<Block>;
  toggleFormat(blockId: string, formatType: keyof BlockFormat): Promise<Block>;
}

interface BlockFormat {
  // Alignment
  alignment?: 'left' | 'center' | 'right';
  
  // Spacing
  marginTop?: number;
  marginBottom?: number;
  
  // Colors
  backgroundColor?: TextColor;
  textColor?: TextColor;
  
  // Width
  width?: 'full' | 'page' | 'text';  // Full width, page width, or text width
}
```

---

## 5. AI INTEGRATION OVERVIEW

### 5.1 AI Capabilities

The Knowledge Base deeply integrates AI in four main areas:

1. **Content Creation** - Writing, rewriting, improving, generating
2. **Organization** - Auto-categorizing, tagging, linking
3. **Extraction** - Converting code/conversations/commits to knowledge
4. **Discovery** - Semantic search, Q&A, gap detection

### 5.2 AI Content Assistant

```typescript
interface AIContentAssistant {
  // Generate new content
  generateContent(prompt: string, context?: AIContext): Promise<string>;
  
  // Continue writing from cursor
  continueWriting(existingText: string, cursorPosition: number): Promise<string>;
  
  // Rewrite text in different style
  rewrite(text: string, style: AIRewriteStyle): Promise<string>;
  
  // Improve writing quality
  improveWriting(text: string): Promise<{
    improved: string;
    changes: Array<{ type: string; description: string }>;
  }>;
  
  // Fix grammar and spelling
  fixGrammar(text: string): Promise<{
    fixed: string;
    corrections: Array<{ original: string; corrected: string; reason: string }>;
  }>;
  
  // Adjust length
  makeLonger(text: string, targetLength?: number): Promise<string>;
  makeShorter(text: string, targetLength?: number): Promise<string>;
  
  // Change tone
  changeTone(text: string, tone: AITone): Promise<string>;
  
  // Translate
  translate(text: string, targetLanguage: string): Promise<string>;
  
  // Summarize
  summarize(text: string, format?: 'paragraph' | 'bullets' | 'key_points'): Promise<string>;
  
  // Extract information
  extractActionItems(text: string): Promise<ActionItem[]>;
  extractDecisions(text: string): Promise<Decision[]>;
  extractQuestions(text: string): Promise<string[]>;
  extractKeyPoints(text: string): Promise<string[]>;
  
  // Generate structured content
  generateOutline(topic: string): Promise<OutlineNode[]>;
  generateTable(description: string): Promise<TableData>;
  generateDiagram(description: string, type?: 'mermaid' | 'plantuml'): Promise<string>;
}

type AIRewriteStyle = 
  | 'professional' | 'casual' | 'technical' | 'simplified'
  | 'academic' | 'persuasive' | 'descriptive' | 'narrative';

type AITone = 
  | 'formal' | 'informal' | 'friendly' | 'professional'
  | 'enthusiastic' | 'neutral' | 'empathetic';

interface OutlineNode {
  level: number;
  title: string;
  children: OutlineNode[];
}
```

**Continued in Part 2...**

---

## NEXT: Part 2 Will Cover

6. Collaboration Features (real-time editing, comments, sharing)
7. Integration with Planning Module (templates, references, workflows)
8. Complete Database Schema (all tables, indexes, relationships)
9. API Endpoints (REST APIs for all operations)
10. UI Components (complete component specifications)

---

## Related Documents

- **[Knowledge Base Recommendations](./knowledge-base-recommendations.md)** - Comprehensive recommendations and enhancements including:
  - Semantic Search & Vector Embeddings
  - Knowledge Graph Layer
  - AI Agent Integration (Knowledge Base Agent)
  - Knowledge Extraction Workflows
  - Code-to-Documentation Sync
  - Performance Optimizations
  - Security & Access Control Enhancements
  - Smart Template System
  - Analytics & Insights Dashboard
