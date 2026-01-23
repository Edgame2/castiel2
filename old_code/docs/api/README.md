# Castiel API Documentation

Welcome to the Castiel API documentation! This guide provides everything you need to integrate with our enterprise B2B SaaS platform.

## 📚 Documentation Resources

### 1. **Interactive API Documentation**

- **Swagger/OpenAPI UI**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
  - Interactive REST API documentation
  - Try out API endpoints directly in the browser
  - View request/response schemas
  - Download OpenAPI specification

- **GraphQL Playground**: [http://localhost:3001/graphql](http://localhost:3001/graphql)
  - Interactive GraphQL schema explorer
  - Auto-completion and documentation
  - Run queries and mutations
  - View GraphQL schema

### 2. **Comprehensive Guides**

- **[Authentication & Integration Guide](./AUTHENTICATION.md)**
  - Authentication flows (Email/Password, OAuth, SSO, MFA)
  - OAuth 2.0 integration for third-party apps
  - Code examples (Node.js, Python, cURL)
  - Postman collection

- **[Caching Strategy Documentation](./CACHING.md)**
  - Cache strategy overview
  - Cache key naming conventions
  - TTL configuration
  - Cache invalidation flows
  - Troubleshooting runbook
  - Performance tuning tips

- **[Architecture Overview](../ARCHITECTURE.md)**
  - System architecture
  - Technology stack
  - Data flow diagrams

---

## 🚀 Quick Start

### 1. Authentication

Obtain an access token:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "rt_abc123...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "tenantId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

### 2. Make API Requests

Use the access token to authenticate API requests:

```bash
curl -X GET http://localhost:3001/api/shards \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..."
```

### 3. Explore with Swagger

Visit [http://localhost:3001/api/docs](http://localhost:3001/api/docs) to:
- View all available endpoints
- Test requests interactively
- See request/response schemas
- Generate code snippets

---

## 📖 API Overview

### Base URLs

| Environment | API Base URL |
|-------------|--------------|
| **Development** | http://localhost:3001 |
| **Staging** | https://api-staging.castiel.com |
| **Production** | https://api.castiel.com |

### Authentication

All API endpoints (except `/api/auth/*`) require a Bearer token:

```
Authorization: Bearer <access_token>
```

**Token Lifecycle:**
- Access tokens expire after **15 minutes** (configurable)
- Use refresh tokens to obtain new access tokens
- Refresh tokens expire after **7 days**

### Rate Limiting

| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| **Free** | 60 | 100 |
| **Pro** | 600 | 1000 |
| **Enterprise** | Unlimited | Unlimited |

---

## 🔑 Core Resources

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout and revoke tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/verify-email` | Verify email address |

### OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/oauth/google` | Initiate Google OAuth |
| GET | `/api/auth/oauth/github` | Initiate GitHub OAuth |
| GET | `/api/auth/oauth/microsoft` | Initiate Microsoft OAuth |
| GET | `/api/auth/oauth/callback` | OAuth callback handler |

### MFA Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/mfa/enable` | Enable MFA (returns QR code) |
| POST | `/api/auth/mfa/verify` | Verify MFA setup |
| POST | `/api/auth/mfa/challenge` | Submit MFA challenge |
| POST | `/api/auth/mfa/disable` | Disable MFA |
| GET | `/api/auth/mfa/recovery-codes` | Get recovery codes |

### Magic Link Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/magic-link/request` | Request magic link |
| GET | `/api/auth/magic-link/verify` | Verify magic link |

### Shards

**Shards** are the primary data units in Castiel. They contain:
- **Structured data**: JSON validated against a schema
- **Unstructured data**: Free-form text content
- **Vectors**: 1536-dimension embeddings for similarity search
- **ACL**: Per-shard access control

**Key Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shards` | List shards (paginated) |
| POST | `/api/shards` | Create shard |
| GET | `/api/shards/:id` | Get shard by ID |
| PATCH | `/api/shards/:id` | Update shard |
| DELETE | `/api/shards/:id` | Soft delete shard |
| POST | `/api/shards/:id/restore` | Restore deleted shard |

**Example - Create a Shard:**
```bash
curl -X POST http://localhost:3001/api/shards \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shardTypeId": "550e8400-e29b-41d4-a716-446655440000",
    "structuredData": {
      "title": "My Document",
      "content": "Document content here",
      "tags": ["important", "draft"]
    },
    "unstructuredData": "This is the full text content..."
  }'
```

### Shard Types

**Shard Types** define the schema and behavior for shards:
- JSON Schema for structured data validation
- Vectorization configuration
- UI hints and field definitions

**Key Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shard-types` | List shard types |
| POST | `/api/shard-types` | Create shard type |
| GET | `/api/shard-types/:id` | Get shard type |
| PATCH | `/api/shard-types/:id` | Update shard type |

### Bulk Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shards/bulk/create` | Create multiple shards |
| PATCH | `/api/shards/bulk/update` | Update multiple shards |
| DELETE | `/api/shards/bulk/delete` | Delete multiple shards |
| POST | `/api/shards/bulk/restore` | Restore multiple shards |

**Limits:** Maximum 100 items per batch operation.

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Create webhook |
| GET | `/api/webhooks/:id` | Get webhook |
| PATCH | `/api/webhooks/:id` | Update webhook |
| DELETE | `/api/webhooks/:id` | Delete webhook |
| POST | `/api/webhooks/:id/test` | Test webhook delivery |

### Import/Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/import` | Start import job |
| GET | `/api/import/:jobId` | Get import status |
| POST | `/api/export` | Start export job |
| GET | `/api/export/:jobId` | Get export status |
| GET | `/api/export/:jobId/download` | Download export file |

**Supported Formats:** CSV, JSON, NDJSON

### Vector Search

Perform **semantic similarity search** using embeddings:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vector-search` | Similarity search |
| POST | `/api/vector-search/hybrid` | Hybrid search (vector + filters) |

**Example:**
```bash
curl -X POST http://localhost:3001/api/vector-search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "machine learning algorithms",
    "limit": 10,
    "minScore": 0.7
  }'
