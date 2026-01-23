# Integration API Implementation

## Overview

This document describes all API endpoints required for the integration system, including request/response schemas, authentication, authorization, and error handling.

---

## Table of Contents

1. [Integration Provider Endpoints (Super Admin)](#integration-provider-endpoints-super-admin)
2. [Tenant Integration Endpoints](#tenant-integration-endpoints)
3. [Connection Management Endpoints](#connection-management-endpoints)
4. [User-Scoped Connection Endpoints](#user-scoped-connection-endpoints)
5. [Search Endpoints](#search-endpoints)
6. [Widget Data Endpoints](#widget-data-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)

---

## Integration Provider Endpoints (Super Admin)

### Create Integration Provider

**Endpoint**: `POST /api/admin/integrations`

**Authentication**: Super Admin only

**Request Body**:
```typescript
{
  name: string;
  displayName: string;
  description?: string;
  category: 'crm' | 'communication' | 'data_source' | 'storage' | 'custom';
  provider: string; // Unique identifier
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
  audience: 'system' | 'tenant';
  capabilities: string[];
  supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
  supportsRealtime: boolean;
  supportsWebhooks: boolean;
  supportsNotifications: boolean;
  supportsSearch: boolean;
  searchableEntities?: string[];
  searchCapabilities?: {
    fullText: boolean;
    fieldSpecific: boolean;
    filtered: boolean;
  };
  requiresUserScoping: boolean;
  authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
  oauthConfig?: OAuthConfig;
  availableEntities: IntegrationEntity[];
  entityMappings?: EntityToShardTypeMapping[];
  icon: string;
  color: string;
  version: string;
  isPremium?: boolean;
  requiredPlan?: string;
}
```

**Response**: `201 Created`
```typescript
{
  id: string;
  category: string;
  provider: string;
  // ... all provider fields
  createdAt: Date;
  updatedAt: Date;
}
```

### List Integration Providers

**Endpoint**: `GET /api/admin/integrations`

**Authentication**: Super Admin only

**Query Parameters**:
- `category?: string` - Filter by category
- `status?: string` - Filter by status
- `audience?: 'system' | 'tenant'` - Filter by audience
- `limit?: number` - Max results (default: 50, max: 100)
- `offset?: number` - Pagination offset (default: 0)

**Response**: `200 OK`
```typescript
{
  providers: IntegrationProviderDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### Get Integration Provider

**Endpoint**: `GET /api/admin/integrations/:category/:id`

**Authentication**: Super Admin only

**Response**: `200 OK`
```typescript
IntegrationProviderDocument
```

### Update Integration Provider

**Endpoint**: `PATCH /api/admin/integrations/:category/:id`

**Authentication**: Super Admin only

**Request Body**: Partial `IntegrationProviderDocument`

**Response**: `200 OK`
```typescript
IntegrationProviderDocument
```

### Delete Integration Provider

**Endpoint**: `DELETE /api/admin/integrations/:category/:id`

**Authentication**: Super Admin only

**Response**: `204 No Content`

### Update Provider Status

**Endpoint**: `PATCH /api/admin/integrations/:category/:id/status`

**Authentication**: Super Admin only

**Request Body**:
```typescript
{
  status: 'active' | 'beta' | 'deprecated' | 'disabled';
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  status: IntegrationStatus;
  updatedAt: Date;
}
```

### Update Provider Audience

**Endpoint**: `PATCH /api/admin/integrations/:category/:id/audience`

**Authentication**: Super Admin only

**Request Body**:
```typescript
{
  audience: 'system' | 'tenant';
}
```

**Response**: `200 OK`
```typescript
{
  id: string;
  audience: 'system' | 'tenant';
  updatedAt: Date;
}
```

### Test System-Level Connection

**Endpoint**: `POST /api/admin/integrations/:category/:id/test`

**Authentication**: Super Admin only

**Response**: `200 OK`
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  testedAt: Date;
  responseTime?: number;
}
```

---

## Tenant Integration Endpoints

### List Available Integrations (Catalog)

**Endpoint**: `GET /api/integrations`

**Authentication**: Tenant Admin or User

**Query Parameters**:
- `category?: string` - Filter by category
- `search?: string` - Search providers
- `limit?: number` - Max results (default: 50)
- `offset?: number` - Pagination offset (default: 0)

**Response**: `200 OK`
```typescript
{
  providers: IntegrationProviderDocument[]; // Only providers with audience: 'tenant' and status: 'active'
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### Get Integration Details

**Endpoint**: `GET /api/integrations/:category/:id`

**Authentication**: Tenant Admin or User

**Response**: `200 OK`
```typescript
IntegrationProviderDocument
```

### List Tenant Integration Instances

**Endpoint**: `GET /api/tenant/integrations`

**Authentication**: Tenant Admin

**Query Parameters**:
- `status?: 'pending' | 'connected' | 'error' | 'disabled'` - Filter by status
- `providerName?: string` - Filter by provider
- `search?: string` - Search instances
- `limit?: number` - Max results (default: 50)
- `offset?: number` - Pagination offset (default: 0)

**Response**: `200 OK`
```typescript
{
  integrations: IntegrationDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### Create/Enable Integration Instance

**Endpoint**: `POST /api/tenant/integrations`

**Authentication**: Tenant Admin

**Request Body**:
```typescript
{
  integrationId: string; // Reference to integration_providers.id
  name: string; // User-defined name
  description?: string;
  icon?: string;
  settings?: Record<string, any>;
  allowedShardTypes?: string[]; // Data access control
  searchEnabled?: boolean;
  searchableEntities?: string[];
  userScoped?: boolean;
}
```

**Response**: `201 Created`
```typescript
IntegrationDocument
```

### Get Integration Instance

**Endpoint**: `GET /api/tenant/integrations/:id`

**Authentication**: Tenant Admin

**Response**: `200 OK`
```typescript
IntegrationDocument
```

### Update Integration Instance Configuration

**Endpoint**: `PATCH /api/tenant/integrations/:id`

**Authentication**: Tenant Admin

**Request Body**: Partial `IntegrationDocument`

**Response**: `200 OK`
```typescript
IntegrationDocument
```

### Disable Integration Instance

**Endpoint**: `DELETE /api/tenant/integrations/:id`

**Authentication**: Tenant Admin

**Response**: `204 No Content`

### Activate Integration

**Endpoint**: `POST /api/tenant/integrations/:id/activate`

**Authentication**: Tenant Admin

**Response**: `200 OK`
```typescript
{
  id: string;
  status: 'connected';
  enabledAt: Date;
  enabledBy: string;
}
```

### Deactivate Integration

**Endpoint**: `POST /api/tenant/integrations/:id/deactivate`

**Authentication**: Tenant Admin

**Response**: `200 OK`
```typescript
{
  id: string;
  status: 'disabled';
  updatedAt: Date;
}
```

---

## Connection Management Endpoints

### Start OAuth Flow

**Endpoint**: `POST /api/tenant/integrations/:id/connect/oauth`

**Authentication**: Tenant Admin

**Request Body**:
```typescript
{
  returnUrl: string; // URL to redirect after OAuth
}
```

**Response**: `200 OK`
```typescript
{
  authorizationUrl: string;
  state: string;
}
```

### OAuth Callback Handler

**Endpoint**: `GET /api/integrations/oauth/callback`

**Authentication**: Public (OAuth callback)

**Query Parameters**:
- `code: string` - Authorization code
- `state: string` - OAuth state
- `error?: string` - Error from OAuth provider

**Response**: `302 Redirect` to `returnUrl`

### Connect with API Key

**Endpoint**: `POST /api/tenant/integrations/:id/connect/api-key`

**Authentication**: Tenant Admin

**Request Body**:
```typescript
{
  apiKey: string;
  displayName?: string;
}
```

**Response**: `200 OK`
```typescript
{
  connectionId: string;
  status: 'active';
  connectedAt: Date;
}
```

### Connect with Basic Auth

**Endpoint**: `POST /api/tenant/integrations/:id/connect/basic`

**Authentication**: Tenant Admin

**Request Body**:
```typescript
{
  username: string;
  password: string;
  displayName?: string;
}
```

**Response**: `200 OK`
```typescript
{
  connectionId: string;
  status: 'active';
  connectedAt: Date;
}
```

### Connect with Custom Credentials

**Endpoint**: `POST /api/tenant/integrations/:id/connect/custom`

**Authentication**: Tenant Admin

**Request Body**:
```typescript
{
  credentials: Record<string, any>; // Provider-specific credentials
  displayName?: string;
}
```

**Response**: `200 OK`
```typescript
{
  connectionId: string;
  status: 'active';
  connectedAt: Date;
}
```

### Get Connection Status

**Endpoint**: `GET /api/tenant/integrations/:id/connection`

**Authentication**: Tenant Admin

**Response**: `200 OK`
```typescript
{
  connectionId: string;
  status: 'active' | 'expired' | 'revoked' | 'error';
  lastValidatedAt?: Date;
  validationError?: string;
  expiresAt?: Date;
}
```

### Test Connection

**Endpoint**: `POST /api/tenant/integrations/:id/connection/test`

**Authentication**: Tenant Admin

**Response**: `200 OK`
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
  testedAt: Date;
  responseTime?: number;
  details?: Record<string, any>;
}
```

### Disconnect Integration

**Endpoint**: `POST /api/tenant/integrations/:id/disconnect`

**Authentication**: Tenant Admin

**Response**: `200 OK`
```typescript
{
  success: boolean;
  disconnectedAt: Date;
}
```

### Update Credentials

**Endpoint**: `PATCH /api/tenant/integrations/:id/credentials`

**Authentication**: Tenant Admin

**Request Body**:
```typescript
{
  credentialType: 'oauth' | 'api_key' | 'basic' | 'custom';
  credentials: Record<string, any>; // New credentials
}
```

**Response**: `200 OK`
```typescript
{
  success: boolean;
  credentialSecretName: string; // Updated secret name
  updatedAt: Date;
}
```

---

## User-Scoped Connection Endpoints

### Start User OAuth Flow

**Endpoint**: `POST /api/user/integrations/:id/connect/oauth`

**Authentication**: User

**Request Body**:
```typescript
{
  returnUrl: string;
}
```

**Response**: `200 OK`
```typescript
{
  authorizationUrl: string;
  state: string;
}
```

### Get User Connection Status

**Endpoint**: `GET /api/user/integrations/:id/connection`

**Authentication**: User

**Response**: `200 OK`
```typescript
{
  connected: boolean;
  connectionId?: string;
  status?: 'active' | 'expired' | 'revoked' | 'error';
  lastConnectedAt?: Date;
}
```

### Disconnect User Integration

**Endpoint**: `POST /api/user/integrations/:id/disconnect`

**Authentication**: User

**Response**: `200 OK`
```typescript
{
  success: boolean;
  disconnectedAt: Date;
}
```

---

## Search Endpoints

### Global Search Across Integrations

**Endpoint**: `POST /api/integrations/search`

**Authentication**: User or Tenant Admin

**Request Body**:
```typescript
{
  query: string; // Search query
  integrations?: string[]; // Optional: filter by integration IDs
  entities?: string[]; // Optional: filter by entity types
  filters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  limit?: number; // Max results per integration (default: 10)
  offset?: number; // Pagination offset
  userId?: string; // User ID for user-scoped integrations
}
```

**Response**: `200 OK`
```typescript
{
  results: SearchResultItem[];
  total: number;
  took: number; // Milliseconds
  hasMore: boolean;
  byIntegration: Record<string, SearchResultItem[]>; // Grouped by integration
  byEntity: Record<string, SearchResultItem[]>; // Grouped by entity type
}
```

### Search Specific Integration

**Endpoint**: `GET /api/integrations/:id/search`

**Authentication**: User or Tenant Admin

**Query Parameters**:
- `query: string` - Search query
- `entities?: string[]` - Filter by entity types
- `limit?: number` - Max results (default: 10)
- `offset?: number` - Pagination offset
- `userId?: string` - User ID for user-scoped integrations

**Response**: `200 OK`
```typescript
{
  results: SearchResultItem[];
  total: number;
  took: number;
  hasMore: boolean;
}
```

---

## Widget Data Endpoints

### Get Integration Status for Widget

**Endpoint**: `GET /api/tenant/integrations/:id/widgets/status`

**Authentication**: Tenant Admin or User

**Response**: `200 OK`
```typescript
{
  integrationId: string;
  name: string;
  status: 'pending' | 'connected' | 'error' | 'disabled';
  connectionStatus?: 'active' | 'expired' | 'revoked' | 'error';
  lastConnectedAt?: Date;
  lastSyncAt?: Date;
  error?: string;
}
```

### Get Integration Activity for Widget

**Endpoint**: `GET /api/tenant/integrations/:id/widgets/activity`

**Authentication**: Tenant Admin or User

**Query Parameters**:
- `timeRange?: '1h' | '24h' | '7d' | '30d'` - Time range (default: '24h')
- `limit?: number` - Max items (default: 10)

**Response**: `200 OK`
```typescript
{
  activities: {
    id: string;
    type: 'sync' | 'test' | 'connect' | 'disconnect';
    status: 'success' | 'failed' | 'running';
    timestamp: Date;
    details?: Record<string, any>;
  }[];
  total: number;
}
```

### Get Integration Data for Widget

**Endpoint**: `GET /api/tenant/integrations/:id/widgets/data`

**Authentication**: Tenant Admin or User

**Query Parameters**:
- `entity: string` - Entity to fetch (e.g., "Account", "Contact")
- `fields?: string[]` - Fields to include
- `filters?: string` - JSON string of filters
- `limit?: number` - Max items (default: 10)
- `userId?: string` - User ID for user-scoped integrations

**Response**: `200 OK`
```typescript
{
  data: Record<string, any>[];
  total: number;
  entity: string;
  fetchedAt: Date;
}
```

---

## Authentication & Authorization

### Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Authorization

**Super Admin Endpoints** (`/api/admin/integrations/*`):
- Require `super_admin` role
- Can access all providers and tenant integrations

**Tenant Admin Endpoints** (`/api/tenant/integrations/*`):
- Require `tenant_admin` role
- Can only access their tenant's integrations
- Tenant ID extracted from JWT token

**User Endpoints** (`/api/user/integrations/*`, `/api/integrations/search`):
- Require authenticated user
- Can access user-scoped integrations
- User ID extracted from JWT token

### Permission Checks

```typescript
// Super admin check
if (!user.roles.includes('super_admin')) {
  throw new ForbiddenError('Super admin access required');
}

// Tenant admin check
if (user.tenantId !== integration.tenantId) {
  throw new ForbiddenError('Access denied to this integration');
}

// User scoping check
if (integration.userScoped && userId !== user.id) {
  throw new ForbiddenError('User-scoped integration access denied');
}
```

---

## Error Handling

### Error Response Format

```typescript
{
  error: {
    code: string; // Error code (e.g., "INTEGRATION_NOT_FOUND")
    message: string; // Human-readable error message
    details?: Record<string, any>; // Additional error details
    requestId: string; // Request ID for correlation
  }
}
```

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request successful |
| `201 Created` | Resource created successfully |
| `204 No Content` | Request successful, no content to return |
| `400 Bad Request` | Invalid request data |
| `401 Unauthorized` | Authentication required |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource conflict (e.g., duplicate name) |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Server error |

### Error Codes

| Error Code | Description |
|------------|-------------|
| `INTEGRATION_NOT_FOUND` | Integration not found |
| `PROVIDER_NOT_FOUND` | Provider not found |
| `INVALID_CREDENTIALS` | Invalid credentials provided |
| `CONNECTION_FAILED` | Connection to external system failed |
| `PERMISSION_DENIED` | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `VALIDATION_ERROR` | Request validation failed |

---

## Rate Limiting

### Rate Limits

| Endpoint Type | Rate Limit |
|---------------|------------|
| Provider endpoints | 100 requests/minute |
| Integration endpoints | 200 requests/minute |
| Connection endpoints | 50 requests/minute |
| Search endpoints | 30 requests/minute |
| Widget endpoints | 100 requests/minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Response

When rate limit is exceeded:

**Status**: `429 Too Many Requests`

**Response**:
```typescript
{
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded. Please try again later.",
    retryAfter: 60 // Seconds until retry
  }
}
```

---

## Pagination

### Pagination Parameters

- `limit`: Number of results per page (default: 50, max: 100)
- `offset`: Number of results to skip (default: 0)

### Pagination Response

```typescript
{
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset?: number; // Next offset if hasMore is true
}
```

---

## Filtering and Sorting

### Filtering

Query parameters for filtering:

- `status?: string` - Filter by status
- `category?: string` - Filter by category
- `providerName?: string` - Filter by provider
- `search?: string` - Search query

### Sorting

Query parameters for sorting:

- `sortBy?: string` - Field to sort by (e.g., "name", "createdAt")
- `sortOrder?: 'asc' | 'desc'` - Sort order (default: "asc")

---

## Audit Logging

All endpoints that modify data create audit log entries. See [Audit Documentation](./AUDIT.md) for details.

---

## Related Documentation

- [Container Architecture](./CONTAINER-ARCHITECTURE.md) - Integration container structure
- [UI Implementation](./UI-IMPLEMENTATION.md) - UI pages and components
- [Configuration](./CONFIGURATION.md) - Integration configuration

---

**Last Updated**: January 2025  
**Version**: 1.0.0







