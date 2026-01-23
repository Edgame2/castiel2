# API Versioning Strategy

## Overview

This document defines the API versioning strategy for the Castiel platform to ensure backward compatibility and smooth evolution of the API.

## Versioning Approach

### URL-Based Versioning

The API uses URL-based versioning:
- Current version: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

### Version Format

```
/api/v{major}/...
```

Where `{major}` is the major version number.

## Versioning Rules

### Major Version Changes

A major version increment is required when:
- Breaking changes to request/response formats
- Removal of endpoints
- Changes to authentication/authorization
- Changes to core data models that affect API contracts

### Minor Changes (within same major version)

These changes do NOT require a version bump:
- Adding new optional fields to responses
- Adding new optional query parameters
- Adding new endpoints
- Performance improvements
- Bug fixes

## Deprecation Process

1. **Announcement**: Deprecated endpoints are marked in documentation
2. **Warning Headers**: Deprecated endpoints return `X-API-Deprecated: true` header
3. **Sunset Date**: Deprecated endpoints include `Sunset` header with removal date
4. **Migration Guide**: Documentation provides migration path to new version
5. **Removal**: After sunset date, endpoint returns 410 Gone

## Backward Compatibility Guarantees

### Within Major Version

- All existing endpoints remain functional
- Response formats remain stable
- Required fields remain required
- Optional fields may be added

### Between Major Versions

- Previous major versions supported for at least 12 months
- Migration guides provided
- Deprecation warnings in advance

## Implementation

### Version Detection

```typescript
// Extract version from request path
const version = request.url.match(/\/api\/v(\d+)\//)?.[1] || '1';
```

### Version-Specific Route Registration

```typescript
// Register routes for specific version
server.register(v1Routes, { prefix: '/api/v1' });
server.register(v2Routes, { prefix: '/api/v2' });
```

## Examples

### Adding a New Endpoint (No Version Change)

```typescript
// v1 endpoint - no version change needed
server.get('/api/v1/new-feature', handler);
```

### Breaking Change (Requires New Version)

```typescript
// Old v1 endpoint
server.get('/api/v1/old-endpoint', oldHandler);

// New v2 endpoint with breaking changes
server.get('/api/v2/old-endpoint', newHandler);
```

## Best Practices

1. **Plan for versioning from the start**
2. **Document all breaking changes**
3. **Provide migration guides**
4. **Maintain backward compatibility within major versions**
5. **Use semantic versioning principles**

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - API versioning strategy documented but may not be fully implemented

#### Implemented Features (✅)

- ✅ Versioning strategy documented
- ✅ URL-based versioning approach defined
- ✅ Deprecation process defined
- ✅ Backward compatibility guarantees

#### Known Limitations

- ⚠️ **Versioning Implementation** - API versioning may not be fully implemented
  - **Code Reference:**
    - Routes may not be organized by version
    - Version detection may not be implemented
  - **Recommendation:**
    1. Implement version detection
    2. Organize routes by version
    3. Add version headers to responses
    4. Implement deprecation warnings

- ⚠️ **Deprecation Process** - Deprecation process may not be automated
  - **Recommendation:**
    1. Automate deprecation warnings
    2. Add sunset headers
    3. Document migration guides

### Code References

- **API Routes:**
  - `apps/api/src/routes/index.ts` - Route registration
  - Routes may need version organization

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [API README](./README.md) - API overview
- [Backend Documentation](../backend/README.md) - Backend implementation
