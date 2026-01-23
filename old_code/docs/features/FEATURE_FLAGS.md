# Feature Flags System

**Last Updated**: January 2025  
**Status**: Production Ready

---

## Executive Summary

The Castiel platform includes a comprehensive feature flag system that enables gradual rollouts, A/B testing, environment-based feature toggling, and emergency kill switches. This system allows safe deployment of new features and rapid response to production incidents.

---

## Features

### Core Capabilities

1. **Gradual Rollouts**: Percentage-based user rollout (0-100%)
2. **Environment-Based Toggling**: Enable/disable features per environment (development, staging, production)
3. **Role-Based Access**: Restrict features to specific user roles
4. **Tenant-Specific Overrides**: Global flags with tenant-specific overrides
5. **Emergency Toggle (Kill Switch)**: Instantly disable all feature flags in case of critical incidents
6. **Caching**: 5-minute cache for performance optimization
7. **Monitoring**: Comprehensive metrics and event tracking

---

## Architecture

### Components

1. **FeatureFlagService** (`apps/api/src/services/feature-flag.service.ts`)
   - Core business logic for feature flag evaluation
   - Emergency toggle management
   - Caching and performance optimization

2. **FeatureFlagRepository** (`apps/api/src/repositories/feature-flag.repository.ts`)
   - Cosmos DB persistence layer
   - Global and tenant-specific flag storage

3. **FeatureFlagController** (`apps/api/src/controllers/feature-flag.controller.ts`)
   - REST API endpoints
   - Authorization and validation

4. **Feature Flag Routes** (`apps/api/src/routes/feature-flag.routes.ts`)
   - Fastify route registration
   - OpenAPI schema definitions

---

## API Endpoints

### Standard Endpoints

#### List Feature Flags
```
GET /api/v1/feature-flags
```
Returns all feature flags for the current tenant (or global flags).

**Response**:
```json
{
  "flags": [
    {
      "id": "flag-id",
      "name": "new-feature",
      "description": "New feature description",
      "enabled": true,
      "environments": ["production"],
      "roles": ["admin"],
      "percentage": 50,
      "tenantId": "global",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z",
      "updatedBy": "user-id"
    }
  ],
  "count": 1
}
```

#### Get Feature Flag
```
GET /api/v1/feature-flags/:name
```
Returns a specific feature flag by name.

#### Check Feature Flag
```
GET /api/v1/feature-flags/:name/check?environment=production&userRole=admin&userId=user-id
```
Checks if a feature flag is enabled for the given context.

**Response**:
```json
{
  "name": "new-feature",
  "enabled": true,
  "context": {
    "environment": "production",
    "userRole": "admin",
    "userId": "user-id",
    "tenantId": "tenant-id"
  }
}
```

#### Create Feature Flag
```
POST /api/v1/feature-flags
```
Creates a new feature flag (admin only).

**Request Body**:
```json
{
  "name": "new-feature",
  "description": "New feature description",
  "enabled": true,
  "environments": ["production"],
  "roles": ["admin"],
  "percentage": 50,
  "tenantId": "global"
}
```

#### Update Feature Flag
```
PATCH /api/v1/feature-flags/:id
```
Updates an existing feature flag (admin only).

**Request Body**:
```json
{
  "enabled": false,
  "percentage": 100
}
```

#### Delete Feature Flag
```
DELETE /api/v1/feature-flags/:id
```
Deletes a feature flag (admin only).

---

### Emergency Toggle Endpoints

#### Enable Emergency Toggle (Kill Switch)
```
POST /api/v1/feature-flags/emergency/enable
```
**Super Admin Only** - Disables ALL feature flags instantly.

**Request Body**:
```json
{
  "reason": "Critical production incident - disabling all new features"
}
```

**Response**:
```json
{
  "message": "Emergency toggle enabled - all feature flags are now disabled",
  "status": {
    "enabled": true,
    "reason": "Critical production incident - disabling all new features",
    "activatedBy": "user-id",
    "activatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### Disable Emergency Toggle
```
POST /api/v1/feature-flags/emergency/disable
```
**Super Admin Only** - Re-enables normal feature flag evaluation.

**Response**:
```json
{
  "message": "Emergency toggle disabled - feature flags are now evaluated normally",
  "status": {
    "enabled": false
  }
}
```

#### Get Emergency Toggle Status
```
GET /api/v1/feature-flags/emergency/status
```
**Admin Only** - Returns current emergency toggle status.

**Response**:
```json
{
  "status": {
    "enabled": false,
    "reason": null,
    "activatedBy": null,
    "activatedAt": null
  }
}
```

---

## Usage Examples

### Backend Usage

#### Check Feature Flag in Service
```typescript
import { FeatureFlagService } from '../services/feature-flag.service.js';

