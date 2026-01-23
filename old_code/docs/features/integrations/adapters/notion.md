# Notion Adapter

## Overview

The Notion adapter enables bidirectional sync between Castiel and Notion workspaces. It supports OAuth 2.0 authentication, database querying, page management, and block operations.

---

## Configuration

### Provider Details

| Property | Value |
|----------|-------|
| Provider ID | `notion` |
| Auth Type | OAuth 2.0 |
| API Version | `2022-06-28` |
| Base URL | `https://api.notion.com/v1` |

### OAuth Configuration

```typescript
const notionOAuth = {
  authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  scopes: [], // Notion uses capability-based access, not scopes
  clientIdEnvVar: 'NOTION_CLIENT_ID',
  clientSecretEnvVar: 'NOTION_CLIENT_SECRET',
  pkce: false,
  additionalParams: {
    owner: 'user' // or 'workspace' for workspace-level access
  }
};
```

### Credential Management (Azure Key Vault)

This integration follows the tenant-based credential architecture. All credentials are stored securely in Azure Key Vault.

#### Credential Types

| Credential | Storage Location | Purpose |
|-----------|-----------------|---------|
| OAuth Client ID | Key Vault (system secret) | System-level Notion OAuth app |
| OAuth Client Secret | Key Vault (system secret) | System-level Notion OAuth app |
| Access Token | Key Vault (`tenant-{tenantId}-notion-oauth`) | Per-tenant Notion workspace access |
| Refresh Token | Key Vault (`tenant-{tenantId}-notion-oauth`) | Per-tenant token refresh |
| Workspace ID | Key Vault (`tenant-{tenantId}-notion-oauth`) | Notion workspace identifier |

#### How It Works

1. **System OAuth App**: A single Notion OAuth application is created and shared across all tenants. The client_id and client_secret are stored as system secrets in Key Vault.

2. **Per-Tenant Authorization**: When a tenant connects their Notion workspace:
   - User is redirected to Notion OAuth flow
   - After authorization, Notion returns access_token and workspace_id
   - The `IntegrationConnectionService` encrypts and stores these in Key Vault
   - Key pattern: `tenant-{tenantId}-notion-oauth`

3. **Token Usage**: When making API calls:
   - `IntegrationConnectionService.getAccessToken()` retrieves the encrypted token from Key Vault
   - Tokens are cached in Redis for performance
   - If a token is invalid, it's automatically refreshed (Notion tokens don't expire unless revoked)

4. **Token Revocation**: When a tenant disconnects:
   - Token is removed from Key Vault
   - Cache is invalidated

#### Configuration

The following environment variables reference Key Vault secrets:

```bash
# These point to Key Vault secret names, not raw values
NOTION_CLIENT_ID=kv://castiel-keyvault/notion-oauth-client-id
NOTION_CLIENT_SECRET=kv://castiel-keyvault/notion-oauth-client-secret
```

> **Security Note**: Never store OAuth credentials in plain text or source control. All credentials must be managed through Azure Key Vault.

---

## Entity Mappings

### Notion → Castiel Mappings

| Notion Entity | Castiel ShardType | Description |
|---------------|-------------------|-------------|
| Database | `c_document` | Structured data collections |
| Page | `c_note` | Rich text documents and wiki pages |
| Page (in Database) | `c_*` (dynamic) | Records mapped to matching ShardType |
| Block | `c_note` (embedded) | Content blocks within pages |

### Detailed Entity Mappings

#### Database → c_document

| Notion Field | Castiel Field | Transform |
|--------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `title` | `name` | Extract plain text |
| `description` | `description` | Extract plain text |
| `url` | `structuredData.sourceUrl` | Direct |
| `icon` | `structuredData.icon` | Object (emoji/url) |
| `cover` | `structuredData.coverImage` | Extract URL |
| `properties` | `structuredData.schema` | Property definitions |
| `created_time` | `createdAt` | ISO 8601 → Date |
| `last_edited_time` | `updatedAt` | ISO 8601 → Date |
| `created_by.id` | `structuredData.createdBy` | User ID |
| `archived` | `structuredData.archived` | Boolean |

#### Page → c_note

