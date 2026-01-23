# API Versioning Strategy

## Overview

This document defines the API versioning strategy for the Castiel platform, including deprecation processes, backward compatibility guarantees, and migration guidelines.

## Versioning Approach

### URL Path Versioning

The API uses **URL path versioning** as the primary method:

- **Format**: `/api/v{version}/...`
- **Example**: `/api/v1/shard-types`, `/api/v2/opportunities`
- **Default**: Requests without explicit version default to `v1`

### Header-Based Versioning (Alternative)

Clients can also specify version via headers:

- **X-API-Version**: `X-API-Version: v1`
- **Accept-Version**: `Accept-Version: v1` (alternative standard)

If both URL and header are provided, URL path takes precedence.

## Version Lifecycle

### 1. Current

- **Status**: `current`
- **Description**: The actively maintained and recommended version
- **Support**: Full support, receives all updates and bug fixes
- **Example**: `v1` is currently the only current version

### 2. Deprecated

- **Status**: `deprecated`
- **Description**: Still supported but scheduled for removal
- **Support**: Security fixes and critical bug fixes only
- **Timeline**: Minimum 6 months notice before sunset
- **Headers**: 
  - `Warning: 299 - "Deprecated API"`
  - `X-API-Version-Deprecated: true`
  - `X-API-Version-Replacement: v2` (if applicable)
  - `X-API-Version-Status: deprecated`

### 3. Sunset

- **Status**: `sunset`
- **Description**: No longer supported, requests return 410 Gone
- **Support**: None
- **Response**: HTTP 410 with error message

## Backward Compatibility Guarantees

### What We Guarantee

1. **Response Structure**: Response schemas remain stable within a version
2. **Required Fields**: Required fields in requests remain required
3. **Endpoint Availability**: Endpoints remain available until deprecated
4. **Authentication**: Authentication mechanisms remain compatible

### What May Change (Breaking Changes Require New Version)

1. **New Required Fields**: Adding required fields to request bodies
2. **Removing Fields**: Removing fields from responses
3. **Changing Field Types**: Changing data types (e.g., string to number)
4. **Removing Endpoints**: Removing entire endpoints
5. **Changing HTTP Methods**: Changing allowed HTTP methods
6. **Authentication Changes**: Changing authentication requirements

### What Can Change Without New Version

1. **Adding Optional Fields**: Adding optional fields to requests/responses
2. **Adding New Endpoints**: Adding new endpoints to existing version
3. **Performance Improvements**: Internal optimizations
4. **Bug Fixes**: Fixing incorrect behavior
5. **Documentation**: Improving documentation and error messages

## Deprecation Process

### Step 1: Announce Deprecation

1. **Documentation**: Update API documentation with deprecation notice
2. **Release Notes**: Include in release notes and changelog
3. **Communication**: Notify affected clients (if known)
4. **Timeline**: Set sunset date (minimum 6 months from deprecation)

### Step 2: Mark as Deprecated

```typescript
// In api-versioning.ts initialization or runtime
apiVersioningService.deprecateVersion('v1', {
  replacementVersion: 'v2',
  sunsetAt: new Date('2025-12-31'),
  deprecationNotice: 'v1 will be sunset on 2025-12-31. Please migrate to v2.',
  migrationGuide: 'https://docs.castiel.com/api/migration/v1-to-v2',
});
```

### Step 3: Monitor Usage

- Track deprecated version usage via monitoring events
- Identify clients still using deprecated version
- Provide migration support and guidance

### Step 4: Sunset Version

```typescript
// After sunset date
apiVersioningService.sunsetVersion('v1');
```

## Creating a New Version

### When to Create a New Version

Create a new version (`v2`) when:

1. **Breaking Changes**: Making breaking changes to existing endpoints
2. **Major Refactoring**: Significant architectural changes
3. **New API Design**: Redesigning API structure or patterns
4. **Deprecation**: Replacing a deprecated version

### How to Create a New Version

1. **Add Version to Service**:

```typescript
apiVersioningService.addVersion('v2', {
  status: 'current',
});
```

2. **Update Current Version**:

```typescript
// Deprecate old version
apiVersioningService.deprecateVersion('v1', {
  replacementVersion: 'v2',
  sunsetAt: new Date('2026-06-30'),
});

// Set new version as current
apiVersioningService.addVersion('v2', {
  status: 'current',
});
```

3. **Create New Routes**:

```typescript
// In routes/index.ts or route-specific files
server.get('/api/v2/opportunities', async (request, reply) => {
  // New v2 implementation
});
```

4. **Maintain Old Routes**: Keep v1 routes until sunset

## Migration Guidelines

### For API Consumers

1. **Monitor Deprecation Warnings**: Check `Warning` and `X-API-Version-Deprecated` headers
2. **Plan Migration**: Allow 6+ months for migration planning
3. **Test New Version**: Test against new version in staging
4. **Update Client Code**: Update API client code to use new version
5. **Monitor Usage**: Track usage of deprecated version

### For API Developers

1. **Document Changes**: Clearly document breaking changes
2. **Provide Migration Guide**: Create detailed migration documentation
3. **Maintain Both Versions**: Support both versions during transition
4. **Monitor Usage**: Track usage of both versions
5. **Communicate Timeline**: Clearly communicate deprecation timeline

## Version Detection

### Automatic Detection

The middleware automatically detects version from:

1. **URL Path**: `/api/v1/...` → `v1`
2. **X-API-Version Header**: `X-API-Version: v1` → `v1`
3. **Accept-Version Header**: `Accept-Version: v1` → `v1`
4. **Default**: Falls back to current version if not specified

### Response Headers

All responses include version information:

- `X-API-Version`: The version used for this request
- `X-API-Version-Current`: The current recommended version
- `X-API-Version-Status`: Status of the version (`current`, `deprecated`, `sunset`)
- `X-API-Version-Deprecated`: `true` if version is deprecated
- `X-API-Version-Replacement`: Replacement version (if deprecated)

## Usage Tracking

The versioning service tracks:

- Version usage by endpoint
- Version usage by tenant/user
- Deprecated version usage
- Version adoption rates

Access via:

```typescript
const stats = apiVersioningService.getVersionUsageStats();
// Returns: { total, byVersion, byEndpoint }
```

## Best Practices

### For API Consumers

1. **Always Specify Version**: Explicitly specify version in requests
2. **Monitor Headers**: Check response headers for deprecation warnings
3. **Plan Ahead**: Start migration planning when deprecation is announced
4. **Test Thoroughly**: Test new versions in staging before production

### For API Developers

1. **Minimize Breaking Changes**: Avoid breaking changes when possible
2. **Clear Communication**: Clearly communicate deprecation timelines
3. **Provide Migration Path**: Always provide migration guide
4. **Monitor Adoption**: Track version adoption and usage
5. **Gradual Rollout**: Support both versions during transition period

## Examples

### Deprecating v1 and Introducing v2

```typescript
// 1. Add v2 as current
apiVersioningService.addVersion('v2', {
  status: 'current',
});

// 2. Deprecate v1 (6 months notice)
apiVersioningService.deprecateVersion('v1', {
  replacementVersion: 'v2',
  sunsetAt: new Date('2026-06-30'),
  deprecationNotice: 'v1 will be sunset on 2026-06-30. Please migrate to v2.',
  migrationGuide: 'https://docs.castiel.com/api/migration/v1-to-v2',
});

// 3. After sunset date
apiVersioningService.sunsetVersion('v1');
```

### Client Request Examples

```bash
# Using URL path
curl https://api.castiel.com/api/v1/opportunities

# Using header
curl -H "X-API-Version: v1" https://api.castiel.com/api/opportunities

# Default (falls back to v1)
curl https://api.castiel.com/api/opportunities
```

## Current Status

- **Current Version**: `v1`
- **Supported Versions**: `v1`
- **Deprecated Versions**: None
- **Sunset Versions**: None

## Related Documentation

- [API Documentation](../README.md)
- [Migration Guides](./MIGRATION_GUIDES.md) (to be created)
- [Backward Compatibility Policy](./BACKWARD_COMPATIBILITY.md) (to be created)

---

**Last Updated**: 2025-01-28  
**Maintained By**: Platform Team
