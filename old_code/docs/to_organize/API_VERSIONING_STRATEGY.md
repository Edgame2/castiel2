# API Versioning Strategy

## Overview

This document outlines the API versioning strategy for the Castiel platform. The strategy ensures backward compatibility, smooth migrations, and clear deprecation processes.

## Version Format

- API versions use the format: `v1`, `v2`, `v3`, etc.
- Current version: **v1**
- Versions are specified via:
  - HTTP Header: `X-API-Version: v1` (preferred)
  - HTTP Header: `Accept-Version: v1` (alternative)
  - URL Path: `/api/v1/...` (fallback)

## Version Detection

The API versioning middleware automatically detects the requested version in the following order:

1. `X-API-Version` header
2. `Accept-Version` header
3. URL path pattern (`/api/v1/...`)
4. Default to current version (`v1`) if not specified

## Version Status

Each API version has one of three statuses:

### Current
- **Status:** `current`
- **Description:** Actively supported and recommended for new integrations
- **Support:** Full support, bug fixes, security patches
- **Response Header:** `X-API-Version-Status: current`

### Deprecated
- **Status:** `deprecated`
- **Description:** Still supported but will be sunset in the future
- **Support:** Security patches only, no new features
- **Response Headers:**
  - `X-API-Version-Status: deprecated`
  - `X-API-Version-Deprecated: true`
  - `X-API-Version-Replacement: <new-version>` (if available)
  - `Warning: 299 - "Deprecated API" "Sunset: <date>"`

### Sunset
- **Status:** `sunset`
- **Description:** No longer supported
- **Support:** None
- **Response:** HTTP 410 (Gone)

## Deprecation Process

### Timeline

1. **Announcement:** Deprecation announced 6 months before sunset
2. **Deprecated:** Version marked as deprecated, warnings added to responses
3. **Sunset:** Version removed after 6 months of deprecation

### Migration Support

- Deprecation notices include:
  - Replacement version (if available)
  - Migration guide URL
  - Sunset date
- Monitoring tracks deprecated version usage
- Teams are notified of high usage of deprecated versions

## Backward Compatibility

### Guarantees

- **Current Version:** Full backward compatibility within the version
- **Deprecated Version:** Security patches only, no breaking changes
- **Sunset Version:** No support, may be removed

### Breaking Changes

Breaking changes require a new version:
- Removing endpoints
- Changing request/response schemas
- Removing required fields
- Changing authentication requirements

Non-breaking changes can be made to current version:
- Adding optional fields
- Adding new endpoints
- Adding new query parameters
- Performance improvements

## Usage Tracking

The API versioning service tracks:
- Version usage by endpoint
- Version usage by tenant/user
- Deprecated version usage (for migration planning)

## Implementation

### Middleware

The API versioning middleware is automatically applied to all `/api/*` routes:

```typescript
import { ApiVersioningService } from '../utils/api-versioning.js';
import { registerApiVersioningMiddleware } from '../middleware/api-versioning.middleware.js';

const apiVersioningService = new ApiVersioningService(monitoring, 'v1');
registerApiVersioningMiddleware(server, {
  versioningService: apiVersioningService,
  monitoring,
  requireVersion: false, // Allow default version fallback
  addVersionHeaders: true,
  trackUsage: true,
});
```

### Response Headers

All API responses include version information:

- `X-API-Version`: The version used for the request
- `X-API-Version-Current`: The current recommended version
- `X-API-Version-Status`: Status of the requested version
- `X-API-Version-Deprecated`: `true` if version is deprecated
- `X-API-Version-Replacement`: Replacement version (if deprecated)
- `Warning`: RFC 7234 deprecation warning (if deprecated)

### Request Context

The API version is available in request handlers:

```typescript
const apiVersion = (request as any).apiVersion; // 'v1', 'v2', etc.
```

## Future Versions

### Adding a New Version

When adding a new version (e.g., v2):

1. Update `ApiVersioningService.initializeVersions()`:
   ```typescript
   this.supportedVersions.set('v2', {
     version: 'v2',
     status: 'current',
   });
   ```

2. Update `currentVersion`:
   ```typescript
   this.currentVersion = 'v2';
   ```

3. Deprecate old version:
   ```typescript
   apiVersioningService.deprecateVersion('v1', {
     replacementVersion: 'v2',
     sunsetAt: new Date('2025-12-31'),
     deprecationNotice: 'v1 will be sunset on 2025-12-31',
     migrationGuide: 'https://docs.castiel.com/migration/v1-to-v2',
   });
   ```

### Deprecating a Version

```typescript
apiVersioningService.deprecateVersion('v1', {
  replacementVersion: 'v2',
  sunsetAt: new Date('2025-12-31'),
  deprecationNotice: 'v1 will be sunset on 2025-12-31',
  migrationGuide: 'https://docs.castiel.com/migration/v1-to-v2',
});
```

### Sunsetting a Version

```typescript
apiVersioningService.sunsetVersion('v1');
```

## Best Practices

### For API Consumers

1. **Always specify version:** Use `X-API-Version` header
2. **Monitor deprecation warnings:** Check response headers
3. **Plan migrations:** Migrate before sunset date
4. **Test thoroughly:** Test new versions in staging first

### For API Developers

1. **Avoid breaking changes:** Use new version for breaking changes
2. **Document changes:** Provide migration guides
3. **Monitor usage:** Track deprecated version usage
4. **Communicate early:** Announce deprecations well in advance

## Monitoring

The versioning service tracks:
- Version usage statistics
- Deprecated version usage
- Version-specific errors
- Migration progress

Access via:
```typescript
const stats = apiVersioningService.getVersionUsageStats();
```

## Support

For questions or issues with API versioning:
- Check this documentation
- Review migration guides
- Contact the API team

---

**Last Updated:** January 2025  
**Current Version:** v1  
**Next Review:** When v2 is introduced