```

### Access Control (ACL)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/acl/shard/:shardId` | Get ACL for shard |
| POST | `/api/acl/shard/:shardId/grant` | Grant permission |
| DELETE | `/api/acl/shard/:shardId/revoke` | Revoke permission |
| GET | `/api/acl/check/:shardId` | Check permission |

**Permissions:**
- `read` - View shard data
- `write` - Update shard data
- `delete` - Delete shard
- `share` - Manage ACL for shard

### Users & Tenants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List tenant users |
| GET | `/api/users/:id` | Get user details |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/tenants/current` | Get current tenant |
| PATCH | `/api/tenants/current` | Update tenant settings |

---

## 🎨 GraphQL API

Access the **GraphQL endpoint** at `/graphql`.

### Example Query

```graphql
query GetShards($limit: Int, $offset: Int) {
  shards(limit: $limit, offset: $offset) {
    items {
      id
      structuredData
      metadata {
        createdAt
        createdBy
      }
      acl {
        userId
        permissions
      }
    }
    total
    hasMore
  }
}
```

### Example Mutation

```graphql
mutation CreateShard($input: CreateShardInput!) {
  createShard(input: $input) {
    id
    structuredData
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "shardTypeId": "550e8400-e29b-41d4-a716-446655440000",
    "structuredData": {
      "title": "My Document"
    }
  }
}
```

---

## 🔒 Security

### Multi-Tenant Isolation

- All data is **tenant-scoped**
- Automatic filtering by `tenantId` from JWT
- No cross-tenant data access

### Permission Model

1. **User Permissions**: Defined in JWT claims
2. **Shard ACL**: Per-resource access control
3. **Role-Based Access**: Custom roles per tenant

### Best Practices

✅ **Always use HTTPS** in production
✅ **Store tokens securely** (httpOnly cookies for web)
✅ **Refresh tokens before expiry** to avoid disruption
✅ **Never expose refresh tokens** in client-side code
✅ **Implement token refresh logic** with retry
✅ **Use short-lived access tokens** (15 minutes default)

---

## 📊 Monitoring & Errors

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| **200** | Success |
| **201** | Created |
| **204** | No Content (successful delete) |
| **400** | Bad Request (validation error) |
| **401** | Unauthorized (missing/invalid token) |
| **403** | Forbidden (insufficient permissions) |
| **404** | Not Found |
| **409** | Conflict (duplicate resource) |
| **429** | Too Many Requests (rate limited) |
| **500** | Internal Server Error |
| **503** | Service Unavailable |

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "details": {
    "field": "email",
    "issue": "Invalid email format"
  }
}
```

### Health Check

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 123456,
  "timestamp": "2025-11-30T10:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

**1. 401 Unauthorized**
- Check token expiration
- Verify token format: `Bearer <token>`
- Refresh access token if expired

**2. 403 Forbidden**
- Check user permissions in JWT
- Verify shard ACL for resource access
- Ensure user belongs to correct tenant

**3. 429 Rate Limited**
- Implement exponential backoff
- Upgrade to higher tier
- Cache responses when possible

**4. Slow Responses**
- Check cache hit rate (see [CACHING.md](./CACHING.md))
- Use pagination for large datasets
- Consider GraphQL for selective field retrieval