// In your service
const isEnabled = await featureFlagService.isEnabled('new-feature', {
  environment: 'production',
  userRole: user.role,
  userId: user.id,
  tenantId: user.tenantId,
});

if (isEnabled) {
  // Use new feature
} else {
  // Use old feature or hide feature
}
```

#### Check Feature Flag in Route Handler
```typescript
fastify.get('/new-feature', async (request, reply) => {
  const user = request.user; // From auth middleware
  const featureFlagService = request.server.featureFlagService;
  
  const isEnabled = await featureFlagService.isEnabled('new-feature', {
    environment: process.env.NODE_ENV,
    userRole: user.role,
    userId: user.id,
    tenantId: user.tenantId,
  });
  
  if (!isEnabled) {
    return reply.status(404).send({ error: 'Feature not available' });
  }
  
  // Handle new feature
});
```

### Frontend Usage

The frontend has its own feature flag system in `apps/web/src/lib/feature-flags.tsx`:

```typescript
import { isFeatureEnabled, FeatureFlag } from '@/lib/feature-flags';

// In component
const isEnabled = isFeatureEnabled(FeatureFlag.SHARD_TYPES_ENABLED, {
  userRole: user.role,
  userId: user.id,
});

if (isEnabled) {
  return <NewFeature />;
}
```

---

## Gradual Rollout Strategy

### Percentage-Based Rollout

Feature flags support percentage-based gradual rollouts (0-100%). The system uses a consistent hash of the user ID to ensure the same user always gets the same result.

**Example Rollout Plan**:

1. **Week 1**: 10% rollout
   ```json
   {
     "name": "new-feature",
     "enabled": true,
     "percentage": 10
   }
   ```

2. **Week 2**: 25% rollout
   ```json
   {
     "percentage": 25
   }
   ```

3. **Week 3**: 50% rollout
   ```json
   {
     "percentage": 50
   }
   ```

4. **Week 4**: 100% rollout (remove percentage or set to 100)
   ```json
   {
     "percentage": 100
   }
   ```

### Monitoring Rollouts

The system automatically tracks rollout metrics:

- **Custom Metric**: `feature-flag.rollout-check` (0 or 1)
  - Dimensions: `flagName`, `percentage`, `userPercentage`, `tenantId`
- **Event**: `feature-flag-enabled` when a flag is enabled for a user
  - Properties: `flagName`, `tenantId`, `environment`, `userRole`

**View Metrics in Application Insights**:
```
customMetrics
| where name == "feature-flag.rollout-check"
| where timestamp > ago(24h)
| summarize Enabled = sum(value), Total = count() by flagName = tostring(customDimensions.flagName)
| extend RolloutRate = Enabled * 100.0 / Total
| render barchart
```

---

## Emergency Toggle (Kill Switch)

### When to Use

The emergency toggle should be used in critical production incidents where:
- A new feature is causing system instability
- A security vulnerability is discovered
- Performance degradation is severe
- Data corruption is suspected

### How to Use

#### Via API
```bash
# Enable emergency toggle
curl -X POST https://api.castiel.com/api/v1/feature-flags/emergency/enable \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Critical production incident - disabling all new features"
  }'

# Check status
curl https://api.castiel.com/api/v1/feature-flags/emergency/status \
  -H "Authorization: Bearer $TOKEN"

# Disable emergency toggle
curl -X POST https://api.castiel.com/api/v1/feature-flags/emergency/disable \
  -H "Authorization: Bearer $TOKEN"
