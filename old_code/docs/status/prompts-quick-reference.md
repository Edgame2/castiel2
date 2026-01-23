# Prompts System - Quick Reference

## Endpoint Structure

### System Prompts (Super Admin only)
```
POST   /api/v1/prompts/system              # Create
GET    /api/v1/prompts/system              # List
GET    /api/v1/prompts/system/:id          # Read
PUT    /api/v1/prompts/system/:id          # Update
POST   /api/v1/prompts/system/:id/activate # Activate
POST   /api/v1/prompts/system/:id/archive  # Archive
```

### Tenant Prompts (Tenant Admin only)
```
POST   /api/v1/prompts/tenant              # Create
GET    /api/v1/prompts/tenant              # List
GET    /api/v1/prompts/tenant/:id          # Read
PUT    /api/v1/prompts/tenant/:id          # Update
POST   /api/v1/prompts/tenant/:id/activate # Activate
POST   /api/v1/prompts/tenant/:id/archive  # Archive
POST   /api/v1/prompts/tenant/import       # Clone from system
```

### User Prompts (Authenticated users)
```
POST   /api/v1/prompts/user                # Create
GET    /api/v1/prompts/user                # List own
GET    /api/v1/prompts/user/:id            # Read
PUT    /api/v1/prompts/user/:id            # Update
POST   /api/v1/prompts/user/:id/activate   # Activate
POST   /api/v1/prompts/user/:id/archive    # Archive
POST   /api/v1/prompts/user/:id/propose    # Propose for promotion
```

### Shared (All authenticated users)
```
POST   /api/v1/prompts/resolve             # Resolve with precedence
POST   /api/v1/prompts/preview             # Preview rendering
```

## Web Hooks

```typescript
// List prompts by scope
const { data, isLoading } = usePrompts({ 
  scope: 'user', 
  insightType: 'summary'
});

// Get single prompt
const { data } = usePrompt(id, 'user');

// Create prompt
const create = useCreatePrompt('user');
await create.mutateAsync({ ... });

// Update prompt
const update = useUpdatePrompt('user');
await update.mutateAsync({ id, data });

// Activate/Archive
const activate = useActivatePrompt('user');
const archive = useArchivePrompt('user');

// Preview
const preview = usePreviewPrompt();
const result = await preview.mutateAsync({ template, variables });

// Resolve
const resolve = useResolvePrompt();
const resolved = await resolve.mutateAsync({ slug, variables });
```

## Canonical Insight Types

```typescript
enum InsightType {
  Summary = 'summary',
  Analysis = 'analysis',
  Comparison = 'comparison',
  Recommendation = 'recommendation',
  Prediction = 'prediction',
  Extraction = 'extraction',
  Search = 'search',
  Generation = 'generation',
}
```

## RBAC Rules

| Role | System | Tenant | User |
|------|--------|--------|------|
| Super Admin | ✅ Full | View only | No |
| Tenant Admin | No | ✅ Full | No |
| User | No | No | ✅ Own only |

## Data Structure

```typescript
interface Prompt {
  id: string;                    // UUID
  tenantId: string;              // "SYSTEM" or tenant GUID
  ownerId?: string;              // Required for user scope
  slug: string;                  // Unique per tenant/scope
  name: string;
  scope: 'system' | 'tenant' | 'user';
  insightType?: InsightType;
  template: {
    systemPrompt?: string;
    userPrompt?: string;
    variables?: string[];        // Extracted from mustache {{vars}}
  };
  ragConfig?: {
    topK?: number;
    minScore?: number;
    includeCitations?: boolean;
    requiresContext?: boolean;
  };
  status: 'draft' | 'active' | 'archived';
  version: number;
  tags?: string[];
  createdBy: { userId: string; at: Date };
  updatedBy?: { userId: string; at: Date };
  metadata?: Record<string, unknown>;
}
```

## Common Usage Patterns

### Create a user prompt
```typescript
const create = useCreatePrompt('user');
const result = await create.mutateAsync({
  slug: 'summarize-meeting',
  name: 'Summarize Meeting',
  template: {
    systemPrompt: 'You are a meeting summarizer.',
    userPrompt: 'Summarize: {{text}}',
    variables: ['text']
  },
  status: 'draft'
});
```

### List user's prompts
```typescript
const { data: userPrompts } = usePrompts({ scope: 'user' });
```

### Resolve best prompt (with fallback)
```typescript
const resolve = useResolvePrompt();
const resolved = await resolve.mutateAsync({
  slug: 'summarize-meeting',
  insightType: 'summary',
  variables: { text: 'Meeting content...' }
});
// Returns user prompt, falls back to tenant, then system
```

### Preview template
```typescript
const preview = usePreviewPrompt();
const { systemPrompt, userPrompt } = await preview.mutateAsync({
  template: {
    systemPrompt: 'You are helpful.',
    userPrompt: 'Question: {{question}}'
  },
  variables: { question: 'What is AI?' }
});
// Returns rendered prompts with variables substituted
```

## Error Handling

```typescript
401 Unauthorized     // Not authenticated
403 Forbidden        // Insufficient permissions
404 Not Found        // Prompt doesn't exist
400 Bad Request      // Invalid input
```

## Caching

- React Query: Invalidated on mutations
- Server Cache: 5-minute TTL per slug
- Key: `tenantId:slug:userId`

## Important Notes

- **Tenant Isolation**: System prompts in "SYSTEM" partition, others in actual tenant ID
- **User Ownership**: Users can only access their own user-scoped prompts
- **Precedence**: User > Tenant > System when resolving
- **Promotion**: Users propose, Tenant Admins approve (future feature)
- **Immutability**: Cannot change prompt scope or tenantId after creation

---

**Document**: Prompts System Quick Reference  
**Last Updated**: 2025-12-19  
**Version**: 1.0