| Notion Field | Castiel Field | Transform |
|--------------|---------------|-----------|
| `id` | `externalId` | Direct |
| `properties.title` | `name` | Extract plain text |
| `url` | `structuredData.sourceUrl` | Direct |
| `icon` | `structuredData.icon` | Object (emoji/url) |
| `cover` | `structuredData.coverImage` | Extract URL |
| `parent.database_id` | `structuredData.parentDatabase` | Database ID |
| `parent.page_id` | `structuredData.parentPage` | Page ID |
| `properties.*` | `structuredData.properties` | Extracted values |
| `created_time` | `createdAt` | ISO 8601 → Date |
| `last_edited_time` | `updatedAt` | ISO 8601 → Date |
| `archived` | `structuredData.archived` | Boolean |

#### Database Page → Dynamic ShardType

When syncing pages from a Notion database, the adapter can map to any Castiel ShardType based on configuration:

```typescript
// Example: Notion CRM Database → c_contact
const entityMapping = {
  notionDatabase: 'abc123-database-id',
  targetShardType: 'c_contact',
  fieldMappings: [
    { notionProperty: 'Name', shardField: 'name', transform: 'title_to_string' },
    { notionProperty: 'Email', shardField: 'structuredData.email', transform: 'email' },
    { notionProperty: 'Company', shardField: 'structuredData.company', transform: 'relation_first' },
    { notionProperty: 'Phone', shardField: 'structuredData.phone', transform: 'phone' },
    { notionProperty: 'Tags', shardField: 'tags', transform: 'multi_select_to_array' },
    { notionProperty: 'Last Contact', shardField: 'structuredData.lastContactDate', transform: 'date' },
  ]
};
```

---

## Property Type Mappings

### Notion → Castiel Type Conversion

| Notion Property Type | Castiel Field Type | Notes |
|---------------------|-------------------|-------|
| `title` | `string` | Primary name field |
| `rich_text` | `string` | Concatenated plain text |
| `number` | `number` | Direct |
| `checkbox` | `boolean` | Direct |
| `select` | `string` | Option name |
| `multi_select` | `string[]` | Array of option names |
| `date` | `datetime` | ISO 8601 start date |
| `email` | `string` | Direct |
| `url` | `string` | Direct |
| `phone_number` | `string` | Direct |
| `formula` | `string\|number\|boolean` | Evaluated result |
| `relation` | `string[]` | Array of page IDs |
| `rollup` | `any` | Depends on rollup type |
| `people` | `string[]` | Array of user IDs |
| `files` | `string[]` | Array of file URLs |
| `created_time` | `datetime` | ISO 8601 |
| `created_by` | `string` | User ID |
| `last_edited_time` | `datetime` | ISO 8601 |
| `last_edited_by` | `string` | User ID |
| `status` | `string` | Status name |

---

## API Operations

### Fetch Databases

```typescript
// List all accessible databases
const result = await adapter.fetch({
  entity: 'database',
  limit: 100,
  filters: { cursor: 'next_cursor_value' }
});

// Returns normalized database records
{
  records: [
    {
      id: 'abc123',
      object: 'database',
      title: 'My Database',
      description: 'A sample database',
      url: 'https://notion.so/...',
      properties: ['Name', 'Status', 'Date'],
      propertySchema: { ... },
      created_time: '2024-01-01T00:00:00Z',
      last_edited_time: '2024-01-15T12:30:00Z'
    }
  ],
  hasMore: true,
  cursor: 'next_cursor_value'
}
```

### Fetch Pages from Database

```typescript
// Query a specific database
const result = await adapter.fetch({
  entity: 'abc123-database-id', // Database ID as entity
  limit: 100,
  filters: {
    Status: 'Active',
    cursor: 'next_cursor_value'
  },
  modifiedSince: new Date('2024-01-01'),
  orderBy: 'Last Edited',
  orderDirection: 'desc'
});
```

### Search All Pages

```typescript
const result = await adapter.fetch({
  entity: 'page',
  limit: 50,
  filters: {
    query: 'search term'
  }
});
```

### Fetch Blocks (Page Content)

```typescript
const result = await adapter.fetch({
  entity: 'block',
  filters: {
    parentId: 'page_or_block_id'
  },
  limit: 100
});
```

### Create Page