```

#### Via Environment Variable

Set `FEATURE_FLAGS_EMERGENCY_DISABLE=true` in your environment to enable emergency toggle on startup. This is useful for:
- Container deployments
- Infrastructure-as-Code
- Automated incident response

### Behavior

When emergency toggle is enabled:
- **All feature flags return `false`** (fail closed)
- Emergency toggle takes precedence over all other flag settings
- Cache is cleared to ensure immediate effect
- Events are logged for audit trail

---

## Best Practices

### 1. Naming Conventions

Use descriptive, kebab-case names:
- ✅ `new-dashboard-ui`
- ✅ `ai-insights-v2`
- ❌ `flag1`
- ❌ `newFeature`

### 2. Flag Lifecycle

1. **Create flag** with `enabled: false` initially
2. **Test in development** environment
3. **Enable in staging** with small percentage (10%)
4. **Gradually increase** percentage in production
5. **Monitor metrics** and error rates
6. **Remove flag** once feature is stable and fully rolled out

### 3. Documentation

Always include a clear description:
```json
{
  "name": "new-feature",
  "description": "Enables the new dashboard UI with improved performance and modern design"
}
```

### 4. Monitoring

Monitor feature flag usage:
- Track `feature-flag-enabled` events
- Monitor `feature-flag.rollout-check` metrics
- Set up alerts for unexpected flag changes
- Review emergency toggle usage

### 5. Security

- Only **ADMIN** and **SUPER_ADMIN** roles can manage flags
- Only **SUPER_ADMIN** can use emergency toggle
- All flag changes are logged with user ID and timestamp
- Emergency toggle requires a reason for audit trail

---

## Configuration

### Environment Variables

- `FEATURE_FLAGS_EMERGENCY_DISABLE`: Set to `true` to enable emergency toggle on startup

### Cosmos DB Container

Feature flags are stored in the `feature-flags` container with:
- **Partition Key**: `tenantId` (`'global'` for global flags)
- **Indexes**: Composite indexes on `tenantId + name`, `tenantId + enabled`, `name + enabled`

---

## Monitoring and Alerts

### Key Metrics

1. **Feature Flag Evaluation Rate**
   - Metric: `feature-flag.rollout-check`
   - Alert: If evaluation rate drops significantly

2. **Emergency Toggle Usage**
   - Event: `feature-flag-emergency-toggle-enabled`
   - Alert: Immediate notification when emergency toggle is enabled

3. **Flag Change Rate**
   - Event: `feature-flag-created`, `feature-flag-updated`, `feature-flag-deleted`
   - Alert: Unusual flag change activity

### Application Insights Queries

**Rollout Rate by Flag**:
```kql
customMetrics
| where name == "feature-flag.rollout-check"
| where timestamp > ago(24h)
| summarize Enabled = sum(value), Total = count() by flagName = tostring(customDimensions.flagName)
| extend RolloutRate = Enabled * 100.0 / Total
| render barchart
```

**Emergency Toggle Events**:
```kql
customEvents
| where name == "feature-flag-emergency-toggle-enabled"
| where timestamp > ago(7d)
| project timestamp, reason = tostring(customDimensions.reason), activatedBy = tostring(customDimensions.activatedBy)
| order by timestamp desc
```

---

## Troubleshooting

### Flag Not Working

1. **Check flag exists**: `GET /api/v1/feature-flags/:name`
2. **Check emergency toggle**: `GET /api/v1/feature-flags/emergency/status`
3. **Verify context**: Ensure `environment`, `userRole`, `userId`, `tenantId` match flag settings
4. **Check cache**: Flags are cached for 5 minutes - wait or clear cache

### Emergency Toggle Not Disabling Flags

1. **Verify toggle is enabled**: `GET /api/v1/feature-flags/emergency/status`
2. **Check environment variable**: `FEATURE_FLAGS_EMERGENCY_DISABLE=true`
3. **Clear cache**: Service cache is cleared automatically, but verify
4. **Check logs**: Look for `feature-flag-emergency-toggle-hit` events

### Gradual Rollout Not Working

1. **Verify percentage**: Check flag has `percentage` set (0-100)
2. **Check user ID**: Percentage rollout requires `userId` in context
3. **Verify hash consistency**: Same user ID should always get same result
4. **Monitor metrics**: Check `feature-flag.rollout-check` metrics

---

## Related Documentation

- [Feature Flag Service](../../apps/api/src/services/feature-flag.service.ts) - Service implementation
- [Feature Flag Repository](../../apps/api/src/repositories/feature-flag.repository.ts) - Repository implementation
- [Feature Flag Controller](../../apps/api/src/controllers/feature-flag.controller.ts) - API controller
- [Frontend Feature Flags](../../apps/web/src/lib/feature-flags.tsx) - Frontend feature flag system

---

**Document Version**: 1.0  
**Last Review**: January 2025  
**Next Review**: Quarterly  
**Maintained By**: Platform Engineering Team
