# ShardType Feature - Architecture & Development Guide

## Overview

This document provides technical details about the ShardType feature implementation, including architecture decisions, component structure, and development guidelines.

## Architecture

### Technology Stack

- **Frontend Framework**: Next.js 16 (App Router)
- **State Management**: TanStack Query v5 (React Query)
- **Form Management**: React Hook Form + Zod
- **UI Components**: shadcn/ui + Tailwind CSS
- **Code Editor**: Monaco Editor (via @monaco-editor/react)
- **Testing**: Vitest + React Testing Library
- **Type Safety**: TypeScript (strict mode)

### Directory Structure

```
services/frontend/src/
├── app/(protected)/shard-types/          # Page routes
│   ├── page.tsx                          # List page
│   ├── new/page.tsx                      # Create page
│   ├── [id]/
│   │   ├── page.tsx                      # Detail page
│   │   ├── edit/page.tsx                 # Edit page
│   │   └── preview/page.tsx              # Preview page
│   └── _components/                      # Page-specific components
│       ├── filters.tsx
│       └── data-table.tsx
│
├── components/shard-types/               # Reusable components
│   ├── shard-type-icon.tsx              # Icon display
│   ├── shard-type-badge.tsx             # Badge component
│   ├── shard-type-card.tsx              # Card layout
│   ├── shard-type-preview.tsx           # Form preview
│   ├── schema-inheritance-tree.tsx       # Inheritance visualization
│   ├── parent-type-selector.tsx          # Parent selection
│   ├── tags-input.tsx                    # Tag management
│   ├── color-picker.tsx                  # Color selection
│   ├── icon-picker.tsx                   # Icon selection
│   ├── ui-schema-editor.tsx              # UI Schema editor
│   └── schema-builder/                   # Schema builder components
│       ├── index.tsx                     # Tab switcher
│       ├── visual-builder.tsx            # Visual mode
│       ├── code-editor.tsx               # Code mode
│       ├── field-builder.tsx             # Field dialog
│       └── field-list.tsx                # Field list
│
├── hooks/                                 # Custom React hooks
│   ├── use-shard-types.ts                # Query hooks
│   ├── use-shard-type-mutations.ts       # Mutation hooks
│   ├── use-shard-type-usage.ts           # Usage statistics
│   ├── use-shard-type-validation.ts      # Validation helpers
│   └── use-shard-type-form.ts            # Form management
│
├── lib/api/shard-types.ts                # API client
├── types/api.ts                           # TypeScript types
└── test/                                  # Test utilities
    └── test-utils.tsx
```

## Component Architecture

### Page Components

#### List Page (`app/(protected)/shard-types/page.tsx`)
**Purpose**: Display paginated list of ShardTypes with filtering

**Key Features**:
- Server-side pagination via TanStack Query
- Filter by category, status, tags
- Search by name/displayName
- Quick actions: Create, View, Edit, Delete, Clone

**Data Flow**:
```
useShardTypes(filters) → shardTypeApi.list() → Backend API
  ↓
PaginatedResponse<ShardType>
  ↓
ShardTypeDataTable → Row Actions
```

#### Create/Edit Pages
**Purpose**: Form for creating or editing ShardTypes

**Form Sections**:
1. Basic Information (name, displayName, description, category)
2. Schema Definition (Visual or Code editor)
3. UI Customization (optional UI Schema)
4. Visual Identity (icon, color)
5. Organization (tags)

**Data Flow**:
```
useShardTypeForm() → React Hook Form + Zod validation
  ↓
onSubmit → useCreateShardType() or useUpdateShardType()
  ↓
shardTypeApi.create/update() → Backend API
  ↓
Invalidate queries → Redirect to detail page
```

#### Detail Page (`app/(protected)/shard-types/[id]/page.tsx`)
**Purpose**: Display ShardType details with actions

**Sections**:
- Header with badges and actions
- Main content with schema display
- Usage statistics
- Inheritance tree (if has parent/children)

### Reusable Components

#### ShardTypeBadge
**Purpose**: Display ShardType as a compact badge