```typescript
// Create page in a database
const result = await adapter.push({
  parentId: 'database_id',
  parentType: 'database',
  properties: {
    Name: 'New Record',
    Status: { select: { name: 'Active' } },
    Email: 'user@example.com',
    Tags: ['tag1', 'tag2']
  },
  icon: '📝',
  cover: 'https://example.com/cover.jpg'
}, { entity: 'page', operation: 'create' });

// Create standalone page
const result = await adapter.push({
  parentId: 'parent_page_id',
  parentType: 'page',
  title: 'New Page Title',
  children: [
    { type: 'heading_1', content: 'Introduction' },
    { type: 'paragraph', content: 'This is the first paragraph.' },
    { type: 'bulleted_list_item', content: 'List item 1' },
    { type: 'bulleted_list_item', content: 'List item 2' }
  ]
}, { entity: 'page', operation: 'create' });
```

### Update Page

```typescript
const result = await adapter.push({
  id: 'page_id',
  properties: {
    Status: { select: { name: 'Completed' } }
  },
  icon: '✅'
}, { entity: 'page', operation: 'update' });
```

### Archive (Delete) Page

```typescript
const result = await adapter.push({
  id: 'page_id'
}, { entity: 'page', operation: 'delete' });
```

### Append Blocks

```typescript
const result = await adapter.push({
  parentId: 'page_id',
  type: 'paragraph',
  content: 'New paragraph content'
}, { entity: 'block', operation: 'create' });
```

### Create Database

```typescript
const result = await adapter.push({
  parentId: 'page_id',
  title: 'New Database',
  icon: '📊',
  properties: {
    Name: { title: {} },
    Status: { 
      select: { 
        options: [
          { name: 'Not Started', color: 'gray' },
          { name: 'In Progress', color: 'blue' },
          { name: 'Done', color: 'green' }
        ]
      }
    },
    Email: { email: {} },
    Due Date: { date: {} }
  }
}, { entity: 'database', operation: 'create' });
```

---

## Block Types Reference

### Supported Block Types

| Block Type | Description | Example |
|------------|-------------|---------|
| `paragraph` | Text paragraph | Basic text content |
| `heading_1` | H1 heading | Main section title |
| `heading_2` | H2 heading | Subsection title |
| `heading_3` | H3 heading | Minor heading |
| `bulleted_list_item` | Bullet point | • List item |
| `numbered_list_item` | Numbered item | 1. List item |
| `to_do` | Checkbox item | ☐/☑ Task |
| `toggle` | Collapsible | ▶ Hidden content |
| `code` | Code block | ```code``` |
| `quote` | Blockquote | > Quoted text |
| `callout` | Callout box | 💡 Important note |
| `divider` | Horizontal line | --- |
| `table` | Table | Rows and columns |
| `bookmark` | URL bookmark | Link preview |
| `image` | Image | External/uploaded |
| `video` | Video embed | YouTube/Vimeo |
| `file` | File attachment | PDF, doc, etc. |
| `embed` | Embed | iframe content |

### Block Creation Examples

```typescript
// Paragraph with formatting
{
  type: 'paragraph',
  content: [
    { text: { content: 'Normal text ' } },
    { text: { content: 'bold text' }, annotations: { bold: true } },
    { text: { content: ' and ' } },
    { text: { content: 'italic' }, annotations: { italic: true } }
  ]
}

// Code block
{
  type: 'code',
  content: 'console.log("Hello World");',
  language: 'javascript'
}

// To-do item
{
  type: 'to_do',
  content: 'Complete this task',
  checked: false
}

// Callout
{
  type: 'callout',
  content: 'Important information here',
  icon: { type: 'emoji', emoji: '💡' }
}

// Toggle with children
{
  type: 'toggle',
  content: 'Click to expand',
  children: [
    { type: 'paragraph', content: 'Hidden content revealed!' }
  ]
}
```

---

## Sync Strategies

### Pull Strategy (Notion → Castiel)

1. **Initial Sync**: Fetch all databases and pages accessible to the integration
2. **Incremental Sync**: Use `last_edited_time` filter for delta updates
3. **Deep Sync**: For each page, optionally fetch blocks for full content

```typescript
// Incremental sync example
const lastSync = await getLastSyncTime(tenantId, 'notion');

const result = await adapter.fetch({
  entity: 'page',
  modifiedSince: lastSync,
  limit: 100
});

for (const page of result.records) {
  await upsertShard({
    tenantId,
    shardTypeId: 'c_note',
    externalId: page.id,
    name: page.title,
    structuredData: page.properties,
    // ... other fields
  });
}
```

### Push Strategy (Castiel → Notion)