---

## 💬 Support

### Get Help

- **Documentation**: https://docs.castiel.com
- **Community Forum**: https://community.castiel.com
- **Email Support**: support@castiel.com
- **GitHub Issues**: https://github.com/castiel/api/issues

### Service Status

Check real-time service status: https://status.castiel.com

---

---

## 📊 Current Implementation Status

### API Routes Inventory

**Total Routes:** 119 TypeScript route files registered in `apps/api/src/routes/index.ts`

#### Route Categories

1. **Authentication & Authorization** (✅ Complete)
   - `/api/v1/auth/*` - Authentication routes
   - `/api/v1/mfa/*` - Multi-factor authentication
   - `/api/v1/magic-link/*` - Passwordless authentication
   - `/api/v1/sso/*` - Single sign-on
   - `/api/v1/sso-config/*` - SSO configuration
   - `/api/v1/azure-ad-b2c/*` - Azure AD B2C integration
   - `/api/v1/oauth/*` - OAuth 1.0
   - `/api/v1/oauth2/*` - OAuth 2.0

2. **User Management** (✅ Complete)
   - `/api/v1/users/*` - User management
   - `/api/v1/user-security/*` - User security settings
   - `/api/v1/session-management/*` - Session management
   - `/api/v1/role-management/*` - Role management
   - `/api/v1/external-user-ids/*` - External user ID mapping

3. **Tenant Management** (✅ Complete)
   - `/api/v1/tenants/*` - Tenant management
   - `/api/v1/tenant-membership/*` - Tenant membership

4. **Shards & Data** (✅ Complete)
   - `/api/v1/shards/*` - Shard CRUD operations
   - `/api/v1/shard-types/*` - Shard type management
   - `/api/v1/shard-relationships/*` - Shard relationships
   - `/api/v1/shard-bulk/*` - Bulk shard operations
   - `/api/v1/revisions/*` - Revision history
   - `/api/v1/documents/*` - Document management
   - `/api/v1/document-bulk/*` - Bulk document operations
   - `/api/v1/collections/*` - Document collections

5. **AI & Insights** (✅ Complete)
   - `/api/v1/insights/*` - AI insights
   - `/api/v1/insights/search/*` - Insight search
   - `/api/v1/ai-recommendation/*` - AI recommendations
   - `/api/v1/ai-connections/*` - AI connection management
   - `/api/v1/ai-tools/*` - AI tool execution
   - `/api/v1/ai-settings/*` - AI settings
   - `/api/v1/ai-analytics/*` - AI analytics
   - `/api/v1/prompts/*` - Prompt management
   - `/api/v1/intent-patterns/*` - Intent pattern management
   - `/api/v1/proactive-insights/*` - Proactive insights
   - `/api/v1/proactive-triggers/*` - Proactive triggers

6. **Risk Analysis** (✅ Complete)
   - `/api/v1/risk-analysis/*` - Risk evaluation
   - `/api/v1/simulation/*` - Risk simulation
   - `/api/v1/quotas/*` - Quota management
   - `/api/v1/benchmarks/*` - Benchmarking

7. **Vector Search & Embeddings** (✅ Complete)
   - `/api/v1/vector-search/*` - Vector similarity search
   - `/api/v1/vector-search-ui/*` - Vector search UI
   - `/api/v1/embedding/*` - Embedding operations
   - `/api/v1/embedding-jobs/*` - Embedding job management
   - `/api/v1/embedding-template/*` - Embedding templates
   - `/api/v1/embedding-template-generation/*` - Template generation

8. **Integrations** (✅ Complete)
   - `/api/v1/integrations/*` - Integration management
   - `/api/v1/integration-monitoring/*` - Integration monitoring

9. **Content Generation** (✅ Complete)
   - `/api/v1/content-generation/*` - Content generation
   - `/api/v1/templates/*` - Template management
   - `/api/v1/document-templates/*` - Document templates

10. **Dashboards & Widgets** (✅ Complete)
    - `/api/v1/dashboards/*` - Dashboard management
    - `/api/v1/widget-catalog/*` - Widget catalog

11. **Notifications** (✅ Complete)
    - `/api/v1/notifications/*` - Notification management

12. **Webhooks** (✅ Complete)
    - `/api/v1/webhooks/*` - Webhook management

13. **Collaboration** (✅ Complete)
    - `/api/v1/collaboration/*` - Collaboration features
    - `/api/v1/collaborative-insights/*` - Collaborative insights