**Props**:
```typescript
{
  shardType: Pick<ShardType, "id" | "name" | "displayName" | "icon" | "color" | "status" | "isGlobal">
  showStatus?: boolean
  showGlobalIndicator?: boolean
  href?: string
  size?: "sm" | "md" | "lg"
  onClick?: (e: MouseEvent) => void
}
```

**Features**:
- Color-coded background
- Icon display with fallback
- Status indicator (active/deprecated)
- Global badge for system-wide types
- Clickable with navigation

#### Schema Builder
**Purpose**: Visual and code-based schema editing

**Components**:
- `SchemaBuilderTabs`: Tab switcher (Visual/Code)
- `VisualSchemaBuilder`: Drag-and-drop field builder
- `CodeSchemaEditor`: Monaco editor with JSON Schema support
- `FieldBuilder`: Dialog for adding/editing fields
- `FieldList`: Display and reorder schema fields

**State Synchronization**:
- Both modes share the same JSON Schema state
- Changes in Visual mode update Code mode instantly
- Code mode validates before syncing to Visual mode

## State Management

### TanStack Query Architecture

#### Query Keys
```typescript
export const shardTypeKeys = {
  all: ['shardTypes'] as const,
  lists: () => [...shardTypeKeys.all, 'list'] as const,
  list: (params: ShardTypeListParams) => 
    [...shardTypeKeys.lists(), params] as const,
  details: () => [...shardTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...shardTypeKeys.details(), id] as const,
}
```

#### Caching Strategy
- **List queries**: 5-minute stale time
- **Detail queries**: 10-minute stale time
- **Global types**: 10-minute stale time (rarely change)
- **Mutations**: Invalidate relevant queries on success

#### Optimistic Updates
```typescript
// Example: Update mutation with optimistic UI
useUpdateShardType({
  onMutate: async ({ id, data }) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries(shardTypeKeys.detail(id))
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(shardTypeKeys.detail(id))
    
    // Optimistically update
    queryClient.setQueryData(shardTypeKeys.detail(id), {
      ...previous,
      ...data
    })
    
    return { previous, id }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(
        shardTypeKeys.detail(context.id),
        context.previous
      )
    }
  },
  onSettled: (data, error, { id }) => {
    // Refetch to sync with server
    queryClient.invalidateQueries(shardTypeKeys.detail(id))
  }
})
```

### Form State Management

#### React Hook Form Integration
```typescript
const form = useShardTypeForm({
  defaultValues: existingShardType || {
    name: '',
    displayName: '',
    category: ShardTypeCategory.DOCUMENT,
    schema: {},
    isGlobal: false,
    tags: [],
  },
})

// Zod validation runs on change
const { errors, isValid } = form.formState
```

#### Schema Builder State
- Managed internally by Visual Builder
- Synced to form via `onChange` callback
- Code Editor uses Monaco's built-in state management

## Data Validation

### Client-Side Validation (Zod)

```typescript
export const shardTypeFormSchema = z.object({
  name: z.string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  displayName: z.string()
    .min(2)
    .max(200),
  description: z.string()
    .max(1000)
    .optional(),
  category: z.nativeEnum(ShardTypeCategory),
  schema: z.record(z.string(), z.any())
    .refine(isValidObject),
  uiSchema: z.record(z.string(), z.any()).optional(),
  isGlobal: z.boolean(),
  parentShardTypeId: z.string().uuid().optional(),
  icon: z.string().optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  tags: z.array(z.string()),
})
```

### Server-Side Validation
- Handled by backend API
- Additional checks:
  - Circular inheritance prevention
  - Schema compatibility with parent
  - Usage validation before deletion
  - Permission checks (RBAC)

## API Integration

### API Client Structure

```typescript
export const shardTypeApi = {
  // CRUD operations
  list: async (params?: ShardTypeListParams): Promise<PaginatedResponse<ShardType>>
  get: async (id: string): Promise<ShardType>
  create: async (data: CreateShardTypeInput): Promise<ShardType>
  update: async (id: string, data: UpdateShardTypeInput): Promise<ShardType>
  delete: async (id: string): Promise<void>
  
  // Additional operations
  getChildren: async (id: string): Promise<ShardType[]>
  getUsage: async (id: string): Promise<ShardTypeUsage>
  validateSchema: async (schema: JSONSchema): Promise<ValidationResult>
  clone: async (id: string, newName: string): Promise<ShardType>
}
```

