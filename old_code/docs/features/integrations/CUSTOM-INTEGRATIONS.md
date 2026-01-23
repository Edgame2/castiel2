# Custom Integrations

## Overview

Custom Integrations allow users to create their own integration connectors without code changes. Users can define REST API, Webhook, or GraphQL endpoints with custom authentication, request/response mapping, and sync schedules.

---

## Table of Contents

1. [Use Cases](#use-cases)
2. [Custom Integration Definition](#custom-integration-definition)
3. [Authentication Methods](#authentication-methods)
4. [Request Configuration](#request-configuration)
5. [Response Mapping](#response-mapping)
6. [Webhooks (Incoming)](#webhooks-incoming)
7. [Testing & Validation](#testing--validation)
8. [ShardType Definition](#shardtype-definition)
9. [API Endpoints](#api-endpoints)
10. [UI Components](#ui-components)

---

## Use Cases

1. **Connect to internal APIs** - Company-specific REST APIs
2. **Third-party services** - Services without built-in adapters
3. **Legacy systems** - Older systems with HTTP interfaces
4. **IoT devices** - Devices exposing REST APIs
5. **Webhooks** - Receive data pushed from external services
6. **Custom data sources** - Proprietary databases with API access

---

## Custom Integration Definition

### Core Configuration

```typescript
interface CustomIntegrationDefinition {
  // Identity
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Type
  integrationType: 'rest_api' | 'webhook' | 'graphql';
  
  // Base Configuration
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number; // ms, default 30000
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    retryOn: number[]; // HTTP status codes
  };
  
  // Authentication
  auth: CustomAuthConfig;
  
  // Endpoints
  endpoints: CustomEndpoint[];
  
  // Webhook (for incoming data)
  webhookConfig?: WebhookReceiverConfig;
  
  // Metadata
  status: 'active' | 'inactive' | 'error';
  lastTestedAt?: Date;
  lastTestResult?: 'success' | 'failure';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

---

## Authentication Methods

### Supported Auth Types

```typescript
type CustomAuthConfig = 
  | NoAuth
  | ApiKeyAuth
  | BearerTokenAuth
  | BasicAuth
  | OAuth2Auth
  | CustomHeaderAuth;

interface NoAuth {
  type: 'none';
}

interface ApiKeyAuth {
  type: 'api_key';
  keyName: string;           // e.g., 'X-API-Key', 'api_key'
  keyLocation: 'header' | 'query' | 'body';
  keyValue: string;          // Encrypted
}

interface BearerTokenAuth {
  type: 'bearer';
  token: string;             // Encrypted
}

interface BasicAuth {
  type: 'basic';
  username: string;
  password: string;          // Encrypted
}

interface OAuth2Auth {
  type: 'oauth2';
  grantType: 'client_credentials' | 'authorization_code' | 'refresh_token';
  tokenUrl: string;
  clientId: string;
  clientSecret: string;      // Encrypted
  scope?: string;
  
  // For authorization_code flow
  authorizationUrl?: string;
  redirectUri?: string;
  
  // Token storage
  accessToken?: string;      // Encrypted
  refreshToken?: string;     // Encrypted
  expiresAt?: Date;
}

interface CustomHeaderAuth {
  type: 'custom_headers';
  headers: Record<string, string>;  // Values encrypted
}
```

### Example Configurations

```typescript
// API Key in Header
{
  type: 'api_key',
  keyName: 'X-API-Key',
  keyLocation: 'header',
  keyValue: '{{encrypted:abc123}}'
}

// OAuth2 Client Credentials
{
  type: 'oauth2',
  grantType: 'client_credentials',
  tokenUrl: 'https://api.example.com/oauth/token',
  clientId: 'my-client-id',
  clientSecret: '{{encrypted:secret}}',
  scope: 'read write'
}
```

---

## Request Configuration

### Endpoint Definition

```typescript
interface CustomEndpoint {
  id: string;
  name: string;              // e.g., 'getContacts', 'createLead'
  description?: string;
  
  // HTTP Configuration
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;              // Supports templates: /users/{id}
  
  // Request
  queryParams?: ParamConfig[];
  pathParams?: ParamConfig[];
  headers?: Record<string, string>;
  body?: RequestBodyConfig;
  
  // Response
  responseMapping: ResponseMappingConfig;
  
  // Pagination (for list endpoints)
  pagination?: PaginationConfig;
  
  // Rate limiting
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit?: number;
  };
  
  // Tags for organization
  tags?: string[];
}

interface ParamConfig {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array';
  default?: any;
  description?: string;
  
  // Dynamic value support
  valueSource?: 'static' | 'variable' | 'expression';
  value?: any;
}

interface RequestBodyConfig {
  contentType: 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  
  // Body can be a template or schema
  bodyType: 'template' | 'schema' | 'raw';
  
  // For template: JSON with {{variable}} placeholders
  template?: string;
  
  // For schema: Define structure
  schema?: {
    type: 'object' | 'array';
    properties?: Record<string, PropertySchema>;
    items?: PropertySchema;
  };
  
  // For raw: Static content
  raw?: string;
}

interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  source?: 'static' | 'variable' | 'expression';
  value?: any;
  properties?: Record<string, PropertySchema>;
  items?: PropertySchema;
}
```

### Path Parameters Example

```typescript
// Endpoint: GET /users/{userId}/orders/{orderId}
{
  method: 'GET',
  path: '/users/{userId}/orders/{orderId}',
  pathParams: [
    { name: 'userId', required: true, type: 'string' },
    { name: 'orderId', required: true, type: 'string' }
  ]
}
```

### Request Body Template Example

```typescript
// POST /leads with JSON body
{
  method: 'POST',
  path: '/leads',
  body: {
    contentType: 'application/json',
    bodyType: 'template',
    template: JSON.stringify({
      name: '{{contact.name}}',
      email: '{{contact.email}}',
      company: '{{company.name}}',
      source: 'castiel',
      customFields: {
        projectId: '{{project.id}}'
      }
    })
  }
}
```

---

## Response Mapping

### Response Mapping Configuration

```typescript
interface ResponseMappingConfig {
  // Where is the data in the response?
  dataPath: string;          // JSONPath: '$.data.items', '$.results', '$'
  
  // How to map response fields to Shard fields
  fieldMappings: FieldMapping[];
  
  // Target ShardType for creating shards
  targetShardTypeId?: string;
  
  // Unique identifier field for deduplication
  identifierField: string;   // Field in response that uniquely identifies record
  
  // Error handling
  errorPath?: string;        // JSONPath to error message: '$.error.message'
  
  // Metadata extraction
  metadataMapping?: {
    totalCount?: string;     // JSONPath to total count
    pageInfo?: string;       // JSONPath to pagination info
  };
}

interface FieldMapping {
  // Source (from API response)
  source: string;            // JSONPath in response: '$.firstName'
  
  // Target (Shard field)
  target: string;            // Field name in Shard: 'name'
  
  // Transformation
  transform?: TransformConfig;
  
  // Default value if source is null/missing
  default?: any;
  
  // Skip if empty
  skipIfEmpty?: boolean;
}

interface TransformConfig {
  type: 
    | 'direct'           // No transformation
    | 'concat'           // Concatenate multiple fields
    | 'split'            // Split string into array
    | 'map'              // Map value using lookup
    | 'date'             // Parse/format date
    | 'number'           // Parse number
    | 'boolean'          // Parse boolean
    | 'template'         // String template
    | 'expression'       // JavaScript expression
    | 'lookup';          // Lookup from another shard
  
  // Config varies by type
  config?: Record<string, any>;
}
```

### Mapping Examples

```typescript
// Simple field mapping
{
  fieldMappings: [
    { source: '$.first_name', target: 'firstName', transform: { type: 'direct' } },
    { source: '$.last_name', target: 'lastName', transform: { type: 'direct' } },
    { source: '$.email', target: 'email', transform: { type: 'direct' } },
    
    // Concatenate fields
    {
      source: '$.first_name',
      target: 'fullName',
      transform: {
        type: 'concat',
        config: {
          fields: ['$.first_name', '$.last_name'],
          separator: ' '
        }
      }
    },
    
    // Date transformation
    {
      source: '$.created_at',
      target: 'createdAt',
      transform: {
        type: 'date',
        config: {
          inputFormat: 'YYYY-MM-DD',
          outputFormat: 'ISO8601'
        }
      }
    },
    
    // Value mapping
    {
      source: '$.status',
      target: 'status',
      transform: {
        type: 'map',
        config: {
          mapping: {
            'ACTIVE': 'active',
            'INACTIVE': 'archived',
            'DELETED': 'deleted'
          },
          default: 'unknown'
        }
      }
    },
    
    // Template
    {
      source: '$',
      target: 'description',
      transform: {
        type: 'template',
        config: {
          template: 'Contact from {{$.source}} - {{$.company_name}}'
        }
      }
    }
  ]
}
```

---

## Pagination

### Pagination Configuration

```typescript
interface PaginationConfig {
  type: 'offset' | 'cursor' | 'page' | 'link';
  
  // For offset pagination
  offsetParam?: string;      // Query param name, e.g., 'offset'
  limitParam?: string;       // Query param name, e.g., 'limit'
  maxLimit?: number;
  
  // For cursor pagination
  cursorParam?: string;      // Query param name, e.g., 'cursor', 'after'
  cursorPath?: string;       // JSONPath to next cursor in response
  
  // For page pagination
  pageParam?: string;        // Query param name, e.g., 'page'
  pageSizeParam?: string;    // Query param name, e.g., 'per_page'
  
  // For link pagination (follows Link header)
  nextLinkPath?: string;     // JSONPath or 'header:Link'
  
  // How to detect end of data
  endCondition: {
    type: 'empty_array' | 'count_less_than_limit' | 'cursor_null' | 'has_more_field';
    field?: string;          // For has_more_field: JSONPath to boolean
  };
}
```

---

## Webhooks (Incoming)

### Webhook Receiver Configuration

```typescript
interface WebhookReceiverConfig {
  // Webhook endpoint (generated by system)
  webhookUrl?: string;       // Auto-generated: /webhooks/custom/{integrationId}/{secret}
  webhookSecret: string;     // For signature verification
  
  // Signature verification
  signatureConfig?: {
    header: string;          // e.g., 'X-Webhook-Signature'
    algorithm: 'hmac-sha256' | 'hmac-sha1' | 'none';
    signaturePrefix?: string; // e.g., 'sha256='
  };
  
  // Event routing
  eventRouting: WebhookEventRouting[];
  
  // Response
  responseStatus: number;    // What to return, default 200
  responseBody?: string;     // Optional response body
}

interface WebhookEventRouting {
  // How to identify event type
  eventTypePath: string;     // JSONPath: '$.event', '$.type'
  eventTypeValue: string;    // Expected value: 'contact.created'
  
  // What to do with this event
  action: 'create_shard' | 'update_shard' | 'delete_shard' | 'trigger_sync' | 'custom';
  
  // Mapping for create/update
  targetShardTypeId?: string;
  dataPath?: string;         // JSONPath to data: '$.data'
  fieldMappings?: FieldMapping[];
  
  // Identifier for update/delete
  identifierPath?: string;   // JSONPath to unique ID: '$.data.id'
}
```

### Webhook Example

```typescript
{
  webhookSecret: 'wh_secret_abc123',
  signatureConfig: {
    header: 'X-Signature',
    algorithm: 'hmac-sha256',
    signaturePrefix: 'sha256='
  },
  eventRouting: [
    {
      eventTypePath: '$.event_type',
      eventTypeValue: 'contact.created',
      action: 'create_shard',
      targetShardTypeId: 'c_contact',
      dataPath: '$.data',
      fieldMappings: [
        { source: '$.id', target: 'externalId' },
        { source: '$.name', target: 'name' },
        { source: '$.email', target: 'email' }
      ]
    },
    {
      eventTypePath: '$.event_type',
      eventTypeValue: 'contact.updated',
      action: 'update_shard',
      targetShardTypeId: 'c_contact',
      identifierPath: '$.data.id',
      dataPath: '$.data',
      fieldMappings: [
        { source: '$.name', target: 'name' },
        { source: '$.email', target: 'email' }
      ]
    }
  ],
  responseStatus: 200,
  responseBody: '{"status": "received"}'
}
```

---

## Testing & Validation

### Test Configuration

```typescript
interface EndpointTestConfig {
  // Test data for path/query params
  testParams?: Record<string, any>;
  
  // Test body data
  testBody?: Record<string, any>;
  
  // Expected response
  expectations?: {
    statusCode?: number;
    bodyContains?: string[];
    jsonPath?: { path: string; value: any }[];
  };
}
```

### Test Execution

```typescript
interface TestResult {
  success: boolean;
  
  // Request details
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  
  // Response details
  response?: {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
    latencyMs: number;
  };
  
  // Mapping preview
  mappingPreview?: {
    rawData: any;
    mappedData: any;
    errors: string[];
  };
  
  // Errors
  error?: string;
}
```

---

## Container Storage

> **Note**: Custom integrations are stored in the `custom-integrations` container (partition key: `/tenantId`), not as shard types. See [Container Architecture](./CONTAINER-ARCHITECTURE.md) for details.

### `custom-integrations` Container Document

```typescript
interface CustomIntegrationDocument {
  id: string;
  tenantId: string; // Partition key
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // Type and configuration
  type: 'rest' | 'webhook' | 'graphql';
  // ... rest of configuration fields
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

const customIntegrationFields: RichFieldDefinition[] = [
  // Basic Info Group
  {
    name: 'displayName',
    label: 'Display Name',
    type: 'TEXT',
    required: true,
    group: 'basic',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'TEXTAREA',
    group: 'basic',
  },
  {
    name: 'integrationType',
    label: 'Integration Type',
    type: 'SELECT',
    required: true,
    options: [
      { value: 'rest_api', label: 'REST API' },
      { value: 'webhook', label: 'Webhook (Incoming)' },
      { value: 'graphql', label: 'GraphQL' },
    ],
    group: 'basic',
  },
  {
    name: 'baseUrl',
    label: 'Base URL',
    type: 'URL',
    required: true,
    placeholder: 'https://api.example.com/v1',
    group: 'connection',
  },
  
  // Authentication Group
  {
    name: 'authType',
    label: 'Authentication Type',
    type: 'SELECT',
    required: true,
    options: [
      { value: 'none', label: 'No Authentication' },
      { value: 'api_key', label: 'API Key' },
      { value: 'bearer', label: 'Bearer Token' },
      { value: 'basic', label: 'Basic Auth' },
      { value: 'oauth2', label: 'OAuth 2.0' },
      { value: 'custom_headers', label: 'Custom Headers' },
    ],
    group: 'auth',
  },
  {
    name: 'authConfig',
    label: 'Authentication Configuration',
    type: 'JSON',
    group: 'auth',
  },
  
  // Endpoints Group
  {
    name: 'endpoints',
    label: 'API Endpoints',
    type: 'JSON',
    group: 'endpoints',
  },
  
  // Webhook Group
  {
    name: 'webhookConfig',
    label: 'Webhook Configuration',
    type: 'JSON',
    group: 'webhook',
  },
  
  // Advanced Group
  {
    name: 'defaultHeaders',
    label: 'Default Headers',
    type: 'JSON',
    group: 'advanced',
  },
  {
    name: 'timeout',
    label: 'Request Timeout (ms)',
    type: 'NUMBER',
    default: 30000,
    min: 1000,
    max: 120000,
    group: 'advanced',
  },
  {
    name: 'retryConfig',
    label: 'Retry Configuration',
    type: 'JSON',
    group: 'advanced',
  },
  
  // Status Group
  {
    name: 'status',
    label: 'Status',
    type: 'SELECT',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'error', label: 'Error' },
    ],
    default: 'inactive',
    group: 'status',
  },
  {
    name: 'lastTestedAt',
    label: 'Last Tested',
    type: 'DATETIME',
    readonly: true,
    group: 'status',
  },
  {
    name: 'lastTestResult',
    label: 'Last Test Result',
    type: 'SELECT',
    options: [
      { value: 'success', label: 'Success' },
      { value: 'failure', label: 'Failure' },
    ],
    readonly: true,
    group: 'status',
  },
];
```

---

## API Endpoints

### Custom Integration Management

```
POST   /api/v1/custom-integrations              Create custom integration
GET    /api/v1/custom-integrations              List custom integrations
GET    /api/v1/custom-integrations/:id          Get custom integration
PATCH  /api/v1/custom-integrations/:id          Update custom integration
DELETE /api/v1/custom-integrations/:id          Delete custom integration

POST   /api/v1/custom-integrations/:id/test     Test integration connection
POST   /api/v1/custom-integrations/:id/test/:endpointId  Test specific endpoint

GET    /api/v1/custom-integrations/:id/webhook-url  Get webhook URL
POST   /api/v1/custom-integrations/:id/regenerate-secret  Regenerate webhook secret

POST   /api/v1/custom-integrations/:id/sync     Execute sync for an endpoint
```

### Webhook Receiver

```
POST   /api/v1/webhooks/custom/:integrationId/:secret  Receive webhook
```

---

## UI Components

### Integration Builder

1. **Basic Info Form**
   - Name, description, type selection
   - Icon and color picker

2. **Connection Config**
   - Base URL input with validation
   - Authentication type selector
   - Credentials form (contextual based on auth type)

3. **Endpoint Builder**
   - Visual endpoint list
   - Method/path configuration
   - Query/path parameter builder
   - Request body editor (JSON with template highlighting)
   - Response mapping builder

4. **Mapping Builder**
   - JSONPath field selector (with autocomplete from sample response)
   - Target field selector (from ShardType schema)
   - Transform configuration
   - Live preview of mapping

5. **Webhook Config**
   - Generated webhook URL display
   - Secret management
   - Event routing configuration
   - Signature verification setup

6. **Testing Panel**
   - Test button for each endpoint
   - Request/response preview
   - Mapping preview
   - Error highlighting

### Builder Workflow

```
1. Create Integration
   ↓
2. Configure Connection (Base URL + Auth)
   ↓
3. Test Connection (simple GET request)
   ↓
4. Add Endpoints
   ↓
5. Configure Response Mapping
   ↓
6. Test Endpoint + Preview Mapping
   ↓
7. Create Sync Task (optional)
   ↓
8. Activate Integration
```

---

## Security Considerations

1. **Credential Encryption** - All secrets encrypted with AES-256-GCM
2. **URL Validation** - Prevent SSRF attacks, block internal IPs
3. **Rate Limiting** - Limit test requests and sync frequency
4. **Webhook Validation** - Signature verification required
5. **Audit Logging** - All operations logged
6. **Tenant Isolation** - Integrations scoped to tenant