14. **Admin** (✅ Complete)
    - `/api/v1/admin/*` - Admin operations
    - `/api/v1/admin-dashboard/*` - Admin dashboard
    - `/api/v1/cache-admin/*` - Cache administration
    - `/api/v1/cache-optimization/*` - Cache optimization

15. **Audit & Monitoring** (✅ Complete)
    - `/api/v1/audit-log/*` - Audit logging
    - `/api/v1/mfa-audit/*` - MFA audit logs
    - `/api/v1/phase2-audit-trail/*` - Phase 2 audit trail
    - `/api/v1/comprehensive-audit-trail/*` - Comprehensive audit trail
    - `/api/v1/phase2-metrics/*` - Phase 2 metrics

16. **Other Routes** (✅ Complete)
    - `/api/v1/context-template/*` - Context templates
    - `/api/v1/project-resolver/*` - Project resolution
    - `/api/v1/project-analytics/*` - Project analytics
    - `/api/v1/search-analytics/*` - Search analytics
    - `/api/v1/option-list/*` - Option lists
    - `/api/v1/import-export/*` - Import/export
    - `/api/v1/schema-migration/*` - Schema migrations
    - `/api/v1/scim/*` - SCIM protocol
    - `/api/v1/teams/*` - Team management
    - `/api/v1/web-search/*` - Web search
    - `/api/v1/websocket/*` - WebSocket connections
    - `/api/v1/sse/*` - Server-sent events
    - `/health` - Health check

### Missing API Routes

- ❌ `/api/v1/risk-ml/*` - ML model management (ML system not implemented)
- ❌ `/api/v1/risk-ml/models/*` - Model CRUD (ML system not implemented)
- ❌ `/api/v1/risk-ml/training/*` - Training jobs (ML system not implemented)
- ❌ `/api/v1/risk-ml/feedback/*` - ML feedback (ML system not implemented)

---

## 🔍 Gap Analysis

### Critical Gaps

#### CRITICAL-1: Missing ML System API Routes
- **Severity:** Critical
- **Impact:** Product, Feature Completeness
- **Description:** ML system API routes documented but not implemented
- **Missing Routes:**
  - ❌ `apps/api/src/routes/risk-ml.routes.ts`
  - ❌ `/api/v1/risk-ml/*` endpoints
- **Code References:**
  - Missing: `apps/api/src/routes/risk-ml.routes.ts`
- **Blocks Production:** Yes - Features documented but unavailable

### High Priority Gaps

#### HIGH-1: API Versioning Strategy
- **Severity:** High
- **Impact:** Maintainability, Backward Compatibility
- **Description:** APIs use `/api/v1/` prefix but:
  - No clear versioning strategy
  - No deprecation process
  - No backward compatibility guarantees
- **Code References:**
  - All route files use `/api/v1/` prefix
- **Recommendation:**
  1. Define API versioning strategy
  2. Implement deprecation process
  3. Document backward compatibility guarantees

#### HIGH-2: API Contract Validation
- **Severity:** High
- **Impact:** User Experience, Stability
- **Description:** Potential mismatches between:
  - Frontend API client expectations
  - Backend API responses
  - Type definitions in shared-types
- **Code References:**
  - API client in `apps/web/src/lib/api/`
  - Backend route handlers
  - Shared type definitions in `packages/shared-types/`
- **Recommendation:**
  1. Validate API contracts
  2. Use shared types consistently
  3. Add API contract tests

#### HIGH-3: Missing API Documentation
- **Severity:** High
- **Impact:** Developer Experience, Integration
- **Description:** Some endpoints may not be fully documented:
  - Swagger/OpenAPI may be incomplete
  - Some endpoints missing from documentation
  - Response schemas may be outdated
- **Recommendation:**
  1. Complete Swagger/OpenAPI documentation
  2. Document all endpoints
  3. Keep response schemas up to date

### Medium Priority Gaps

#### MEDIUM-1: Error Response Consistency
- **Severity:** Medium
- **Impact:** Developer Experience
- **Description:** Error responses may not be consistent across all endpoints
- **Recommendation:**
  1. Standardize error response format
  2. Ensure all endpoints use consistent error handling
  3. Document error codes

#### MEDIUM-2: Rate Limiting Documentation
- **Severity:** Medium
- **Impact:** Developer Experience
- **Description:** Rate limiting may not be fully documented for all endpoints
- **Recommendation:**
  1. Document rate limits for all endpoints
  2. Provide rate limit headers in responses
  3. Document rate limit error responses

---

**Last Updated**: January 2025
**API Version**: 1.0.0
**Maintained By**: Castiel API Team

> **Note:** For comprehensive gap analysis, see [Gap Analysis Documentation](../GAP_ANALYSIS.md)
