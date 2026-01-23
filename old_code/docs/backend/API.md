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

**Last Updated**: January 2025
**API Version**: 1.0.0
**Maintained By**: Castiel API Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - API documentation fully documented

#### Implemented Features (✅)

- ✅ REST API endpoints
- ✅ GraphQL API
- ✅ Authentication flows
- ✅ Rate limiting
- ✅ Error handling
- ✅ Swagger/OpenAPI documentation

#### Known Limitations

- ⚠️ **API Versioning** - No clear versioning strategy
  - **Recommendation:**
    1. Define API versioning strategy
    2. Implement deprecation process
    3. Document backward compatibility

- ⚠️ **Swagger Documentation** - Swagger documentation may be incomplete
  - **Recommendation:**
    1. Complete Swagger documentation
    2. Verify all endpoints are documented
    3. Keep documentation up to date

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [API README](../api/README.md) - API overview with gap analysis
- [Backend README](./README.md) - Backend implementation
