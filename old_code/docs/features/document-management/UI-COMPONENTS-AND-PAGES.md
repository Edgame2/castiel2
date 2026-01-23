# Document Management - UI Pages & Components Documentation

**Version**: 1.0  
**Date**: December 12, 2025  
**Status**: Design & Implementation Guide  
**Framework**: Next.js 16 + React 19 + shadcn/ui

---

## 📑 Table of Contents

1. [Page Structure & Routing](#page-structure--routing)
2. [Core Pages](#core-pages)
3. [Shared Components](#shared-components)
4. [Dashboard Widgets](#dashboard-widgets)
5. [Data Models & Types](#data-models--types)
6. [Implementation Patterns](#implementation-patterns)
7. [Code Examples](#code-examples)

---

## Page Structure & Routing

### URL Structure

```
/(protected)/
├── documents/
│   ├── page.tsx                          # Main documents list (gallery + table toggle)
│   ├── upload/
│   │   └── page.tsx                      # Dedicated bulk upload page
│   ├── [id]/
│   │   └── page.tsx                      # Document detail view
│   └── layout.tsx                        # Documents section layout with sidebar
├── collections/
│   ├── page.tsx                          # Collections list & management
│   ├── [collectionId]/
│   │   └── page.tsx                      # Collection detail (nested documents)
│   └── layout.tsx                        # Collections section layout
├── settings/
│   └── page.tsx                          # User settings (with document tab)
└── admin/
    └── document-settings/
        └── page.tsx                      # Tenant admin document settings
```

### Layout Hierarchy

```
(protected)/layout.tsx (Main authenticated layout)
├── Sidebar Navigation
└── Main Content
    ├── documents/layout.tsx
    │   ├── Sidebar panel (Collections tree)
    │   └── <children> (Document list/upload)
    └── collections/layout.tsx
        ├── Sidebar panel (Collection breadcrumb)
        └── <children> (Collections list)
```

---

## Core Pages

### 1. Documents List Page

**Path**: `/(protected)/documents/page.tsx`

**Purpose**: Main hub for viewing, filtering, and managing documents

**Features**:
- Toggle between grid view (thumbnails) and table view
- Real-time search and filtering
- Bulk actions (select multiple, delete, move to collection)
- Quick upload button (opens modal)
- Collections sidebar panel
- Empty state with upload guidance

**Layout Structure**:

```tsx
<DocumentsLayout>
  <div className="flex gap-4">
    {/* Left Sidebar - Collections Tree */}
    <aside className="w-64 border-r">
      <CollectionsPanel />
    </aside>
    
    {/* Main Content */}
    <main className="flex-1">
      {/* Header with search, filter, view toggle */}
      <DocumentsHeader />
      
      {/* Content Area - Grid or Table */}
      {viewMode === 'grid' ? (
        <DocumentGridView documents={documents} />
      ) : (
        <DocumentTableView documents={documents} />
      )}
    </main>
  </div>
</DocumentsLayout>
```

**Key Subcomponents**:
- `DocumentsHeader` - Search, filters, view toggle, quick upload button
- `DocumentGridView` - Grid layout with thumbnail cards
- `DocumentTableView` - shadcn DataTable with sortable columns
- `CollectionsPanel` - Sidebar tree navigation
- `DocumentCard` - Grid view card component
- `DocumentRow` - Table row component
- `DocumentFilters` - Filter panel (category, tags, date, visibility)
- `DocumentSearch` - Search input with debounce

**Filters Supported**:
- Search (by name)
- Category
- Tags (multi-select)
- Date range
- Visibility (public, internal, confidential)
- File type / MIME type

**Bulk Actions**:
- Delete selected (soft delete)
- Move to collection
- Add to collection
- Change visibility
- Add/remove tags

---

### 2. Documents Upload Page

**Path**: `/(protected)/documents/upload/page.tsx`

**Purpose**: Dedicated page for bulk document uploads with advanced options

**Features**:
- Drag & drop upload area
- File selection from disk
- Per-file metadata (category, tags, visibility override)
- Upload progress tracking (per file + aggregate)
- Batch settings (apply to all files)
- Pause/resume/cancel per file
- Upload history/summary
- Redirect to documents list on completion

**Layout Structure**:

```tsx
<div className="space-y-6 p-6">
  {/* Header */}
  <div>
    <h1>Upload Documents</h1>
    <p>Drag files here or click to select</p>
  </div>
  
  {/* Upload Zone */}
  <UploadDropZone 
    onFilesSelected={handleFilesSelected}
    acceptedTypes={tenantSettings.acceptedMimeTypes}
  />
  
  {/* Batch Settings */}
  {selectedFiles.length > 0 && (
    <UploadBatchSettings
      onApplyToAll={handleApplyBatchSettings}
    />
  )}
  
  {/* File List with Progress */}
  {selectedFiles.length > 0 && (
    <UploadFilesList
      files={selectedFiles}
      uploads={uploadProgress}
      onRemoveFile={removeFile}
    />
  )}
  
  {/* Summary & Actions */}
  {selectedFiles.length > 0 && (
    <UploadSummary
      totalSize={calculateTotalSize()}
      fileCount={selectedFiles.length}
      onStartUpload={startUpload}
      onClearAll={clearAll}
    />
  )}
</div>
```

**Key Subcomponents**:
- `UploadDropZone` - Drag & drop area with file input
- `UploadFilesList` - List of selected files with per-file controls
- `UploadFileRow` - Individual file with progress bar
- `UploadProgressBar` - Progress per file with speed/time info
- `UploadBatchSettings` - Apply metadata to all files at once
- `UploadSummary` - Total size, file count, actions

**Upload Process Flow**:

1. User drags/selects files
2. Files validated (size, MIME type)
3. User configures batch settings (optional)
4. User configures per-file metadata (optional)
5. User clicks "Start Upload"
6. Files upload sequentially or parallel (based on config)
7. Progress updates in real-time (per file)
8. Completion summary with option to view uploaded documents

---

### 3. Collections Page

**Path**: `/(protected)/collections/page.tsx`

**Purpose**: Manage document collections (folders, tags, smart collections)

**Features**:
- List all collections with type indicator
- Create new collection (folder/tag/smart)
- Edit collection details
- Delete collection (soft delete)
- View documents in collection
- Nested collections (folders within folders)
- Breadcrumb navigation
- Bulk assign documents to collection

**Layout Structure**:

```tsx
<div className="flex gap-4">
  {/* Left Sidebar - Collection Breadcrumb/Tree */}
  <aside className="w-64 border-r">
    <CollectionBreadcrumb currentCollection={collection} />
    {parentCollections && (
      <div className="mt-4 space-y-2">
        {/* Parent collections for navigation */}
      </div>
    )}
  </aside>
  
  {/* Main Content */}
  <main className="flex-1">
    <CollectionsHeader collection={collection} />
    
    {/* Collections Table */}
    <CollectionsDataTable
      collections={collections}
      onEdit={editCollection}
      onDelete={deleteCollection}
      onNavigate={navigateToCollection}
    />
    
    {/* Documents in Collection */}
    {collection && (
      <CollectionDocumentsSection
        collectionId={collection.id}
        documents={collectionDocuments}
      />
    )}
  </main>
</div>
```

**Key Subcomponents**:
- `CollectionsHeader` - Title, create button, edit/delete actions
- `CollectionsDataTable` - shadcn DataTable for collections
- `CollectionRow` - Row with type badge, actions
- `CollectionForm` - Create/edit dialog
- `CollectionBreadcrumb` - Navigation breadcrumb
- `CollectionDocumentsSection` - Documents in collection
- `CollectionTypeIcon` - Badge for collection type (folder, tag, smart)

**Collection Types**:
- **Folder**: Simple folder with document IDs list
- **Tag**: Tag-based collection (all docs with tag X)
- **Smart**: Query-based collection (e.g., all PDFs uploaded in last 30 days)

---

### 4. Collection Detail Page

**Path**: `/(protected)/collections/[collectionId]/page.tsx`

**Purpose**: View and manage documents within a specific collection

**Features**:
- Collection info header
- Documents in collection (table/grid view)
- Add/remove documents
- Rename/edit collection
- Delete collection
- Move to parent/sibling collections (nested)
- Share collection (if public)

**Layout Structure**:

```tsx
<div>
  {/* Collection Header */}
  <CollectionHeader 
    collection={collection}
    documentCount={documents.length}
    storageUsed={calculateStorageUsed()}
  />
  
  {/* Collection Actions */}
  <CollectionActions
    collection={collection}
    onEdit={editCollection}
    onDelete={deleteCollection}
    onAddDocuments={openAddDocumentsModal}
  />
  
  {/* Documents in Collection - Table/Grid View */}
  {viewMode === 'grid' ? (
    <DocumentGridView documents={documents} />
  ) : (
    <DocumentTableView documents={documents} />
  )}
</div>
```

**Key Subcomponents**:
- `CollectionHeader` - Collection name, type, metadata
- `CollectionActions` - Edit, delete, add documents buttons
- `AddDocumentsModal` - Modal to select and add documents
- Document grid/table (reuse from documents page)

---

### 5. Document Detail Page

**Path**: `/(protected)/documents/[id]/page.tsx`

**Purpose**: View document metadata and perform document-specific actions

**Features**:
- Document metadata (name, type, size, date, category, tags)
- Preview area (placeholder, implemented in Phase 2)
- Download button with SAS token
- Edit metadata
- Move to collection
- Version history (future)
- Share document (if public)
- Delete/restore options
- Related documents (same category/tags)

**Layout Structure**:

```tsx
<div className="grid grid-cols-3 gap-6">
  {/* Left - Preview Area */}
  <div className="col-span-1">
    <DocumentPreviewArea document={document} />
  </div>
  
  {/* Right - Metadata & Actions */}
  <div className="col-span-2 space-y-6">
    <DocumentMetadata document={document} />
    <DocumentActions document={document} />
    <DocumentCollections document={document} />
    <DocumentVersionHistory document={document} />
    <RelatedDocuments document={document} />
  </div>
</div>
```

**Key Subcomponents**:
- `DocumentPreviewArea` - Preview placeholder (Phase 2)
- `DocumentMetadata` - Read-only metadata display
- `DocumentActions` - Download, edit, delete, share
- `DocumentCollections` - Collections this doc belongs to
- `DocumentVersionHistory` - Version timeline (Phase 2)
- `RelatedDocuments` - Same category/tags documents
- `DocumentEditModal` - Edit name, category, tags, visibility

---

### 6. Admin Document Settings Page

**Path**: `/(protected)/admin/document-settings/page.tsx`

**Purpose**: Tenant admin configuration for document management

**Features**:
- File size limits (global, per tenant)
- MIME type whitelist/blacklist
- Categories management
- Tags management (controlled vs free-form)
- Default visibility
- Retention policies
- Feature flags (for Phase 2)
- Quota display and management

**Layout Structure**:

```tsx
<div className="space-y-8 p-6">
  <h1>Document Settings</h1>
  
  {/* Tabs */}
  <Tabs defaultValue="general">
    <TabsList>
      <TabsTrigger value="general">General</TabsTrigger>
      <TabsTrigger value="mimetypes">File Types</TabsTrigger>
      <TabsTrigger value="categories">Categories</TabsTrigger>
      <TabsTrigger value="tags">Tags</TabsTrigger>
      <TabsTrigger value="retention">Retention</TabsTrigger>
      <TabsTrigger value="features">Features</TabsTrigger>
    </TabsList>
    
    <TabsContent value="general">
      <GeneralSettingsForm />
    </TabsContent>
    
    <TabsContent value="mimetypes">
      <MimeTypeSettingsForm />
    </TabsContent>
    
    {/* ... other tabs ... */}
  </Tabs>
</div>
```

**Key Subcomponents**:
- `GeneralSettingsForm` - File size limits, default visibility, storage quota
- `MimeTypeSettingsForm` - Whitelist/blacklist MIME types
- `CategoriesForm` - Add/edit/delete categories
- `TagsForm` - Controlled vs free-form toggle, manage controlled tags
- `RetentionForm` - Default retention days, policy management
- `FeaturesForm` - Feature flag toggles (virus scan, PII redaction, etc.)

---

### 7. Document Settings Tab (User Settings)

**Path**: `/(protected)/settings/page.tsx` (with document tab)

**Purpose**: User-level document preferences

**Features**:
- Default visibility preference
- Default category preference
- Auto-tag suggestions
- Download history (optional)
- Storage stats (personal quota)

**Integration**:

Add tab to existing settings page:

```tsx
<Tabs>
  <TabsTrigger value="general">General</TabsTrigger>
  <TabsTrigger value="security">Security</TabsTrigger>
  <TabsTrigger value="documents">Documents</TabsTrigger>
  
  <TabsContent value="documents">
    <UserDocumentSettingsForm />
  </TabsContent>
</Tabs>
```

---

## Shared Components

### Core Components (Reusable)

#### 1. Document Upload Modal

**Path**: `apps/web/src/components/documents/DocumentUploadModal.tsx`

**Purpose**: Quick upload from anywhere in the app

**Props**:

```typescript
interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId?: string; // Auto-assign to collection
  onSuccess?: (documents: Document[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}
```

**Features**:
- Modal with drag & drop zone
- Simplified file selection
- Progress tracking
- Auto-close or stay open

**Usage**:

```tsx
// In any component
const [uploadModalOpen, setUploadModalOpen] = useState(false);

<Button onClick={() => setUploadModalOpen(true)}>
  Quick Upload
</Button>

<DocumentUploadModal
  isOpen={uploadModalOpen}
  onClose={() => setUploadModalOpen(false)}
  onSuccess={(docs) => {
    toast.success(`Uploaded ${docs.length} documents`);
  }}
/>
```

---

#### 2. Document Table (DataTable)

**Path**: `apps/web/src/components/documents/DocumentDataTable.tsx`

**Purpose**: Reusable shadcn DataTable for documents

**Features**:
- Sortable columns (name, date, size, category, visibility)
- Selectable rows (checkbox)
- Column visibility toggle
- Pagination
- Row actions (download, edit, delete)
- Bulk actions

**Columns**:

```typescript
const documentColumns: ColumnDef<Document>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(value) => row.toggleSelected(!!value)}
      />
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (props) => (
      <Link href={`/documents/${props.row.original.id}`}>
        {props.getValue()}
      </Link>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: (props) => <CategoryBadge value={props.getValue()} />,
  },
  {
    accessorKey: 'fileSize',
    header: 'Size',
    cell: (props) => formatBytes(props.getValue()),
  },
  {
    accessorKey: 'createdAt',
    header: 'Uploaded',
    cell: (props) => formatDate(props.getValue()),
  },
  {
    accessorKey: 'visibility',
    header: 'Visibility',
    cell: (props) => <VisibilityBadge value={props.getValue()} />,
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    cell: (props) => (
      <div className="flex gap-1">
        {props.getValue().map((tag) => (
          <Badge key={tag} variant="secondary">{tag}</Badge>
        ))}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: (props) => (
      <DocumentRowActions document={props.row.original} />
    ),
  },
];
```

**Usage**:

```tsx
<DataTable
  columns={documentColumns}
  data={documents}
  pageSize={20}
/>
```

---

#### 3. Upload Drop Zone

**Path**: `apps/web/src/components/documents/UploadDropZone.tsx`

**Purpose**: Drag & drop file input

**Props**:

```typescript
interface UploadDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  maxFiles?: number;
}
```

**Features**:
- Drag & drop area with visual feedback
- File input fallback
- File validation
- Accepted types display

**Styling**:

```tsx
<div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
`}>
  <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
  <p className="mt-2 text-sm font-medium">Drag files here or click to select</p>
  <p className="text-xs text-gray-500 mt-1">
    Supported: {acceptedTypes?.join(', ')} • Max {formatBytes(maxSize)}
  </p>
  <input
    type="file"
    multiple
    onChange={handleChange}
    accept={acceptedTypes?.join(',')}
    className="hidden"
  />
</div>
```

---

#### 4. Upload File Row with Progress

**Path**: `apps/web/src/components/documents/UploadFileRow.tsx`

**Purpose**: Individual file upload status and control

**Props**:

```typescript
interface UploadFileRowProps {
  file: File;
  progress: UploadProgress;
  onCancel: () => void;
  onRemove: () => void;
  metadata?: DocumentMetadata;
  onMetadataChange?: (metadata: DocumentMetadata) => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  speed?: number; // bytes per second
  estimatedTime?: number; // seconds remaining
}
```

**Features**:
- File name with MIME type icon
- Progress bar with percentage
- Upload speed (KB/s)
- Estimated time remaining
- Cancel button (while uploading)
- Pause/resume (optional)
- Error message display
- Remove button

**Layout**:

```tsx
<div className="border rounded-lg p-4 space-y-3">
  {/* File Header */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <MimeTypeIcon mimeType={file.type} />
      <div>
        <p className="font-medium text-sm">{file.name}</p>
        <p className="text-xs text-gray-500">
          {formatBytes(file.size)} • {progress.status}
        </p>
      </div>
    </div>
    
    {/* Actions */}
    <div className="flex gap-2">
      {progress.status === 'uploading' && (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      )}
      {['completed', 'error', 'cancelled'].includes(progress.status) && (
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
  </div>
  
  {/* Progress Bar */}
  <Progress value={progress.percent} />
  
  {/* Stats */}
  <div className="flex justify-between text-xs text-gray-500">
    <span>{progress.percent}%</span>
    {progress.speed && (
      <>
        <span>{formatBytes(progress.speed)}/s</span>
        <span>{formatTime(progress.estimatedTime)} remaining</span>
      </>
    )}
  </div>
  
  {/* Error Message */}
  {progress.error && (
    <Alert variant="destructive">
      <AlertDescription>{progress.error}</AlertDescription>
    </Alert>
  )}
</div>
```

---

#### 5. Document Grid Card

**Path**: `apps/web/src/components/documents/DocumentCard.tsx`

**Purpose**: Grid view card for document

**Props**:

```typescript
interface DocumentCardProps {
  document: Document;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: () => void;
}
```

**Features**:
- Thumbnail placeholder (Phase 2: actual preview)
- Document name and type
- Metadata badges (category, tags)
- Hover actions (download, more options)
- Selection checkbox
- File size
- Upload date

**Layout**:

```tsx
<div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
  {/* Checkbox - Hover */}
  {isSelectable && (
    <Checkbox
      checked={isSelected}
      onChange={(value) => onSelect(document.id, value)}
      className="absolute top-2 left-2"
    />
  )}
  
  {/* Thumbnail Placeholder */}
  <div className="bg-gray-100 h-40 flex items-center justify-center">
    <MimeTypeIcon mimeType={document.mimeType} className="h-12 w-12" />
  </div>
  
  {/* Info */}
  <div className="p-3 space-y-2">
    <Link href={`/documents/${document.id}`} className="font-medium hover:text-blue-600">
      {document.name}
    </Link>
    
    <div className="flex gap-1 flex-wrap">
      <CategoryBadge value={document.category} />
      <VisibilityBadge value={document.visibility} />
    </div>
    
    <div className="flex justify-between text-xs text-gray-500">
      <span>{formatBytes(document.fileSize)}</span>
      <span>{formatDate(document.createdAt)}</span>
    </div>
  </div>
  
  {/* Hover Actions */}
  <div className="border-t p-2 flex gap-2 hidden group-hover:flex">
    <Button size="sm" variant="outline">Download</Button>
    <DocumentRowActions document={document} />
  </div>
</div>
```

---

#### 6. Filter Panel

**Path**: `apps/web/src/components/documents/DocumentFilterPanel.tsx`

**Purpose**: Filter documents by multiple criteria

**Props**:

```typescript
interface DocumentFilterPanelProps {
  onFilterChange: (filters: DocumentFilters) => void;
  categories: Category[];
  tags: string[];
  tenantSettings: TenantDocumentSettings;
}

interface DocumentFilters {
  search?: string;
  category?: string;
  tags?: string[];
  visibility?: DocumentVisibility;
  fileType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
```

**Features**:
- Search input
- Category selector
- Tags multi-select
- Visibility selector
- File type selector
- Date range picker
- Clear all filters button

**Collapsible Design** (on mobile):

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Filters</Button>
  </SheetTrigger>
  <SheetContent>
    {/* Filter form */}
  </SheetContent>
</Sheet>
```

---

#### 7. Collections Panel Sidebar

**Path**: `apps/web/src/components/documents/CollectionsPanel.tsx`

**Purpose**: Tree navigation for collections

**Props**:

```typescript
interface CollectionsPanelProps {
  collections: Collection[];
  selectedCollection?: string;
  onSelectCollection: (collectionId: string) => void;
  onCreateCollection: () => void;
}
```

**Features**:
- Hierarchical tree view
- Expand/collapse nested collections
- Document count per collection
- Active collection highlight
- Create new collection button
- Right-click context menu (edit, delete)

**Structure**:

```tsx
<nav className="space-y-1">
  <Button
    variant="ghost"
    className="w-full justify-start"
    onClick={onCreateCollection}
  >
    <Plus className="h-4 w-4 mr-2" />
    New Collection
  </Button>
  
  <div className="mt-4 space-y-1">
    {collections.map((collection) => (
      <CollectionTreeItem
        key={collection.id}
        collection={collection}
        isSelected={selectedCollection === collection.id}
        onSelect={() => onSelectCollection(collection.id)}
        children={collection.children}
      />
    ))}
  </div>
</nav>
```

---

#### 8. Document Row Actions

**Path**: `apps/web/src/components/documents/DocumentRowActions.tsx`

**Purpose**: Action menu for document

**Props**:

```typescript
interface DocumentRowActionsProps {
  document: Document;
  onDownload?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
}
```

**Actions**:
- Download (with SAS token)
- Edit metadata
- Add to collection
- Remove from collection
- Change visibility
- Add/remove tags
- Delete (soft)
- Restore (if deleted)
- Share (if public)
- Copy link

**Implementation**:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={onDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download
    </DropdownMenuItem>
    <DropdownMenuItem onClick={onEdit}>
      <Edit className="h-4 w-4 mr-2" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onMove}>
      <FolderOpen className="h-4 w-4 mr-2" />
      Add to Collection
    </DropdownMenuItem>
    <DropdownMenuItem onClick={onDelete}>
      <Trash className="h-4 w-4 mr-2" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Dashboard Widgets

### Widget Catalog Integration

All widgets are registered in **`/apps/web/src/lib/widget-catalog.ts`** and can be added to dashboards via drag & drop.

---

### 1. Recent Uploads Widget

**Type**: `document-recent-uploads`  
**Size**: `medium` (2x2)

**Purpose**: Show recently uploaded documents

**Data**: Last 5 uploads per tenant

**Props**:

```typescript
interface RecentUploadsWidgetProps {
  tenantId: string;
  limit?: number; // default 5
  onClick?: (documentId: string) => void;
}
```

**Component**:

```tsx
// apps/web/src/components/widgets/RecentUploadsWidget.tsx

export function RecentUploadsWidget({ tenantId, limit = 5, onClick }: RecentUploadsWidgetProps) {
  const { data: documents } = useQuery({
    queryKey: ['documents', tenantId, 'recent'],
    queryFn: () => api.documents.getRecent(tenantId, limit),
  });

  if (!documents?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No documents uploaded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => onClick?.(doc.id)}
            >
              <MimeTypeIcon mimeType={doc.mimeType} className="h-6 w-6" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(doc.createdAt)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Download</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Widget Registration**:

```typescript
{
  id: 'document-recent-uploads',
  name: 'Recent Uploads',
  category: 'documents',
  description: 'Show recently uploaded documents',
  component: RecentUploadsWidget,
  defaultSize: { w: 2, h: 2 },
  previewImage: '/widgets/recent-uploads.png',
}
```

---

### 2. Storage Usage Widget

**Type**: `document-storage-gauge`  
**Size**: `small` (1x1)

**Purpose**: Display storage quota usage

**Data**: Current usage vs tenant quota

**Component**:

```tsx
// apps/web/src/components/widgets/StorageUsageWidget.tsx

export function StorageUsageWidget({ tenantId }: { tenantId: string }) {
  const { data: storageStats } = useQuery({
    queryKey: ['documents', tenantId, 'storage'],
    queryFn: () => api.documents.getStorageStats(tenantId),
  });

  if (!storageStats) return <SkeletonCard />;

  const percentUsed = (storageStats.usedBytes / storageStats.quotaBytes) * 100;
  const isNearQuota = percentUsed > 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Storage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress
            value={percentUsed}
            className={isNearQuota ? 'bg-red-100' : ''}
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>{formatBytes(storageStats.usedBytes)}</span>
            <span>{formatBytes(storageStats.quotaBytes)}</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            {percentUsed.toFixed(1)}% used
          </p>
          {isNearQuota && (
            <Alert variant="warning" className="mt-2">
              <AlertDescription className="text-xs">
                Approaching storage limit
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 3. Document Count Widget

**Type**: `document-count`  
**Size**: `small` (1x1)

**Purpose**: Display total document count

**Component**:

```tsx
// apps/web/src/components/widgets/DocumentCountWidget.tsx

export function DocumentCountWidget({ tenantId }: { tenantId: string }) {
  const { data: count } = useQuery({
    queryKey: ['documents', tenantId, 'count'],
    queryFn: () => api.documents.getCount(tenantId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{count || 0}</div>
        <p className="text-xs text-gray-500 mt-1">Total documents</p>
      </CardContent>
    </Card>
  );
}
```

---

### 4. Upload Activity Chart Widget

**Type**: `document-upload-activity`  
**Size**: `large` (2x3)

**Purpose**: Show upload trends

**Data**: Documents uploaded per day (last 30 days)

**Component**:

```tsx
// apps/web/src/components/widgets/UploadActivityWidget.tsx

export function UploadActivityWidget({ tenantId }: { tenantId: string }) {
  const { data: activityData } = useQuery({
    queryKey: ['documents', tenantId, 'activity'],
    queryFn: () => api.documents.getUploadActivity(tenantId, 30),
  });

  if (!activityData) return <SkeletonCard />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Upload Activity (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart
          data={activityData}
          xKey="date"
          yKey="count"
          height={200}
        />
      </CardContent>
    </Card>
  );
}
```

---

### 5. Quick Upload Widget

**Type**: `document-quick-upload`  
**Size**: `medium` (1x2)

**Purpose**: Quick access to upload modal

**Component**:

```tsx
// apps/web/src/components/widgets/QuickUploadWidget.tsx

export function QuickUploadWidget({ tenantId, onUploadSuccess }: {
  tenantId: string;
  onUploadSuccess?: () => void;
}) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    <>
      <Card className="flex flex-col items-center justify-center min-h-full">
        <CardContent className="flex flex-col items-center justify-center gap-4 w-full h-full">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <CloudUploadIcon className="h-8 w-8 text-blue-600" />
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
            Upload Document
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Drag files here or click
          </p>
        </CardContent>
      </Card>

      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          onUploadSuccess?.();
        }}
      />
    </>
  );
}
```

---

### 6. Collections List Widget

**Type**: `document-collections`  
**Size**: `medium` (2x2)

**Purpose**: Show collections and navigate

**Component**:

```tsx
// apps/web/src/components/widgets/CollectionsWidget.tsx

export function CollectionsWidget({ tenantId, onNavigate }: {
  tenantId: string;
  onNavigate?: (collectionId: string) => void;
}) {
  const { data: collections } = useQuery({
    queryKey: ['collections', tenantId],
    queryFn: () => api.collections.list(tenantId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Collections</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {collections?.slice(0, 5).map((collection) => (
            <button
              key={collection.id}
              onClick={() => onNavigate?.(collection.id)}
              className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center gap-2"
            >
              <FolderIcon className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {collection.name}
                </p>
                <p className="text-xs text-gray-500">
                  {collection.documentCount} files
                </p>
              </div>
            </button>
          ))}
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => onNavigate?.('')}
          >
            View All Collections
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 7. File Type Distribution Widget

**Type**: `document-file-types`  
**Size**: `medium` (2x2)

**Purpose**: Show breakdown by file type

**Component**:

```tsx
// apps/web/src/components/widgets/FileTypeDistributionWidget.tsx

export function FileTypeDistributionWidget({ tenantId }: { tenantId: string }) {
  const { data: distribution } = useQuery({
    queryKey: ['documents', tenantId, 'by-type'],
    queryFn: () => api.documents.getByType(tenantId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">File Types</CardTitle>
      </CardHeader>
      <CardContent>
        <PieChart data={distribution} height={200} />
      </CardContent>
    </Card>
  );
}
```

---

## Data Models & Types

### Core Types

```typescript
// apps/web/src/types/documents.ts

export interface Document {
  id: string;
  name: string;
  description?: string;
  documentType?: string;
  mimeType: string;
  fileSize: number;
  category?: string;
  tags: string[];
  visibility: DocumentVisibility;
  storagePath: string;
  blobUrl?: string;
  previewPath?: string;
  thumbnailPath?: string;
  status: DocumentStatus;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  collectionIds?: string[];
  retentionPolicyId?: string;
}

export type DocumentVisibility = 'public' | 'internal' | 'confidential';
export type DocumentStatus = 'active' | 'deleted' | 'quarantined' | 'scan_failed';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  collectionType: 'folder' | 'tag' | 'smart';
  documentIds: string[];
  query?: CollectionQuery;
  visibility: DocumentVisibility;
  parentCollectionId?: string;
  children?: Collection[];
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionQuery {
  filters: DocumentFilters;
}

export interface DocumentFilters {
  search?: string;
  category?: string;
  tags?: string[];
  visibility?: DocumentVisibility;
  fileType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percent: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  speed?: number;
  estimatedTime?: number;
  startTime: number;
}

export interface DocumentMetadata {
  category?: string;
  tags: string[];
  visibility: DocumentVisibility;
  description?: string;
}

export interface TenantDocumentSettings {
  maxFileSizeBytes: number;
  maxStorageSizeBytes: number;
  currentStorageUsed: number;
  acceptedMimeTypes: string[];
  blockedMimeTypes?: string[];
  categories: Category[];
  allowCustomCategories: boolean;
  controlledTags?: string[];
  defaultVisibility: DocumentVisibility;
  allowPublicDocuments: boolean;
  defaultRetentionDays: number;
  features: {
    enableVirusScanning: boolean;
    enablePIIRedaction: boolean;
    enableTextExtraction: boolean;
    enablePreviewGeneration: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  retentionDays?: number;
  isActive: boolean;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  documentCount: number;
  collectionCount: number;
}
```

---

## Implementation Patterns

### 1. Upload Management Hook

```typescript
// apps/web/src/hooks/useDocumentUpload.ts

export function useDocumentUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(
    new Map()
  );
  const [batchMetadata, setBatchMetadata] = useState<DocumentMetadata>({
    tags: [],
    visibility: 'internal',
  });

  const addFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((fileName: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  }, []);

  const updateProgress = useCallback(
    (fileName: string, progress: UploadProgress) => {
      setUploadProgress((prev) => new Map(prev).set(fileName, progress));
    },
    []
  );

  const startUpload = useCallback(
    async (onSuccess?: (docs: Document[]) => void) => {
      const uploadedDocs: Document[] = [];

      for (const file of selectedFiles) {
        try {
          updateProgress(file.name, {
            fileId: file.name,
            fileName: file.name,
            loaded: 0,
            total: file.size,
            percent: 0,
            status: 'uploading',
            startTime: Date.now(),
          });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', file.name);
          formData.append('category', batchMetadata.category || '');
          formData.append('tags', JSON.stringify(batchMetadata.tags));
          formData.append('visibility', batchMetadata.visibility);

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = (e.loaded / e.total) * 100;
              const speed = e.loaded / ((Date.now() - uploadProgress.get(file.name)?.startTime!) / 1000);
              const estimatedTime = (e.total - e.loaded) / speed;

              updateProgress(file.name, {
                fileId: file.name,
                fileName: file.name,
                loaded: e.loaded,
                total: e.total,
                percent,
                status: 'uploading',
                speed,
                estimatedTime,
                startTime: uploadProgress.get(file.name)?.startTime!,
              });
            }
          });

          const response = await new Promise<Document>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status === 200 || xhr.status === 202) {
                const doc = JSON.parse(xhr.responseText);
                resolve(doc);
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            };
            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.open('POST', '/api/v1/documents/upload');
            xhr.setRequestHeader(
              'Authorization',
              `Bearer ${getAuthToken()}`
            );
            xhr.send(formData);
          });

          uploadedDocs.push(response);
          updateProgress(file.name, {
            fileId: file.name,
            fileName: file.name,
            loaded: file.size,
            total: file.size,
            percent: 100,
            status: 'completed',
            startTime: uploadProgress.get(file.name)?.startTime!,
          });
        } catch (error) {
          updateProgress(file.name, {
            fileId: file.name,
            fileName: file.name,
            loaded: uploadProgress.get(file.name)?.loaded || 0,
            total: file.size,
            percent: uploadProgress.get(file.name)?.percent || 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            startTime: uploadProgress.get(file.name)?.startTime!,
          });
        }
      }

      onSuccess?.(uploadedDocs);
      return uploadedDocs;
    },
    [selectedFiles, batchMetadata, updateProgress]
  );

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setUploadProgress(new Map());
  }, []);

  return {
    selectedFiles,
    uploadProgress,
    batchMetadata,
    setBatchMetadata,
    addFiles,
    removeFile,
    updateProgress,
    startUpload,
    clearAll,
  };
}
```

### 2. Document Query Hook

```typescript
// apps/web/src/hooks/useDocuments.ts

export function useDocuments(filters?: DocumentFilters) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.tags?.length)
        params.append('tags', filters.tags.join(','));
      if (filters?.visibility) params.append('visibility', filters.visibility);
      if (filters?.fileType) params.append('mimeType', filters.fileType);

      const response = await fetch(
        `/api/v1/documents?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  return { documents: data?.data || [], isLoading, error, refetch };
}
```

### 3. Document Metadata Edit Dialog

```typescript
// apps/web/src/components/documents/DocumentEditDialog.tsx

interface DocumentEditDialogProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Document>) => Promise<void>;
  tenantSettings: TenantDocumentSettings;
}

export function DocumentEditDialog({
  document,
  isOpen,
  onClose,
  onSave,
  tenantSettings,
}: DocumentEditDialogProps) {
  const form = useForm({
    resolver: zodResolver(documentEditSchema),
    defaultValues: {
      name: document.name,
      description: document.description,
      category: document.category,
      tags: document.tags,
      visibility: document.visibility,
    },
  });

  const onSubmit = async (data: any) => {
    await onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenantSettings.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagsInput
                      value={field.value}
                      onChange={field.onChange}
                      suggestions={tenantSettings.controlledTags}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Code Examples

### Complete Upload Page Implementation

```typescript
// apps/web/src/app/(protected)/documents/upload/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { UploadDropZone } from '@/components/documents/UploadDropZone';
import { UploadFilesList } from '@/components/documents/UploadFilesList';
import { UploadBatchSettings } from '@/components/documents/UploadBatchSettings';
import { UploadSummary } from '@/components/documents/UploadSummary';

export default function UploadDocumentsPage() {
  const router = useRouter();
  const { tenantSettings } = useTenantSettings();
  const {
    selectedFiles,
    uploadProgress,
    batchMetadata,
    setBatchMetadata,
    addFiles,
    removeFile,
    startUpload,
    clearAll,
  } = useDocumentUpload();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();

  const handleStartUpload = async () => {
    setIsUploading(true);
    setUploadError(undefined);
    try {
      await startUpload((docs) => {
        // Redirect to documents page
        router.push('/documents');
      });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Upload failed'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Documents</h1>
        <p className="text-gray-600 mt-1">
          Upload single or multiple documents to your tenant
        </p>
      </div>

      {uploadError && (
        <Alert variant="destructive">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {selectedFiles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Documents</CardTitle>
            <CardDescription>
              Drag files here or click to select
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDropZone
              onFilesSelected={addFiles}
              acceptedTypes={tenantSettings?.acceptedMimeTypes}
              maxSize={tenantSettings?.maxFileSizeBytes}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <UploadBatchSettings
            metadata={batchMetadata}
            onChange={setBatchMetadata}
            categories={tenantSettings?.categories || []}
            controlledTags={tenantSettings?.controlledTags}
          />

          <UploadFilesList
            files={selectedFiles}
            uploadProgress={uploadProgress}
            onRemoveFile={removeFile}
          />

          <UploadSummary
            fileCount={selectedFiles.length}
            totalSize={selectedFiles.reduce((sum, f) => sum + f.size, 0)}
            onStartUpload={handleStartUpload}
            onClearAll={clearAll}
            isUploading={isUploading}
          />
        </>
      )}
    </div>
  );
}
```

---

## Summary

This documentation provides:

✅ **7 Core Pages** with routing and layout structure  
✅ **8 Reusable Components** with detailed props and usage  
✅ **7 Dashboard Widgets** ready for widget catalog integration  
✅ **TypeScript Type Definitions** for all data models  
✅ **Implementation Patterns** with hooks and utilities  
✅ **Code Examples** for common operations  

**Next Steps**:
1. Create component files in `apps/web/src/components/documents/`
2. Create page files in `apps/web/src/app/(protected)/documents/`
3. Register widgets in widget catalog
4. Implement hooks in `apps/web/src/hooks/`
5. Add to navigation/sidebar

All components use **shadcn/ui** and follow existing Castiel patterns.

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - UI design and implementation guide complete, but implementation status needs verification

#### Implemented Features (✅)

- ✅ Comprehensive UI design documentation
- ✅ Component specifications
- ✅ Page structure and routing defined
- ✅ Dashboard widget integration planned
- ✅ TypeScript type definitions
- ✅ Implementation patterns documented

#### Known Limitations

- ⚠️ **Implementation Status** - UI components may not be fully implemented
  - **Code Reference:**
    - Components may not exist in `apps/web/src/components/documents/`
    - Pages may not exist in `apps/web/src/app/(protected)/documents/`
  - **Recommendation:**
    1. Verify component implementation status
    2. Verify page implementation status
    3. Update documentation with actual implementation status

- ⚠️ **Widget Integration** - Dashboard widgets may not be registered
  - **Recommendation:**
    1. Verify widget registration
    2. Test widget functionality
    3. Document widget integration

### Related Documentation

- [Gap Analysis](../../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Frontend Documentation](../../frontend/README.md) - Frontend implementation
- [Component Standards](../../guides/component-standards.md) - Component standards