1. **Create**: New shards create new Notion pages
2. **Update**: Modified shards update existing pages via `externalId`
3. **Delete**: Archived shards archive Notion pages

```typescript
// Write-back example
const shard = await getShard(shardId);

if (shard.externalId) {
  // Update existing
  await adapter.push({
    id: shard.externalId,
    properties: mapShardToNotionProperties(shard)
  }, { entity: 'page', operation: 'update' });
} else {
  // Create new
  const result = await adapter.push({
    parentId: notionDatabaseId,
    parentType: 'database',
    properties: mapShardToNotionProperties(shard)
  }, { entity: 'page', operation: 'create' });
  
  // Store external ID for future updates
  await updateShardExternalId(shardId, result.externalId);
}
```

---

## Error Handling

### Notion Error Codes

| Error Code | Description | Handling |
|------------|-------------|----------|
| `unauthorized` | Invalid or expired token | Re-authenticate |
| `restricted_resource` | No access to resource | Check permissions |
| `object_not_found` | Page/database not found | Skip or remove |
| `validation_error` | Invalid request data | Fix payload |
| `rate_limited` | Too many requests | Exponential backoff |
| `conflict_error` | Concurrent edit conflict | Retry with fresh data |
| `internal_server_error` | Notion server error | Retry later |

### Rate Limiting

Notion API has the following limits:

- **Rate limit**: ~3 requests per second average
- **Burst limit**: Higher for short bursts
- **Page size**: Maximum 100 items per request

```typescript
// Built-in retry logic
protected async makeNotionRequest<T>(endpoint: string, options?: RequestInit): Promise<{ data?: T; error?: string; status: number }> {
  // Includes automatic retry with backoff for rate limits
}
```

---

## Webhook Support

> **Note**: Notion does not natively support webhooks. For real-time sync, use:

1. **Polling**: Regular scheduled syncs (recommended interval: 5-15 minutes)
2. **Third-party services**: Use Pipedream, Make, or Zapier for webhook-like triggers
3. **Notion API Changes API**: (Beta) Use the changes endpoint when available

```typescript
// Polling-based sync task
{
  integrationId: 'notion',
  syncType: 'pull',
  schedule: '*/15 * * * *', // Every 15 minutes
  entityMappings: [
    { entity: 'database_id', targetShardType: 'c_contact' }
  ]
}
```

---

## Testing

### Sandbox Testing

Use a test Notion workspace:

1. Create a new Notion workspace or use a personal one
2. Create a Notion integration at https://www.notion.so/my-integrations
3. Store the OAuth credentials in Azure Key Vault (dev environment)
4. Share specific pages/databases with the integration

### Key Vault Setup for Testing

```bash
# Store system OAuth credentials in Key Vault
az keyvault secret set --vault-name "castiel-keyvault-dev" \
  --name "notion-oauth-client-id" \
  --value "your_client_id"

az keyvault secret set --vault-name "castiel-keyvault-dev" \
  --name "notion-oauth-client-secret" \
  --value "your_client_secret"
```

### Test Data

```typescript
const testDatabase = {
  title: 'Castiel Test Database',
  properties: {
    Name: { title: {} },
    Email: { email: {} },
    Status: { 
      select: { 
        options: [
          { name: 'Active', color: 'green' },
          { name: 'Inactive', color: 'red' }
        ]
      }
    }
  }
};

const testPage = {
  parentId: '<test_database_id>',
  parentType: 'database',
  properties: {
    Name: 'Test Contact',
    Email: 'test@example.com',
    Status: { select: { name: 'Active' } }
  }
};
```

### Connection Test

```typescript
const result = await adapter.testConnection();
// Returns:
{
  success: true,
  details: {
    botId: 'bot_user_id',
    botName: 'Castiel Integration',
    type: 'bot',
    hasWorkspaceAccess: true
  }
}
```

---

## Best Practices

### 1. Request Specific Pages/Databases
Only request access to the specific pages and databases needed, not the entire workspace.

### 2. Use Incremental Sync
Always use `last_edited_time` for incremental syncs to minimize API calls.

### 3. Batch Operations
When creating multiple pages, batch the operations but respect rate limits.

### 4. Handle Rich Text
Notion's rich text can be complex. Use the helper functions to extract plain text when needed.

### 5. Store Property Schema
Cache the database schema to avoid repeated `/databases/{id}` calls.

---

**Last Updated**: November 2025  
**Version**: 1.0.0
