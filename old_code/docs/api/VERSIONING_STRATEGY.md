# API Versioning Strategy

**Last Updated:** 2025-01-XX  
**Status:** Production Standard

---

## Overview

This document defines the API versioning strategy for the Castiel platform to ensure backward compatibility and smooth evolution of the API.

---

## Versioning Approach

### URL-Based Versioning (Current)

The Castiel API uses **URL-based versioning** in the path:

```
/api/v1/shard-types
/api/v1/shards
/api/v2/shards  (future)
```

**Format:** `/api/v{major}/...`

**Advantages:**
- Clear and explicit
- Easy to understand
- Supports multiple versions simultaneously
- Simple routing

**Disadvantages:**
- Requires URL changes for clients
- More complex routing logic

---

## Version Numbering

### Semantic Versioning

API versions follow semantic versioning principles:

- **Major (v1, v2, v3):** Breaking changes
- **Minor:** New features, backward compatible (not exposed in URL)
- **Patch:** Bug fixes, backward compatible (not exposed in URL)

### When to Increment Major Version

Increment major version when:
- Removing endpoints
- Changing request/response schemas in incompatible ways
- Removing required fields
- Changing authentication/authorization behavior
- Changing error response formats
- Removing query parameters

**Do NOT increment for:**
- Adding new endpoints
- Adding optional fields
- Adding new query parameters
- Performance improvements
- Bug fixes

---

## Current Version

**Current API Version:** `v1`

All endpoints are under `/api/v1/` prefix.

---

## Version Lifecycle

### 1. Development
- New versions developed in feature branches
- Tested in staging environment
- Documented in OpenAPI spec

### 2. Release
- Deployed to production
- Announced to API consumers
- Documentation updated

### 3. Deprecation
- Minimum support period: **12 months**
- Deprecation notice: **6 months** before removal
- Deprecation header added to responses:
  ```
  Deprecation: true
  Sunset: 2026-01-01
  Link: <https://docs.castiel.com/api/v1/deprecation>; rel="deprecation"
  ```

### 4. Removal
- After deprecation period expires
- Version removed from production
- Migration guide provided

---

## Deprecation Policy

### Deprecation Notice Timeline

1. **6 Months Before Removal:**
   - Add `Deprecation` header to responses
   - Update API documentation
   - Notify API consumers via email
   - Add deprecation notice to changelog

2. **3 Months Before Removal:**
   - Reminder notification
   - Update migration guide
   - Provide migration support

3. **1 Month Before Removal:**
   - Final reminder
   - Offer migration assistance
   - Schedule removal date

4. **Removal:**
   - Version removed
   - Redirect to latest version (if possible)
   - Archive documentation

### Deprecation Headers

All deprecated endpoints include:

```
Deprecation: true
Sunset: <ISO 8601 date>
Link: <https://docs.castiel.com/api/deprecation/v1>; rel="deprecation"
```

---

## Migration Guides

### Creating Migration Guides

For each major version change, provide:

1. **What Changed:**
   - Breaking changes list
   - New features
   - Removed features

2. **How to Migrate:**
   - Step-by-step migration instructions
   - Code examples (before/after)
   - Common pitfalls

3. **Timeline:**
   - Deprecation date
   - Removal date
   - Support availability

### Example Migration Guide Structure

```markdown
# Migrating from v1 to v2

## Breaking Changes

### Endpoint Changes
- `/api/v1/shards` → `/api/v2/shards`
- Request body format changed
- Response format changed

### Code Examples

#### Before (v1)
```typescript
POST /api/v1/shards
{
  "name": "My Shard",
  "type": "document"
}
```

#### After (v2)
```typescript
POST /api/v2/shards
{
  "name": "My Shard",
  "shardTypeId": "document-type-id"
}
```

## Migration Checklist
- [ ] Update API base URL
- [ ] Update request formats
- [ ] Update response handling
- [ ] Test all endpoints
- [ ] Update error handling
```

---

## Version Negotiation

### Default Version

If no version is specified, default to latest stable version:

```
GET /api/shards → /api/v1/shards (current)
```

### Version Selection

Clients can specify version via:
1. **URL Path (Recommended):**
   ```
   GET /api/v1/shards
   ```

2. **Accept Header (Future):**
   ```
   Accept: application/vnd.castiel.v1+json
   ```

3. **Query Parameter (Not Recommended):**
   ```
   GET /api/shards?version=v1
   ```

---

## Backward Compatibility

### Compatibility Rules

1. **Additive Changes Only:**
   - New endpoints: ✅ Allowed
   - New optional fields: ✅ Allowed
   - New query parameters: ✅ Allowed

2. **Breaking Changes:**
   - Require new major version
   - Must follow deprecation policy
   - Must provide migration guide

3. **Error Responses:**
   - Error format must remain consistent
   - New error codes allowed
   - Removing error codes requires new version

---

## Version Documentation

### OpenAPI Specification

Each API version has its own OpenAPI specification:

- `docs/apidoc/openapi-v1.yaml`
- `docs/apidoc/openapi-v2.yaml` (future)

### Interactive Documentation

- Swagger UI: `/docs` (latest version)
- Version-specific: `/docs/v1`, `/docs/v2` (future)

---

## Best Practices

### For API Developers

1. **Plan for Versioning:**
   - Design APIs with versioning in mind
   - Avoid breaking changes when possible
   - Use feature flags for experimental features

2. **Document Changes:**
   - Update OpenAPI spec
   - Document breaking changes
   - Provide migration guides

3. **Test Versions:**
   - Test new versions thoroughly
   - Test backward compatibility
   - Test migration paths

### For API Consumers

1. **Pin to Specific Version:**
   - Use explicit version in URLs
   - Don't rely on default version

2. **Monitor Deprecation:**
   - Check `Deprecation` headers
   - Subscribe to API changelog
   - Plan migrations early

3. **Test Migrations:**
   - Test in staging first
   - Verify all endpoints work
   - Update error handling

---

## Examples

### Version in URL

```bash
# v1 endpoint
curl https://api.castiel.com/api/v1/shards

# Future v2 endpoint
curl https://api.castiel.com/api/v2/shards
```

### Deprecation Header

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Jan 2026 00:00:00 GMT
Link: <https://docs.castiel.com/api/deprecation/v1>; rel="deprecation"

{
  "data": [...]
}
```

---

## Related Documentation

- [API Documentation](../apidoc/README.md)
- [OpenAPI Specification](../apidoc/openapi.yaml)
- [Changelog](../CHANGELOG.md)
