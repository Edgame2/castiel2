# Email Templates Database Implementation

## Overview

This document describes the database implementation for the email management system, including the `EmailTemplates` container configuration, document schema, indexing policies, and query patterns.

---

## Table of Contents

1. [Container Configuration](#container-configuration)
2. [Document Schema](#document-schema)
3. [Indexing Policy](#indexing-policy)
4. [Query Patterns](#query-patterns)
5. [Container Initialization](#container-initialization)

---

## Container Configuration

### Container Details

- **Container Name**: `EmailTemplates`
- **Partition Key**: `/tenantId`
- **Unique Keys**: `[['/tenantId', '/name', '/language']]`
- **TTL**: Not set (templates persist indefinitely)
- **Throughput**: 400 RU/s (default, can be adjusted)

### Partition Key Strategy

The partition key `/tenantId` enables:

- Efficient tenant-scoped queries
- System-level templates using `tenantId: "system"`
- Horizontal scaling per tenant
- Isolation of tenant data

### Unique Key Constraint

The unique key `['/tenantId', '/name', '/language']` ensures:

- Each template name is unique per tenant per language
- Prevents duplicate templates for the same language
- Enables efficient lookups by name and language

---

## Document Schema

### EmailTemplateDocument

```typescript
interface EmailTemplateDocument {
  // Identity
  id: string;                    // UUID
  tenantId: string;               // Partition key ("system" for system templates)
  name: string;                   // Unique template name (e.g., "welcome-email")
  language: string;                // ISO 639-1 language code (e.g., "en", "fr", "de")
  
  // Display
  displayName: string;            // User-friendly name
  category: string;               // e.g., "notifications", "invitations", "alerts"
  description?: string;           // Template description
  
  // Email content
  subject: string;                // Subject line with placeholders
  htmlBody: string;               // HTML version with placeholders
  textBody: string;               // Plain text version with placeholders
  
  // Email metadata
  fromEmail?: string;             // Optional override (defaults to provider config)
  fromName?: string;              // Optional override
  replyTo?: string;               // Optional reply-to address
  
  // Placeholder definitions
  placeholders: PlaceholderDefinition[];  // Available placeholders with descriptions
  
  // Integration
  emailProviderId?: string;       // Optional: specific email provider integration ID
  // If not specified, uses default tenant email provider from integration system
  
  // Language metadata
  baseTemplateName?: string;      // Name of base template (for language variants)
  isBaseTemplate: boolean;        // True if this is the base (default) template
  fallbackLanguage?: string;      // Fallback language if translation missing (default: "en")
  
  // Metadata
  createdBy: {
    type: 'super_admin';
    userId: string;
    name: string;
  };
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
  updatedBy?: {
    userId: string;
    name: string;
  };
  
  // Status
  isActive: boolean;              // Can be disabled without deletion
}
```

### PlaceholderDefinition

```typescript
interface PlaceholderDefinition {
  name: string;                   // e.g., "userName", "tenantName"
  description: string;            // What this placeholder represents
  example: string;                // Example value
  required: boolean;              // Whether placeholder must be provided
}
```

### Example Document

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "system",
  "name": "welcome-email",
  "language": "en",
  "displayName": "Welcome Email",
  "category": "notifications",
  "description": "Welcome email sent to new users",
  "subject": "Welcome to {{tenantName}}!",
  "htmlBody": "<h1>Welcome {{userName}}!</h1><p>You've been invited to join {{tenantName}}.</p><p><a href=\"{{loginUrl}}\">Click here to login</a></p>",
  "textBody": "Welcome {{userName}}!\n\nYou've been invited to join {{tenantName}}.\n\nLogin at: {{loginUrl}}",
  "fromEmail": "noreply@castiel.io",
  "fromName": "Castiel",
  "placeholders": [
    {
      "name": "userName",
      "description": "User's full name",
      "example": "John Doe",
      "required": true
    },
    {
      "name": "tenantName",
      "description": "Tenant organization name",
      "example": "Acme Corp",
      "required": true
    },
    {
      "name": "loginUrl",
      "description": "Login URL for the user",
      "example": "https://app.castiel.io/login",
      "required": true
    }
  ],
  "isBaseTemplate": true,
  "fallbackLanguage": "en",
  "createdBy": {
    "type": "super_admin",
    "userId": "admin-123",
    "name": "Admin User"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "isActive": true
}
```

---

## Indexing Policy

### Indexing Configuration

```typescript
{
  indexingMode: 'consistent',
  automatic: true,
  includedPaths: [
    { path: '/tenantId/?' },
    { path: '/name/?' },
    { path: '/language/?' },
    { path: '/category/?' },
    { path: '/isActive/?' },
    { path: '/createdAt/?' },
    { path: '/updatedAt/?' },
    { path: '/createdBy/type/?' }
  ],
  excludedPaths: [
    { path: '/htmlBody/?' },
    { path: '/textBody/?' },
    { path: '/description/?' },
    { path: '/placeholders/*' }
  ],
  compositeIndexes: [
    // Query: List templates by tenant and category
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/category', order: 'ascending' },
      { path: '/createdAt', order: 'descending' }
    ],
    // Query: List templates by tenant and language
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/language', order: 'ascending' },
      { path: '/name', order: 'ascending' }
    ],
    // Query: List templates by tenant and status
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/isActive', order: 'ascending' },
      { path: '/updatedAt', order: 'descending' }
    ],
    // Query: Search templates by name
    [
      { path: '/tenantId', order: 'ascending' },
      { path: '/name', order: 'ascending' },
      { path: '/language', order: 'ascending' }
    ]
  ]
}
```

### Indexing Strategy

- **Included Paths**: Fields frequently used in WHERE clauses and ORDER BY
- **Excluded Paths**: Large text fields (htmlBody, textBody) to reduce index size
- **Composite Indexes**: Optimize common query patterns

---

## Query Patterns

### 1. List Templates by Tenant

Get all templates for a tenant, ordered by creation date.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
  ORDER BY c.createdAt DESC
`;

const parameters = [
  { name: '@tenantId', value: tenantId }
];
```

### 2. List Templates by Category

Get templates filtered by category.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.category = @category
    AND c.isActive = true
  ORDER BY c.createdAt DESC
`;

const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@category', value: 'notifications' }
];
```

### 3. List Templates by Language

Get all language variants for a tenant.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.language = @language
    AND c.isActive = true
  ORDER BY c.name ASC
`;

const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@language', value: 'en' }
];
```

### 4. Get Template by Name and Language

Get a specific template by name and language.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.name = @name
    AND c.language = @language
`;

