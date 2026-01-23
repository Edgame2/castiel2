# ShardType API Reference

## REST API Endpoints

Base URL: `/api/v1/shard-types`

---

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### List ShardTypes

**GET** `/api/v1/shard-types`

Retrieve a paginated list of shard types with optional filtering.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `category` | string | No | Filter by category (DOCUMENT, DATA, MEDIA, CONFIGURATION, CUSTOM) |
| `status` | string | No | Filter by status (ACTIVE, DEPRECATED, DELETED) |
| `isGlobal` | boolean | No | Filter by scope (true for global, false for tenant) |
| `tags` | string[] | No | Filter by tags (comma-separated) |
| `search` | string | No | Search in name, displayName, description |
| `sortBy` | string | No | Sort field (name, displayName, createdAt, updatedAt) |
| `sortOrder` | string | No | Sort direction (asc, desc) |

#### Response

```typescript
{
  "data": ShardType[],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalItems": 95,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Example

```bash
GET /api/v1/shard-types?category=DOCUMENT&status=ACTIVE&page=1&limit=10
```

---

### Get ShardType by ID

**GET** `/api/v1/shard-types/:id`

Retrieve a single shard type by its ID.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ShardType ID |

#### Response

```typescript
{
  "id": "uuid",
  "name": "customer-record",
  "displayName": "Customer Record",
  "description": "Stores customer information",
  "category": "DATA",
  "schema": { ... },
  "uiSchema": { ... },
  "icon": "Users",
  "color": "#3b82f6",
  "tags": ["crm", "customers"],
  "isGlobal": false,
  "parentShardTypeId": null,
  "status": "ACTIVE",
  "isSystem": false,
  "isActive": true,
  "version": 1,
  "tenantId": "tenant-uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

#### Errors

- `404 Not Found`: ShardType does not exist
- `403 Forbidden`: User lacks permission to view this ShardType

---

### Create ShardType

**POST** `/api/v1/shard-types`

Create a new shard type.

#### Permissions

- **Admin**: Can create tenant-specific types (`isGlobal: false`)
- **Super Admin**: Can create global types (`isGlobal: true`)

#### Request Body

```typescript
{
  "name": "string",              // Required: lowercase, alphanumeric + hyphens
  "displayName": "string",       // Required: 2-200 chars
  "description": "string",       // Optional: max 1000 chars
  "category": "DOCUMENT" | "DATA" | "MEDIA" | "CONFIGURATION" | "CUSTOM",
  "schema": { ... },             // Required: Valid JSON Schema v7
  "uiSchema": { ... },           // Optional: UI customization
  "icon": "string",              // Optional: Lucide icon name
  "color": "string",             // Optional: Hex color (#RRGGBB)
  "tags": ["string"],            // Optional: Array of tags
  "isGlobal": boolean,           // Optional: Default false
  "parentShardTypeId": "uuid"    // Optional: Parent type for inheritance
}
```

#### Response

```typescript
// 201 Created
{
  "id": "new-uuid",
  "name": "customer-record",
  ...
}
```

#### Errors

- `400 Bad Request`: Validation error (e.g., invalid schema, circular inheritance)
- `403 Forbidden`: User lacks permission (e.g., non-super-admin trying to create global type)
- `409 Conflict`: ShardType with this name already exists

#### Example

```bash
curl -X POST https://api.castiel.app/api/v1/shard-types \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "blog-post",
    "displayName": "Blog Post",
    "category": "DOCUMENT",
    "schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "content": { "type": "string" }
      },
      "required": ["title", "content"]
    },
    "tags": ["content", "blog"]
  }'
```

---

### Update ShardType

**PATCH** `/api/v1/shard-types/:id`

Update an existing shard type.

#### Permissions

- **Admin**: Can update tenant-specific types they own
- **Super Admin**: Can update any type

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ShardType ID |

#### Request Body

All fields are optional. Only provided fields will be updated.

```typescript
{
  "displayName"?: "string",
  "description"?: "string",
  "category"?: "DOCUMENT" | "DATA" | "MEDIA" | "CONFIGURATION" | "CUSTOM",
  "schema"?: { ... },
  "uiSchema"?: { ... },
  "icon"?: "string",
  "color"?: "string",
  "tags"?: ["string"],
  "parentShardTypeId"?: "uuid" | null,
  "status"?: "ACTIVE" | "DEPRECATED"
}
```

#### Response

```typescript
// 200 OK
{
  "id": "uuid",
  "name": "customer-record",
  "displayName": "Updated Name",
  ...
  "version": 2  // Version incremented
}
```

#### Errors

- `400 Bad Request`: Validation error
- `403 Forbidden`: User lacks permission
- `404 Not Found`: ShardType does not exist
- `409 Conflict`: Update would create circular inheritance

---

### Delete ShardType

**DELETE** `/api/v1/shard-types/:id`

Soft delete a shard type. Sets status to `DELETED`.

#### Permissions

- **Admin**: Can delete tenant-specific types they own (if not in use)
- **Super Admin**: Can delete any type (with warnings)

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ShardType ID |

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `force` | boolean | No | Force delete even if in use (Super Admin only) |

#### Response

```typescript
// 204 No Content
```

#### Errors

- `400 Bad Request`: ShardType is in use (cannot delete)
- `403 Forbidden`: User lacks permission
- `404 Not Found`: ShardType does not exist

---

### Clone ShardType

**POST** `/api/v1/shard-types/:id/clone`

Create a copy of an existing shard type with a new name.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ShardType ID to clone |

#### Request Body

```typescript
{
  "name": "string",              // Required: New unique name
  "displayName": "string",       // Optional: Default to "{Original} Copy"
  "description": "string"        // Optional: Override description
}
```

#### Response

```typescript
// 201 Created
{
  "id": "new-uuid",
  "name": "customer-record-v2",
  "displayName": "Customer Record Copy",
  ...
}
```

---

### Get Child Types

**GET** `/api/v1/shard-types/:id/children`

Retrieve all shard types that inherit from this type.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | Parent ShardType ID |

#### Response

```typescript
{
  "data": ShardType[]
}
```

---

### Get Usage Statistics

**GET** `/api/v1/shard-types/:id/usage`

Get statistics about how this shard type is being used.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | ShardType ID |

#### Response

```typescript
{
  "shardTypeId": "uuid",
  "shardCount": 125,
  "recentShards": [
    {
      "id": "shard-uuid",
      "title": "Shard Title",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "childTypeCount": 3,
  "usageByTenant": {
    "tenant-1": 50,
    "tenant-2": 75
  }
}
```

---

### Validate Schema

**POST** `/api/v1/shard-types/validate-schema`

Validate a JSON Schema without creating a ShardType.

#### Request Body

```typescript
{
  "schema": { ... },             // Required: JSON Schema to validate
  "parentShardTypeId": "uuid"    // Optional: Check compatibility with parent
}
```

#### Response

```typescript
// 200 OK
{
  "valid": true,
  "errors": [],
  "warnings": [
    "Schema contains no required fields"
  ]
}
```

Or:

```typescript
// 200 OK
{
  "valid": false,
  "errors": [
    "Invalid type at path 'properties.age.type'",
    "Missing 'type' keyword at root"
  ],
  "warnings": []
}
```

---

## Type Definitions

### ShardType

```typescript
interface ShardType {
  id: string                      // UUID
  name: string                    // Unique identifier (lowercase, alphanumeric + hyphens)
  displayName: string             // Human-readable name
  description?: string            // Optional description
  category: ShardTypeCategory     // DOCUMENT, DATA, MEDIA, CONFIGURATION, CUSTOM
  schema: JSONSchema              // JSON Schema v7 definition
  uiSchema?: Record<string, any>  // UI customization
  icon?: string                   // Lucide icon name
  color?: string                  // Hex color (#RRGGBB)
  tags: string[]                  // Tags for organization
  isGlobal: boolean               // System-wide (true) or tenant-specific (false)
  parentShardTypeId?: string      // Parent type for inheritance
  status: ShardTypeStatus         // ACTIVE, DEPRECATED, DELETED
  isSystem: boolean               // Built-in system type
  isActive: boolean               // Active status
  version: number                 // Schema version
  tenantId: string                // Owner tenant ("system" for global)
  createdAt: string               // ISO 8601 timestamp
  updatedAt: string               // ISO 8601 timestamp
}
```

### ShardTypeCategory

```typescript
enum ShardTypeCategory {
  DOCUMENT = 'DOCUMENT',
  DATA = 'DATA',
  MEDIA = 'MEDIA',
  CONFIGURATION = 'CONFIGURATION',
  CUSTOM = 'CUSTOM'
}
```

### ShardTypeStatus

```typescript
enum ShardTypeStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DELETED = 'DELETED'
}
```

### JSONSchema

```typescript
interface JSONSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array' | 'null'
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  enum?: any[]
  format?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  default?: any
  description?: string
  // ... other JSON Schema v7 keywords
}
```

---

## Frontend API Client

### Installation

```typescript
import { shardTypeApi } from '@/lib/api/shard-types'
```

### Methods

#### `shardTypeApi.list(params?)`

Fetch paginated list of shard types.

```typescript
const response = await shardTypeApi.list({
  category: ShardTypeCategory.DOCUMENT,
  status: ShardTypeStatus.ACTIVE,
  page: 1,
  limit: 20
})
// Returns: PaginatedResponse<ShardType>
```

#### `shardTypeApi.get(id)`

Fetch single shard type by ID.

```typescript
const shardType = await shardTypeApi.get('uuid')
// Returns: ShardType
```

#### `shardTypeApi.create(data)`

Create new shard type.

```typescript
const newType = await shardTypeApi.create({
  name: 'blog-post',
  displayName: 'Blog Post',
  category: ShardTypeCategory.DOCUMENT,
  schema: { ... },
  isGlobal: false,
  tags: []
})
// Returns: ShardType
```

#### `shardTypeApi.update(id, data)`

Update existing shard type.

```typescript
const updated = await shardTypeApi.update('uuid', {
  displayName: 'Updated Name'
})
// Returns: ShardType
```

#### `shardTypeApi.delete(id)`

Delete shard type.

```typescript
await shardTypeApi.delete('uuid')
// Returns: void
```

#### `shardTypeApi.clone(id, newName)`

Clone shard type.

```typescript
const cloned = await shardTypeApi.clone('uuid', 'customer-record-v2')
// Returns: ShardType
```

#### `shardTypeApi.getChildren(id)`

Get child types.

```typescript
const children = await shardTypeApi.getChildren('uuid')
// Returns: ShardType[]
```

#### `shardTypeApi.getUsage(id)`

Get usage statistics.

```typescript
const usage = await shardTypeApi.getUsage('uuid')
// Returns: ShardTypeUsage
```

#### `shardTypeApi.validateSchema(schema, parentId?)`

Validate JSON Schema.

```typescript
const result = await shardTypeApi.validateSchema({ type: 'object', properties: {...} })
// Returns: ValidationResult
```

---

## React Hooks

### Query Hooks

#### `useShardTypes(params?, options?)`

Fetch paginated list of shard types.

```tsx
const { data, isLoading, error } = useShardTypes({
  category: ShardTypeCategory.DOCUMENT,
  page: 1,
  limit: 20
})
```

#### `useShardType(id, options?)`

Fetch single shard type.

```tsx
const { data: shardType, isLoading } = useShardType(id)
```

#### `useGlobalShardTypes(options?)`

Fetch all global shard types.

```tsx
const { data: globalTypes } = useGlobalShardTypes()
```

#### `useActiveShardTypes(options?)`

Fetch all active shard types (filters out deprecated/deleted).

```tsx
const { data: activeTypes } = useActiveShardTypes()
```

### Mutation Hooks

#### `useCreateShardType(options?)`

Create shard type mutation.

```tsx
const createMutation = useCreateShardType()

const handleCreate = async (data: CreateShardTypeInput) => {
  await createMutation.mutateAsync(data)
  router.push('/shard-types')
}
```

#### `useUpdateShardType(options?)`

Update shard type mutation.

```tsx
const updateMutation = useUpdateShardType()

const handleUpdate = async (id: string, data: UpdateShardTypeInput) => {
  await updateMutation.mutateAsync({ id, data })
}
```

#### `useDeleteShardType(options?)`

Delete shard type mutation.

```tsx
const deleteMutation = useDeleteShardType()

const handleDelete = async (id: string) => {
  if (confirm('Are you sure?')) {
    await deleteMutation.mutateAsync(id)
  }
}
```

#### `useCloneShardType(options?)`

Clone shard type mutation.

```tsx
const cloneMutation = useCloneShardType()

const handleClone = async (id: string, newName: string) => {
  const cloned = await cloneMutation.mutateAsync({ id, newName })
  router.push(`/shard-types/${cloned.id}`)
}
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `SHARD_TYPE_NOT_FOUND` | 404 | ShardType with given ID does not exist |
| `SHARD_TYPE_NAME_EXISTS` | 409 | ShardType with this name already exists |
| `SHARD_TYPE_IN_USE` | 400 | Cannot delete ShardType that is being used |
| `CIRCULAR_INHERITANCE` | 400 | Parent selection would create circular reference |
| `INVALID_JSON_SCHEMA` | 400 | Provided schema is not valid JSON Schema v7 |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role/permission |
| `SCHEMA_INCOMPATIBLE` | 400 | Child schema incompatible with parent |

---

## Rate Limiting

- **List endpoints**: 100 requests per minute
- **Create/Update/Delete**: 30 requests per minute
- **Get by ID**: 200 requests per minute

Exceeded limits return `429 Too Many Requests`.

---

## Changelog

### v1.0.0 (2025-01-01)
- Initial release
- CRUD operations
- Type inheritance
- Schema validation
- Global vs tenant types

---

**Need Help?**
- [User Guide](../user-guide/shard-types.md)
- [Architecture Guide](../../services/frontend/src/components/shard-types/README.md)
- Contact: support@castiel.app

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - ShardType API fully documented

#### Implemented Features (✅)

- ✅ Complete REST API reference
- ✅ All CRUD operations documented
- ✅ Query parameters documented
- ✅ Request/response examples
- ✅ Error handling documented
- ✅ Permissions documented

#### Known Limitations

- ⚠️ **API Implementation** - Some endpoints may not be fully implemented
  - **Recommendation:**
    1. Verify all endpoints are implemented
    2. Test all documented features
    3. Update documentation if needed

- ⚠️ **Frontend Integration** - Frontend components may need updates
  - **Code Reference:**
    - Frontend components may need review
  - **Recommendation:**
    1. Verify frontend integration
    2. Test end-to-end workflows
    3. Document frontend usage

### Code References

- **Backend Services:**
  - `apps/api/src/services/shard-type.service.ts` - ShardType service
  - `apps/api/src/controllers/shard-type.controller.ts` - ShardType controller

- **API Routes:**
  - `/api/v1/shard-types/*` - ShardType endpoints

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Shards README](../shards/README.md) - Shards system documentation
- [API README](./README.md) - API overview
