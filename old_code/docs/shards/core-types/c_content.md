# c_content - Content ShardType

## Overview

The `c_content` ShardType represents general content items such as articles, blog posts, pages, and other text-based content. Unlike `c_document` which stores files and documents, or `c_generatedContent` which stores AI-generated outputs, `c_content` is designed for structured content management with rich text, metadata, and organizational features.

> **AI Role**: Content source for AI context assembly—provides structured content for summarization, semantic search, and AI insights.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Schema Definition](#schema-definition)
3. [Versioning](#versioning)
4. [Access Control](#access-control)
5. [Content Type Relationship](#content-type-relationship)
6. [Content Category Relationship](#content-category-relationship)
7. [External References](#external-references)
8. [Tags](#tags)
9. [Relationships](#relationships)
10. [AI Context Role](#ai-context-role)
11. [Examples](#examples)
12. [Best Practices](#best-practices)

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_content` |
| **Display Name** | Content |
| **Category** | DOCUMENT |
| **Global** | Yes |
| **System** | Yes |
| **Icon** | `BookOpen` |
| **Color** | `#8b5cf6` (Purple) |
| **Partition Key** | `/tenantId` |

---

## Schema Definition

### structuredData Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Content title (required per base schema) |
| `contentTypeId` | string (UUID) | No | Reference to `c_content_type` shard |
| `contentType` | string | No | Quick reference to content type name |
| `categoryId` | string (UUID) | No | Reference to `c_content_category` shard |
| `category` | string | No | Quick reference to category name |
| `summary` | string | No | Brief summary/abstract |
| `body` | string | No | Main content body (markdown/HTML) |
| `bodyFormat` | enum | No | Format: `markdown`, `html`, `plain` |
| `author` | object | No | Author information |
| `publishedAt` | datetime | No | Publication date |
| `status` | enum | No | `draft`, `published`, `archived` |
| `featuredImage` | string | No | Featured image URL/reference |
| `slug` | string | No | URL-friendly identifier |
| `seoTitle` | string | No | SEO title |
| `seoDescription` | string | No | SEO meta description |
| `readingTime` | number | No | Estimated reading time in minutes |
| `visibility` | enum | No | `internal` (tenant-wide) or `restricted` (ACL-controlled) |

### Field Details

#### `bodyFormat`
```typescript
enum BodyFormat {
  MARKDOWN = 'markdown',  // Markdown format (default)
  HTML = 'html',          // HTML format
  PLAIN = 'plain'         // Plain text
}
```

#### `status`
```typescript
enum ContentStatus {
  DRAFT = 'draft',         // Work in progress
  PUBLISHED = 'published', // Published and visible
  ARCHIVED = 'archived'    // Archived but accessible
}
```

#### `visibility`
```typescript
enum ContentVisibility {
  INTERNAL = 'internal',   // All users in tenant can access (default)
  RESTRICTED = 'restricted' // Only users/groups in ACL can access
}
```

#### `author`
```typescript
interface ContentAuthor {
  userId: string;          // User ID of author
  name: string;            // Author name
  email?: string;          // Author email
  avatar?: string;         // Author avatar URL
}
```

### unstructuredData Fields

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Full content text for AI processing |
| `rawData` | object | Additional raw content data |

### Base Shard Fields (Inherited)

All `c_content` shards inherit the following fields from the base shard schema:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier (auto-generated) |
| `tenantId` | string (UUID) | Tenant identifier (partition key) |
| `userId` | string (UUID) | Creator/owner identifier |
| `shardTypeId` | string (UUID) | Reference to `c_content` ShardType |
| `parentShardId` | string (UUID) | Optional parent shard for hierarchy |
| `revisionId` | string (UUID) | Current revision identifier |
| `revisionNumber` | number | Incrementing version number |
| `status` | enum | Shard lifecycle status (`active`, `archived`, `deleted`, `draft`) |
| `acl` | array | Access control list (for restricted content) |
| `external_relationships` | array | External system references |
| `metadata` | object | Organizational metadata (includes `tags`) |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://castiel.app/schemas/c_content.json",
  "title": "Content",
  "description": "General content items (articles, blog posts, pages)",
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Content title (required per base schema)"
    },
    "contentTypeId": {
      "type": "string",
      "format": "uuid",
      "description": "Reference to c_content_type shard"
    },
    "contentType": {
      "type": "string",
      "maxLength": 100,
      "description": "Quick reference to content type name"
    },
    "categoryId": {
      "type": "string",
      "format": "uuid",
      "description": "Reference to c_content_category shard"
    },
    "category": {
      "type": "string",
      "maxLength": 100,
      "description": "Quick reference to category name"
    },
    "summary": {
      "type": "string",
      "maxLength": 2000,
      "description": "Brief summary/abstract"
    },
    "body": {
      "type": "string",
      "description": "Main content body (markdown/HTML)"
    },
    "bodyFormat": {
      "type": "string",
      "enum": ["markdown", "html", "plain"],
      "default": "markdown",
      "description": "Content format"
    },
    "author": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "string",
          "format": "uuid"
        },
        "name": {
          "type": "string"
        },
        "email": {
          "type": "string",
          "format": "email"
        },
        "avatar": {
          "type": "string",
          "format": "uri"
        }
      },
      "required": ["userId", "name"],
      "description": "Author information"
    },
    "publishedAt": {
      "type": "string",
      "format": "date-time",
      "description": "Publication date"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "published", "archived"],
      "default": "draft",
      "description": "Content status"
    },
    "featuredImage": {
      "type": "string",
      "format": "uri",
      "description": "Featured image URL/reference"
    },
    "slug": {
      "type": "string",
      "maxLength": 200,
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      "description": "URL-friendly identifier"
    },
    "seoTitle": {
      "type": "string",
      "maxLength": 60,
      "description": "SEO title"
    },
    "seoDescription": {
      "type": "string",
      "maxLength": 160,
      "description": "SEO meta description"
    },
    "readingTime": {
      "type": "integer",
      "minimum": 0,
      "description": "Estimated reading time in minutes"
    },
    "visibility": {
      "type": "string",
      "enum": ["internal", "restricted"],
      "default": "internal",
      "description": "Access visibility level"
    }
  }
}
```

---

## Versioning

`c_content` uses the base shard versioning system with a **separate `revisions` container** for storing full version history.

### Versioning Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    c_content Shard                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ structuredData                                       │    │
│  │   name, body, status, ...                            │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Base Shard Fields                                    │    │
│  │   revisionId: "rev-uuid-123"                        │    │
│  │   revisionNumber: 5                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Updates create new revision
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              revisions Container (Cosmos DB)                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Revision 1 (CREATED)                                │    │
│  │   - revisionNumber: 1                               │    │
│  │   - data: { snapshot: full shard data }             │    │
│  │   - changeType: CREATED                             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Revision 2 (UPDATED)                                │    │
│  │   - revisionNumber: 2                               │    │
│  │   - data: { snapshot: full shard data }             │    │
│  │   - changeType: UPDATED                             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Revision 3 (UPDATED)                                │    │
│  │   - revisionNumber: 3                               │    │
│  │   - data: { snapshot: full shard data }             │    │
│  │   - changeType: UPDATED                             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### How Versioning Works

1. **Initial Creation**: When a content shard is created, a revision is automatically created in the `revisions` container with `changeType: CREATED`.

2. **Updates**: Each time the content is updated:
   - The shard's `revisionNumber` is incremented
   - A new `revisionId` is generated
   - A new revision document is created in the `revisions` container with `changeType: UPDATED`
   - The revision contains a full snapshot of the shard data

3. **Revision Structure**:
```typescript
interface Revision {
  id: string;                    // Unique revision ID
  shardId: string;               // Content shard ID
  tenantId: string;              // Partition key
  revisionNumber: number;        // Sequential number (1, 2, 3...)
  data: {
    strategy: 'FULL_SNAPSHOT';
    snapshot: any;               // Complete shard data at this revision
  };
  changeType: ChangeType;        // CREATED, UPDATED, DELETED, etc.
  changedBy: string;             // User ID who made the change
  timestamp: Date;               // When change was made
  metadata?: {
    changeDescription?: string;   // Optional description
  };
  ttl?: number;                  // Time-to-live (90 days default)
}
```

### Accessing Version History

Version history is accessed via API endpoints:

```http
# List all revisions for a content shard
GET /api/v1/shards/:shardId/revisions

# Get specific revision
GET /api/v1/shards/:shardId/revisions/:revisionNumber

# Get latest revision
GET /api/v1/shards/:shardId/revisions/latest

# Compare two revisions
POST /api/v1/shards/:shardId/revisions/compare
Body: {
  "fromRevisionNumber": 2,
  "toRevisionNumber": 5
}

# Revert to a previous revision
POST /api/v1/shards/:shardId/revert/:revisionNumber
```

### Revision Retention

- **Default TTL**: 90 days (configurable per tenant)
- **Milestone Revisions**: CREATED, MERGED, and RESTORED revisions are kept forever
- **Compression**: Revisions larger than 10KB are automatically compressed

---

## Access Control

`c_content` supports two access control patterns:

### 1. Internal Access (Default)

**All users in the tenant can access** the content. No specific ACL entries are required.

```json
{
  "structuredData": {
    "visibility": "internal"
  },
  "acl": [
    {
      "userId": "creator-user-id",
      "permissions": ["read", "write", "delete", "admin"],
      "grantedBy": "creator-user-id",
      "grantedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Behavior**:
- Content is accessible to all authenticated users in the tenant
- Creator has full permissions (read, write, delete, admin)
- No additional ACL entries needed for tenant-wide access

### 2. Restricted Access

**Only specified users/groups can access** the content. Requires explicit ACL entries.

```json
{
  "structuredData": {
    "visibility": "restricted"
  },
  "acl": [
    {
      "userId": "creator-user-id",
      "permissions": ["read", "write", "delete", "admin"],
      "grantedBy": "creator-user-id",
      "grantedAt": "2025-01-15T10:00:00Z"
    },
    {
      "userId": "editor-user-id",
      "permissions": ["read", "write"],
      "grantedBy": "creator-user-id",
      "grantedAt": "2025-01-15T10:05:00Z"
    },
    {
      "roleId": "content-reviewers",
      "permissions": ["read"],
      "grantedBy": "creator-user-id",
      "grantedAt": "2025-01-15T10:05:00Z"
    }
  ]
}
```

**Behavior**:
- Only users/groups listed in `acl` can access the content
- Permission levels: `read`, `write`, `delete`, `admin`
- Access is checked on every read/write operation

### Permission Levels

```typescript
enum PermissionLevel {
  READ = 'read',     // Can view the content
  WRITE = 'write',   // Can modify the content
  DELETE = 'delete', // Can delete the content
  ADMIN = 'admin'    // Can manage ACL and full control
}
```

---

## Content Type Relationship

`c_content` can reference a `c_content_type` shard to define the type of content (e.g., "blog post", "article", "page", "news item").

### Relationship Structure

```json
{
  "structuredData": {
    "contentTypeId": "content-type-uuid",
    "contentType": "blog-post"
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "content-type-uuid",
      "targetShardTypeId": "c_content_type-type-uuid",
      "relationshipType": "has_content_type",
      "label": "Content Type",
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

### Benefits

- **Type-specific validation**: Content type can define required fields
- **Type-specific UI**: Different forms/views per content type
- **Type-specific workflows**: Different publishing workflows
- **Organization**: Filter and search by content type

---

## Content Category Relationship

`c_content` can reference a `c_content_category` shard to organize content into categories (e.g., "Technology", "Marketing", "Product Updates").

### Relationship Structure

```json
{
  "structuredData": {
    "categoryId": "category-uuid",
    "category": "Technology"
  },
  "internal_relationships": [
    {
      "id": "rel-2",
      "targetShardId": "category-uuid",
      "targetShardTypeId": "c_content_category-type-uuid",
      "relationshipType": "has_category",
      "label": "Content Category",
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

### Benefits

- **Organization**: Group related content together
- **Navigation**: Category-based browsing
- **Filtering**: Filter content by category
- **Hierarchy**: Categories can have parent/child relationships

---

## External References

`c_content` can link to external systems via `external_relationships` for integration with CMS platforms, blog systems, and content management tools.

### External Relationship Structure

```json
{
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "wordpress",
      "systemType": "custom",
      "externalId": "wp-post-12345",
      "externalUrl": "https://blog.example.com/posts/my-article",
      "label": "WordPress Post",
      "syncStatus": "synced",
      "syncDirection": "bidirectional",
      "lastSyncedAt": "2025-01-15T10:00:00Z",
      "metadata": {
        "wpPostId": 12345,
        "wpAuthorId": 10,
        "wpStatus": "publish"
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-uuid"
    }
  ]
}
```

### Common External Systems

| System Type | Examples | Use Case |
|-------------|----------|----------|
| CMS | WordPress, Drupal, Contentful | Content synchronization |
| Blog Platforms | Medium, Ghost, Blogger | Cross-posting |
| Content Management | Notion, Confluence | Content import/export |
| Custom | Tenant-specific systems | Custom integrations |

### Sync Behavior

- **Bidirectional**: Changes sync both ways
- **Inbound**: External → Castiel only
- **Outbound**: Castiel → External only

---

## Tags

Tags are stored in `metadata.tags` per the base shard schema and provide flexible organization and filtering.

### Tag Structure

```json
{
  "metadata": {
    "tags": ["product-update", "q1-2025", "feature-announcement"]
  }
}
```

### Tag Usage

- **Organization**: Group content by topics, themes, or attributes
- **Search**: Filter content by tags
- **AI Context**: Tags help AI understand content context
- **Flexible**: No predefined tag list—users create tags as needed

---

## Relationships

### Internal Relationships (Typical)

| Relationship Type | Target | Description |
|------------------|--------|-------------|
| `has_content_type` | `c_content_type` | Content type definition |
| `has_category` | `c_content_category` | Content category |
| `belongs_to` | `c_project` | Content attached to project |
| `references` | `c_document` | Referenced documents |
| `references` | Any | Other referenced shards |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_project` | `has_content` | Project's content items |
| `c_content_category` | `contains` | Category's content items |

### External Relationships (Common)

| System Type | System | Description |
|-------------|--------|-------------|
| CMS | WordPress, Drupal, Contentful | Content management systems |
| Blog | Medium, Ghost | Blog platforms |
| Custom | Tenant-specific | Custom integrations |

---

## AI Context Role

### Content Source

`c_content` serves as a primary content source for AI context assembly:

- **Text Extraction**: Full content body is extracted for AI processing
- **Summarization**: AI generates summaries from content
- **Entity Extraction**: People, organizations, dates, topics extracted
- **Semantic Search**: Vector embeddings enable similarity search
- **Classification**: Content type and category classification

### AI Enrichment Configuration

```json
{
  "enrichment": {
    "enabled": true,
    "config": {
      "autoEnrich": true,
      "enrichmentTypes": ["summary", "keywords", "entities"]
    },
    "lastEnrichedAt": "2025-01-15T10:00:00Z",
    "enrichmentData": {
      "summary": {
        "text": "This article discusses the latest features in Castiel...",
        "keyPoints": ["Feature A", "Feature B"]
      },
      "keywords": ["castiel", "features", "update"],
      "entities": [
        { "type": "organization", "text": "Castiel", "confidence": 0.95 }
      ]
    }
  }
}
```

### AI Prompt Fragment

```
Content: {name}
Type: {contentType} | Category: {category} | Status: {status}
Author: {author.name} | Published: {publishedAt}
Reading Time: {readingTime} minutes

Summary: {enrichment.summary}

Tags: {metadata.tags.join(", ")}

Content:
{body}
```

### Vector Embeddings

Content body and summary are automatically embedded for semantic search:

```typescript
{
  "vectors": [
    {
      "id": "vec-1",
      "field": "body",
      "model": "text-embedding-ada-002",
      "dimensions": 1536,
      "embedding": [0.123, -0.456, ...],
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## Examples

### Example 1: Blog Post (Internal Access)

```json
{
  "id": "content-001-uuid",
  "shardTypeId": "c_content-type-uuid",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "revisionId": "rev-001-uuid",
  "revisionNumber": 1,
  "status": "active",
  "structuredData": {
    "name": "Introducing Castiel's New AI Features",
    "contentTypeId": "content-type-blog-uuid",
    "contentType": "blog-post",
    "categoryId": "category-tech-uuid",
    "category": "Technology",
    "summary": "We're excited to announce new AI-powered features that make content management smarter and more efficient.",
    "body": "# Introducing Castiel's New AI Features\n\nWe're thrilled to announce...",
    "bodyFormat": "markdown",
    "author": {
      "userId": "user-456",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "publishedAt": "2025-01-15T10:00:00Z",
    "status": "published",
    "slug": "introducing-castiel-ai-features",
    "seoTitle": "New AI Features in Castiel - 2025",
    "seoDescription": "Discover the latest AI-powered features in Castiel that revolutionize content management.",
    "readingTime": 5,
    "visibility": "internal"
  },
  "unstructuredData": {
    "text": "Introducing Castiel's New AI Features We're thrilled to announce..."
  },
  "metadata": {
    "tags": ["product-update", "ai", "features", "q1-2025"]
  },
  "internal_relationships": [
    {
      "id": "rel-1",
      "targetShardId": "content-type-blog-uuid",
      "targetShardTypeId": "c_content_type-type-uuid",
      "relationshipType": "has_content_type",
      "label": "Blog Post Type",
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-456"
    },
    {
      "id": "rel-2",
      "targetShardId": "category-tech-uuid",
      "targetShardTypeId": "c_content_category-type-uuid",
      "relationshipType": "has_category",
      "label": "Technology Category",
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-456"
    }
  ],
  "acl": [
    {
      "userId": "user-456",
      "permissions": ["read", "write", "delete", "admin"],
      "grantedBy": "user-456",
      "grantedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

### Example 2: Article (Restricted Access)

```json
{
  "id": "content-002-uuid",
  "shardTypeId": "c_content-type-uuid",
  "tenantId": "tenant-123",
  "userId": "user-789",
  "revisionId": "rev-002-uuid",
  "revisionNumber": 1,
  "status": "active",
  "structuredData": {
    "name": "Confidential Product Roadmap Q2 2025",
    "contentTypeId": "content-type-article-uuid",
    "contentType": "article",
    "summary": "Internal roadmap for Q2 2025 product development.",
    "body": "# Product Roadmap Q2 2025\n\n## Phase 1: Core Features...",
    "bodyFormat": "markdown",
    "author": {
      "userId": "user-789",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "publishedAt": "2025-01-20T14:00:00Z",
    "status": "published",
    "readingTime": 12,
    "visibility": "restricted"
  },
  "metadata": {
    "tags": ["roadmap", "confidential", "q2-2025"]
  },
  "acl": [
    {
      "userId": "user-789",
      "permissions": ["read", "write", "delete", "admin"],
      "grantedBy": "user-789",
      "grantedAt": "2025-01-20T14:00:00Z"
    },
    {
      "roleId": "product-managers",
      "permissions": ["read"],
      "grantedBy": "user-789",
      "grantedAt": "2025-01-20T14:00:00Z"
    },
    {
      "userId": "user-999",
      "permissions": ["read", "write"],
      "grantedBy": "user-789",
      "grantedAt": "2025-01-20T14:05:00Z"
    }
  ],
  "createdAt": "2025-01-20T14:00:00Z",
  "updatedAt": "2025-01-20T14:00:00Z"
}
```

### Example 3: Content with External Reference

```json
{
  "id": "content-003-uuid",
  "shardTypeId": "c_content-type-uuid",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "revisionId": "rev-003-uuid",
  "revisionNumber": 2,
  "status": "active",
  "structuredData": {
    "name": "How to Use Castiel API",
    "contentType": "documentation",
    "summary": "Complete guide to using the Castiel API",
    "body": "# Castiel API Guide\n\n## Authentication...",
    "bodyFormat": "markdown",
    "status": "published",
    "visibility": "internal"
  },
  "external_relationships": [
    {
      "id": "ext-1",
      "system": "notion",
      "systemType": "custom",
      "externalId": "notion-page-abc123",
      "externalUrl": "https://notion.so/page/abc123",
      "label": "Notion Source",
      "syncStatus": "synced",
      "syncDirection": "bidirectional",
      "lastSyncedAt": "2025-01-15T10:00:00Z",
      "metadata": {
        "notionPageId": "abc123",
        "notionWorkspaceId": "workspace-xyz"
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "createdBy": "user-456"
    }
  ],
  "createdAt": "2025-01-15T09:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

### Example 4: Content with Version History

```json
{
  "id": "content-004-uuid",
  "revisionId": "rev-004-uuid",
  "revisionNumber": 3,
  "structuredData": {
    "name": "Product Launch Announcement",
    "body": "# Product Launch\n\nWe're launching...",
    "status": "published"
  }
}
```

**Version History** (stored in `revisions` container):

- **Revision 1** (CREATED): Initial draft
- **Revision 2** (UPDATED): Added product details
- **Revision 3** (UPDATED): Final published version

Access via: `GET /api/v1/shards/content-004-uuid/revisions`

---

## Best Practices

### Content Organization

1. **Use Content Types**: Define content types for different content formats (blog, article, page, etc.)
2. **Use Categories**: Organize content into logical categories
3. **Use Tags**: Add relevant tags for flexible organization and search
4. **Consistent Naming**: Use descriptive, consistent titles

### Access Control

1. **Default to Internal**: Use `internal` visibility unless restricted access is needed
2. **Minimal Permissions**: Grant only necessary permissions in ACL
3. **Role-Based Access**: Use roles for groups of users when possible
4. **Document Access**: Document why content is restricted

### SEO Optimization

1. **SEO Fields**: Always fill `seoTitle` and `seoDescription` for published content
2. **Slug Generation**: Use URL-friendly slugs for better SEO
3. **Featured Images**: Include featured images for better presentation
4. **Reading Time**: Calculate and set reading time for user experience

### Version Management

1. **Meaningful Updates**: Update content when making significant changes
2. **Revision Descriptions**: Add change descriptions when creating revisions
3. **Review History**: Regularly review version history to understand content evolution
4. **Revert When Needed**: Use revert functionality to restore previous versions

### Content Quality

1. **Summaries**: Always provide a clear summary
2. **Format Consistency**: Stick to one body format (markdown recommended)
3. **Author Information**: Include complete author information
4. **Publication Dates**: Set accurate publication dates

### External Integration

1. **Sync Status**: Monitor `syncStatus` in external relationships
2. **Bidirectional Sync**: Use bidirectional sync for active integrations
3. **Error Handling**: Handle sync errors appropriately
4. **Metadata**: Store relevant external system metadata

---

## Related Documentation

- [Base Shard Schema](../base-schema.md) - Foundation schema for all shards
- [Shard Relationships](../relationships.md) - Relationship patterns
- [Revision System](../../../apps/api/src/types/revision.types.ts) - Versioning implementation
- [c_content_type](./c_content_type,md) - Content type definitions
- [c_content_category](./c_content_category.md) - Content category organization
- [c_document](./c_document.md) - Document/file storage
- [c_generatedContent](./c_generatedContent.md) - AI-generated content

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team