const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@name', value: 'welcome-email' },
  { name: '@language', value: 'en' }
];
```

### 5. Get All Language Variants of a Template

Get all language versions of a template.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.name = @name
  ORDER BY c.language ASC
`;

const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@name', value: 'welcome-email' }
];
```

### 6. Get Template with Language Fallback

Get template in requested language, fallback to English if not found.

```typescript
// First try requested language
let query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.name = @name
    AND c.language = @language
`;

let result = await container.items.query(query, { parameters }).fetchAll();

// If not found, fallback to English
if (result.resources.length === 0 && language !== 'en') {
  query = `
    SELECT * FROM c
    WHERE c.tenantId = @tenantId
      AND c.name = @name
      AND c.language = 'en'
  `;
  result = await container.items.query(query, { parameters }).fetchAll();
}
```

### 7. Search Templates

Search templates by name or display name.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND (
      CONTAINS(LOWER(c.name), LOWER(@searchTerm))
      OR CONTAINS(LOWER(c.displayName), LOWER(@searchTerm))
    )
    AND c.isActive = true
  ORDER BY c.name ASC
`;

const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@searchTerm', value: 'welcome' }
];
```

### 8. Get Active Templates by Category and Language

Get active templates filtered by category and language.

```typescript
const query = `
  SELECT * FROM c
  WHERE c.tenantId = @tenantId
    AND c.category = @category
    AND c.language = @language
    AND c.isActive = true
  ORDER BY c.displayName ASC
`;

const parameters = [
  { name: '@tenantId', value: tenantId },
  { name: '@category', value: 'notifications' },
  { name: '@language', value: 'en' }
];
```

---

## Container Initialization

### Initialization Script

The container is initialized using a script similar to other container initialization scripts:

**File**: `apps/api/src/scripts/init-email-templates-container.ts`

```typescript
import { CosmosClient, Database, ContainerDefinition } from '@azure/cosmos';

const EMAIL_TEMPLATES_CONTAINER = {
  id: 'EmailTemplates',
  partitionKey: '/tenantId',
  uniqueKeys: [['/tenantId', '/name', '/language']],
  indexingPolicy: {
    // ... as defined above
  }
};

async function createEmailTemplatesContainer(database: Database) {
  const containerDef: ContainerDefinition = {
    id: EMAIL_TEMPLATES_CONTAINER.id,
    partitionKey: {
      paths: [EMAIL_TEMPLATES_CONTAINER.partitionKey],
      version: 2
    },
    uniqueKeyPolicy: {
      uniqueKeys: EMAIL_TEMPLATES_CONTAINER.uniqueKeys.map(keys => ({
        paths: keys
      }))
    },
    indexingPolicy: EMAIL_TEMPLATES_CONTAINER.indexingPolicy
  };

  const { container, statusCode } = await database.containers.createIfNotExists(containerDef);
  return { created: statusCode === 201, container };
}
```

### Running Initialization

```bash
# Standalone execution
npx tsx apps/api/src/scripts/init-email-templates-container.ts

# Or as part of main database initialization
npx tsx apps/api/src/scripts/init-cosmos-db.ts
```

---

## Best Practices

### 1. Partition Key Usage

- Always include `tenantId` in queries to ensure efficient partition targeting
- Use "system" as tenantId for system-wide templates
- Avoid cross-partition queries when possible

### 2. Query Optimization

- Use composite indexes for common query patterns
- Filter by `isActive` to exclude disabled templates
- Use specific language filters rather than fetching all languages

### 3. Language Management

- Always create English (`en`) version first as fallback
- Use consistent naming: `template-name-language` pattern
- Track language completion status in application layer

### 4. Template Size

- Keep HTML body reasonable size (< 100KB recommended)
- Consider external assets for large images
- Use text body for email clients that don't support HTML

---

## Related Documentation

- [Container Architecture](../ai-insights/CONTAINER-ARCHITECTURE.md) - General container patterns
- [Multi-Language Support](./MULTI-LANGUAGE.md) - Language management details
- [Service Implementation](./SERVICE-IMPLEMENTATION.md) - Repository usage patterns