### Error Handling

```typescript
// Centralized error handler
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message
  }
  return 'An unexpected error occurred'
}

// Usage in hooks
const mutation = useMutation({
  mutationFn: shardTypeApi.create,
  onError: (error) => {
    const message = handleApiError(error)
    toast.error(message)
  }
})
```

## Testing Strategy

### Unit Tests
- **Validation schemas**: Test all Zod schemas
- **Utility functions**: Test transformers, helpers
- **Query key factories**: Test key generation

### Component Tests
- **Isolated component rendering**: Test props, events
- **User interactions**: Test clicks, inputs, selections
- **Accessibility**: Test keyboard navigation, ARIA

### Integration Tests
- **Page flows**: Test full user journeys
- **Form submissions**: Test validation and submission
- **Data mutations**: Test optimistic updates

### Test Utilities

```typescript
// Custom render with providers
function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

## Performance Considerations

### Code Splitting
```typescript
// Lazy load Monaco Editor
const CodeEditor = dynamic(
  () => import('@/components/shard-types/schema-builder/code-editor'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

### Memoization
```typescript
// Memoize expensive computations
const sortedTypes = useMemo(() => {
  return shardTypes.sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  )
}, [shardTypes])

// Memoize callbacks
const handleDelete = useCallback((id: string) => {
  deleteMutation.mutate(id)
}, [deleteMutation])
```

### Pagination
- Server-side pagination for large datasets
- Configurable page size (10, 25, 50, 100)
- Query params preserved in URL

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- All interactive elements focusable
- Logical tab order
- Escape to close modals/dialogs
- Arrow keys for dropdowns

### Screen Readers
- Semantic HTML elements
- ARIA labels on icon buttons
- ARIA live regions for toasts
- Form field associations

### Color Contrast
- 4.5:1 for normal text
- 3:1 for large text
- Focus indicators visible

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+

## Development Guidelines

### Adding a New Component

1. Create component file in appropriate directory
2. Define TypeScript interface for props
3. Add JSDoc comments
4. Implement component with proper types
5. Add unit tests
6. Export from index file
7. Document in Storybook (if applicable)

### Adding a New Hook

1. Create hook file in `hooks/` directory
2. Use proper naming: `use-feature-name.ts`
3. Define clear return type
4. Add JSDoc comments with examples
5. Write unit tests
6. Export from hooks index

### Code Style

- Use functional components
- Prefer named exports
- Use TypeScript strict mode
- Follow Airbnb style guide
- Run ESLint and Prettier before commit

### Git Workflow

1. Create feature branch: `feature/shard-types-component-x`
2. Make atomic commits
3. Write descriptive commit messages
4. Run tests before pushing
5. Create PR with template
6. Address review comments
7. Squash and merge

## Deployment

### Build Process
```bash
# Install dependencies
pnpm install

# Build packages
pnpm -r --filter './packages/*' build

# Build frontend
cd services/frontend && pnpm build

# Run production server
pnpm start
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.castiel.app
NEXT_PUBLIC_APP_ENV=production
```

## Troubleshooting

### Common Issues

**"Module not found" errors**
- Check TypeScript path aliases in `tsconfig.json`
- Verify import paths use `@/` prefix
- Restart TypeScript server

**Monaco Editor not loading**
- Ensure `@monaco-editor/react` is installed
- Check dynamic import is properly configured
- Verify SSR is disabled for Monaco component

**TanStack Query not updating**
- Check query keys are properly structured
- Verify invalidation after mutations
- Inspect React Query DevTools

**Form validation not working**
- Verify Zod schema matches form fields
- Check `zodResolver` is configured
- Inspect form errors in DevTools

## Future Enhancements

### Planned Features
- Version history and rollback
- Schema migration tools
- Import/Export ShardTypes
- Field library for reusable definitions
- Real-time collaboration
- AI-assisted schema generation

### Performance Improvements
- Virtual scrolling for large lists
- Incremental schema validation
- Web Worker for JSON Schema validation
- IndexedDB caching for offline support

---

**Maintained by**: Castiel Development Team  
**Last Updated**: November 2025  
**Version**: 1.0.0
