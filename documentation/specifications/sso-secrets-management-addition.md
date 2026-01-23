# SSO Secrets Management Integration

## Overview

This document provides additional specifications for integrating SSO configuration secrets with the Secret Management Service (Port 3003). All sensitive SSO credentials (SAML certificates, client secrets, etc.) must be stored securely in the Secret Management Service rather than directly in the database.

---

## Modified Database Schema

### `organizations` Table Update

Remove sensitive fields from the `organizations` table and replace with reference to secret storage:

```sql
-- REMOVE these fields from organizations table:
-- sso_config JSONB (contained sensitive data)

-- ADD this field instead:
ALTER TABLE organizations 
ADD COLUMN sso_secret_id VARCHAR(255); -- Reference to secret in Secret Management Service

-- Updated organizations table structure (SSO-related fields only):
CREATE TABLE organizations (
  -- ... existing fields ...
  
  -- SSO Configuration (non-sensitive)
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider VARCHAR(50), -- 'azure_ad', 'okta', null
  sso_enforce BOOLEAN DEFAULT false,
  sso_secret_id VARCHAR(255), -- Reference to secret storage
  sso_metadata JSONB, -- Non-sensitive SSO metadata (entity ID, SSO URL endpoints, etc.)
  
  -- ... rest of fields ...
);
```

### New Table: `sso_configurations`

Create a separate table for non-sensitive SSO configuration:

```sql
CREATE TABLE sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'azure_ad', 'okta'
  
  -- Non-sensitive configuration
  entity_id VARCHAR(255), -- SAML Entity ID
  sso_url VARCHAR(500), -- SAML SSO URL
  slo_url VARCHAR(500), -- Single Logout URL (optional)
  
  -- Reference to secrets
  secret_id VARCHAR(255) NOT NULL, -- Secret Management Service ID
  
  -- SAML-specific non-sensitive fields
  name_id_format VARCHAR(255) DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  authn_context VARCHAR(255),
  
  -- Attribute mappings (non-sensitive)
  attribute_mappings JSONB, -- Maps SAML attributes to user fields
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, provider)
);

CREATE INDEX idx_sso_configurations_org_id ON sso_configurations(organization_id);
CREATE INDEX idx_sso_configurations_secret_id ON sso_configurations(secret_id);
```

---

## Secret Management Service Integration

### Secret Structure for SSO

Secrets stored in the Secret Management Service will follow this structure:

```typescript
interface SSOSecret {
  secretId: string; // Unique identifier
  organizationId: string;
  provider: 'azure_ad' | 'okta';
  
  // Sensitive credentials
  credentials: {
    // For SAML
    certificate?: string; // X.509 Certificate (PEM format)
    privateKey?: string; // Private key for signing (if required)
    
    // For Azure AD
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    
    // For Okta
    oktaDomain?: string;
    apiToken?: string;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  expiresAt?: string; // For certificate expiration
}
```

### API Endpoints - Secret Management Service

#### Store SSO Secret

**POST `/secrets/sso`**
```typescript
// Request (authenticated, requires 'organization.manage_sso' permission)
{
  organizationId: string;
  provider: 'azure_ad' | 'okta';
  credentials: {
    certificate?: string;
    privateKey?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    oktaDomain?: string;
    apiToken?: string;
  };
}

// Response
{
  secretId: string;
  organizationId: string;
  provider: string;
  createdAt: string;
  expiresAt?: string; // Certificate expiration
}

// Triggers:
// - Event: sso_secret.created
// - Audit: secret.sso_created
// - Notification: org admins notified
```

#### Retrieve SSO Secret

**GET `/secrets/sso/:secretId`**
```typescript
// Request (authenticated, org admin only, from trusted service)
// Headers: X-Service-Token: <service-token>

// Response
{
  secretId: string;
  organizationId: string;
  provider: string;
  credentials: {
    certificate?: string;
    privateKey?: string;
    // ... other credentials based on provider
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// Note: This endpoint should only be accessible by:
// 1. Organization admins (for management)
// 2. Auth service (for SSO authentication flows)
// Service-to-service authentication required
```

#### Update SSO Secret

**PUT `/secrets/sso/:secretId`**
```typescript
// Request (authenticated, requires 'organization.manage_sso' permission)
{
  credentials: {
    certificate?: string;
    privateKey?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    oktaDomain?: string;
    apiToken?: string;
  };
}

// Response
{
  secretId: string;
  organizationId: string;
  provider: string;
  updatedAt: string;
  expiresAt?: string;
}

// Triggers:
// - Event: sso_secret.updated
// - Audit: secret.sso_updated
// - Notification: org admins notified
// - Revoke existing SSO sessions (optional, configurable)
```

#### Delete SSO Secret

**DELETE `/secrets/sso/:secretId`**
```typescript
// Request (authenticated, requires 'organization.manage_sso' permission)

// Response
{
  success: boolean;
  message: string;
}

// Cascading actions:
// - Disable SSO for organization
// - Revoke all SSO sessions
// - Update organization.sso_enabled = false

// Triggers:
// - Event: sso_secret.deleted
// - Audit: secret.sso_deleted
// - Notification: org admins and members notified
```

#### Rotate SSO Certificate

**POST `/secrets/sso/:secretId/rotate`**
```typescript
// Request (authenticated, org admin only)
{
  newCertificate: string;
  newPrivateKey?: string;
  gracePeriodHours?: number; // Keep old cert valid for transition
}

// Response
{
  secretId: string;
  rotatedAt: string;
  gracePeriodEndsAt?: string;
}

// Triggers:
// - Event: sso_secret.rotated
// - Audit: secret.sso_rotated
// - Notification: org admins notified
```

#### Check Certificate Expiration

**GET `/secrets/sso/:secretId/expiration`**
```typescript
// Request (authenticated, org admin)

// Response
{
  secretId: string;
  expiresAt?: string;
  daysUntilExpiration?: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // < 30 days
}
```

---

## Modified Organization Service Endpoints

### SSO Configuration Endpoints (Updated)

#### Get SSO Configuration

**GET `/organizations/:organizationId/sso/config`**
```typescript
// Request (authenticated, requires 'organization.manage_sso' permission)

// Response (NON-SENSITIVE DATA ONLY)
{
  enabled: boolean;
  provider?: 'azure_ad' | 'okta';
  enforce: boolean;
  config: {
    entityId?: string;
    ssoUrl?: string;
    sloUrl?: string;
    nameIdFormat?: string;
    attributeMappings?: Record<string, string>;
  };
  certificateExpiration?: {
    expiresAt: string;
    daysUntilExpiration: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  secretId: string; // Reference only, not the actual secret
}
```

#### Configure SSO

**PUT `/organizations/:organizationId/sso/config`**
```typescript
// Request (authenticated, requires 'organization.manage_sso' permission)
{
  enabled: boolean;
  provider: 'azure_ad' | 'okta';
  enforce?: boolean;
  
  // Non-sensitive configuration
  config: {
    entityId: string;
    ssoUrl: string;
    sloUrl?: string;
    nameIdFormat?: string;
    attributeMappings?: Record<string, string>;
  };
  
  // Sensitive credentials (passed to Secret Management Service)
  credentials: {
    certificate?: string;
    privateKey?: string;
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    oktaDomain?: string;
    apiToken?: string;
  };
}

// Response
{
  ssoConfig: SSOConfiguration;
  secretId: string;
}

// Process:
// 1. Validate non-sensitive config
// 2. Call Secret Management Service to store credentials
// 3. Store non-sensitive config in sso_configurations table
// 4. Update organization.sso_secret_id

// Triggers:
// - Event: organization.sso_configured
// - Notification: org admins and members notified
// - Audit: organization.sso_configured
```

#### Get SSO Credentials (Internal Service-to-Service Only)

**GET `/organizations/:organizationId/sso/credentials`**
```typescript
// Request (service-to-service auth only, from Auth Service)
// Headers: 
//   X-Service-Token: <service-token>
//   X-Requesting-Service: auth-service

// Response (FULL CREDENTIALS)
{
  provider: string;
  credentials: {
    certificate?: string;
    privateKey?: string;
    clientId?: string;
    clientSecret?: string;
    // ... full credentials
  };
  config: {
    entityId: string;
    ssoUrl: string;
    // ... full config
  };
}

// Security:
// - Only accessible by authenticated services
// - Rate limited
// - Audit logged
// - IP whitelist for service communication
```

---

## Auth Service Integration

### Modified SSO Flow

#### SAML Initiation (Updated)

**POST `/auth/sso/saml/initiate`**
```typescript
// Process:
// 1. Validate organization and SSO enabled
// 2. Call Organization Service (service-to-service) to get SSO credentials
//    GET /organizations/:orgId/sso/credentials
// 3. Generate SAML AuthnRequest using credentials
// 4. Return SSO URL to user

// Internal call to Organization Service:
const ssoCredentials = await orgService.getSSOCredentials(organizationId, {
  serviceToken: process.env.SERVICE_AUTH_TOKEN,
  requestingService: 'auth-service'
});

// Use credentials to build SAML request
const samlRequest = buildSAMLRequest({
  entityId: ssoCredentials.config.entityId,
  ssoUrl: ssoCredentials.config.ssoUrl,
  certificate: ssoCredentials.credentials.certificate
});
```

#### SAML Callback (Updated)

**POST `/auth/sso/saml/callback`**
```typescript
// Process:
// 1. Extract organization from SAML response
// 2. Call Organization Service to get SSO credentials
// 3. Validate SAML signature using certificate from Secret Management
// 4. Parse SAML assertion
// 5. Create/update user
// 6. Create session

// Internal call to get credentials:
const ssoCredentials = await orgService.getSSOCredentials(organizationId, {
  serviceToken: process.env.SERVICE_AUTH_TOKEN,
  requestingService: 'auth-service'
});

// Validate SAML response
const isValid = validateSAMLResponse(
  samlResponse,
  ssoCredentials.credentials.certificate
);
```

---

## Service-to-Service Authentication

### Secret Management Service Access Control

The Secret Management Service must implement strict access control for SSO secrets:

```typescript
// Access control rules
interface SecretAccessControl {
  // Who can access SSO secrets
  allowedServices: ['auth-service', 'organization-service'];
  
  // Access levels
  accessLevels: {
    'auth-service': ['read'], // Only read for SSO flows
    'organization-service': ['read', 'write', 'delete'], // Full access for management
  };
  
  // Rate limiting
  rateLimits: {
    'auth-service': '1000/hour', // High limit for SSO flows
    'organization-service': '100/hour', // Lower limit for management
  };
}
```

### Service Authentication

Services authenticate to Secret Management Service using service tokens:

```typescript
// Environment variables for service authentication
AUTH_SERVICE_TOKEN=<secure-token>
ORG_SERVICE_TOKEN=<secure-token>

// Request headers for service-to-service calls
headers: {
  'X-Service-Token': process.env.AUTH_SERVICE_TOKEN,
  'X-Requesting-Service': 'auth-service',
  'X-Organization-Id': organizationId // For audit trail
}
```

---

## Audit Events

### Additional Audit Events for SSO Secrets

```typescript
// secret.sso_created
{
  eventType: 'secret.sso_created',
  eventCategory: 'secrets',
  eventAction: 'created',
  organizationId: string,
  actorId: string,
  resourceType: 'sso_secret',
  resourceId: string,
  severity: 'info',
  metadata: {
    provider: string,
    hasPrivateKey: boolean,
    certificateExpiration?: string
  }
}

// secret.sso_updated
{
  eventType: 'secret.sso_updated',
  eventCategory: 'secrets',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'sso_secret',
  resourceId: string,
  severity: 'warning',
  changes: {
    certificateChanged: boolean,
    privateKeyChanged: boolean,
    credentialsChanged: boolean
  }
}

// secret.sso_deleted
{
  eventType: 'secret.sso_deleted',
  eventCategory: 'secrets',
  eventAction: 'deleted',
  organizationId: string,
  actorId: string,
  resourceType: 'sso_secret',
  resourceId: string,
  severity: 'critical'
}

// secret.sso_rotated
{
  eventType: 'secret.sso_rotated',
  eventCategory: 'secrets',
  eventAction: 'updated',
  organizationId: string,
  actorId: string,
  resourceType: 'sso_secret',
  resourceId: string,
  severity: 'info',
  metadata: {
    gracePeriodHours: number,
    oldCertificateExpiration: string,
    newCertificateExpiration: string
  }
}

// secret.sso_accessed
{
  eventType: 'secret.sso_accessed',
  eventCategory: 'secrets',
  eventAction: 'accessed',
  organizationId: string,
  resourceType: 'sso_secret',
  resourceId: string,
  severity: 'debug',
  metadata: {
    requestingService: string,
    purpose: 'sso_authentication' | 'management',
    ipAddress: string
  }
}

// secret.sso_certificate_expiring
{
  eventType: 'secret.sso_certificate_expiring',
  eventCategory: 'secrets',
  eventAction: 'accessed',
  organizationId: string,
  resourceType: 'sso_secret',
  resourceId: string,
  severity: 'warning',
  metadata: {
    expiresAt: string,
    daysUntilExpiration: number
  }
}
```

---

## Notification Events

### SSO Secret-Related Notifications

```typescript
// sso_secret.certificate_expiring_soon
{
  eventType: 'sso_secret.certificate_expiring_soon',
  eventCategory: 'secrets',
  organizationId: string,
  data: {
    provider: string,
    expiresAt: string,
    daysUntilExpiration: number
  }
}
// Notification: Email to org admins 30, 14, 7, 3, 1 day(s) before expiration

// sso_secret.certificate_expired
{
  eventType: 'sso_secret.certificate_expired',
  eventCategory: 'secrets',
  organizationId: string,
  data: {
    provider: string,
    expiredAt: string
  }
}
// Notification: Email and in-app to org admins and members
// Action: SSO automatically disabled

// sso_secret.credentials_updated
{
  eventType: 'sso_secret.credentials_updated',
  eventCategory: 'secrets',
  organizationId: string,
  actorId: string,
  data: {
    provider: string,
    changeType: 'certificate' | 'credentials' | 'all'
  }
}
// Notification: Email to org admins

// sso_secret.rotation_completed
{
  eventType: 'sso_secret.rotation_completed',
  eventCategory: 'secrets',
  organizationId: string,
  actorId: string,
  data: {
    provider: string,
    gracePeriodEndsAt?: string
  }
}
// Notification: Email to org admins
```

---

## Background Jobs

### Certificate Expiration Monitoring

```typescript
// Job: check-sso-certificate-expiration
// Schedule: Daily at 00:00 UTC

async function checkSSOCertificateExpiration() {
  // 1. Query all active SSO configurations
  const ssoConfigs = await db.ssoConfiguration.findMany({
    where: { isActive: true }
  });
  
  for (const config of ssoConfigs) {
    // 2. Get secret from Secret Management Service
    const secret = await secretService.getSSOSecret(config.secretId);
    
    // 3. Parse certificate and check expiration
    const cert = parseCertificate(secret.credentials.certificate);
    const daysUntilExpiration = daysBetween(new Date(), cert.expiresAt);
    
    // 4. Send notifications based on threshold
    if (daysUntilExpiration <= 0) {
      // Certificate expired - disable SSO
      await disableSSO(config.organizationId);
      await publishEvent('sso_secret.certificate_expired', { ... });
    } else if ([30, 14, 7, 3, 1].includes(daysUntilExpiration)) {
      // Send expiration warning
      await publishEvent('sso_secret.certificate_expiring_soon', { ... });
    }
  }
}
```

---

## Migration Strategy

### Migration from Current Schema

If there are existing organizations with SSO configured:

```typescript
// Migration script: migrate-sso-secrets-to-secret-service

async function migrateSSOSecrets() {
  const orgsWithSSO = await db.organization.findMany({
    where: { 
      ssoEnabled: true,
      ssoConfig: { not: null }
    }
  });
  
  for (const org of orgsWithSSO) {
    try {
      // 1. Extract sensitive data from sso_config JSONB
      const sensitiveData = {
        certificate: org.ssoConfig.certificate,
        privateKey: org.ssoConfig.privateKey,
        clientId: org.ssoConfig.clientId,
        clientSecret: org.ssoConfig.clientSecret,
        // ... other sensitive fields
      };
      
      // 2. Create secret in Secret Management Service
      const secret = await secretService.createSSOSecret({
        organizationId: org.id,
        provider: org.ssoProvider,
        credentials: sensitiveData
      });
      
      // 3. Extract non-sensitive data
      const nonSensitiveConfig = {
        entityId: org.ssoConfig.entityId,
        ssoUrl: org.ssoConfig.ssoUrl,
        sloUrl: org.ssoConfig.sloUrl,
        // ... other non-sensitive fields
      };
      
      // 4. Create sso_configuration record
      await db.ssoConfiguration.create({
        data: {
          organizationId: org.id,
          provider: org.ssoProvider,
          secretId: secret.secretId,
          ...nonSensitiveConfig
        }
      });
      
      // 5. Update organization record
      await db.organization.update({
        where: { id: org.id },
        data: {
          ssoSecretId: secret.secretId,
          ssoMetadata: nonSensitiveConfig,
          ssoConfig: null // Clear old JSONB field
        }
      });
      
      console.log(`Migrated SSO config for org ${org.id}`);
      
    } catch (error) {
      console.error(`Failed to migrate org ${org.id}:`, error);
      // Log failure but continue with other orgs
    }
  }
}
```

---

## Security Considerations

### Encryption in Secret Management Service

SSO secrets must be encrypted at rest in the Secret Management Service:

```typescript
// Encryption configuration
interface SecretEncryption {
  algorithm: 'AES-256-GCM';
  keyManagement: 'AWS KMS' | 'Azure Key Vault' | 'HashiCorp Vault';
  
  // Envelope encryption
  dataEncryptionKey: 'per-secret'; // Unique DEK per secret
  keyEncryptionKey: 'managed'; // KEK in key management service
}
```

### Access Logging

All access to SSO secrets must be logged:

```typescript
// Every secret access creates audit log entry
{
  eventType: 'secret.sso_accessed',
  timestamp: string,
  organizationId: string,
  secretId: string,
  requestingService: string,
  requestingUser?: string,
  ipAddress: string,
  purpose: string,
  success: boolean
}
```

### Credential Rotation Policy

Enforce regular credential rotation:

```typescript
interface RotationPolicy {
  certificateRotation: {
    enabled: true,
    warningDays: [30, 14, 7, 3, 1],
    autoRotate: false, // Manual rotation required
    gracePeriodHours: 24 // Keep old cert valid during transition
  };
  
  clientSecretRotation: {
    enabled: true,
    rotationIntervalDays: 90,
    autoRotate: true, // Can auto-rotate if provider supports
  };
}
```

---

## Testing Considerations

### Test SSO Configuration Without Real Secrets

For testing SSO flows without exposing real credentials:

```typescript
// Test mode configuration
if (process.env.NODE_ENV === 'test') {
  // Use mock Secret Management Service
  secretService = new MockSecretService({
    mockCertificate: 'test-certificate',
    mockPrivateKey: 'test-private-key',
    autoValidate: true
  });
}
```

### Integration Tests

```typescript
describe('SSO Secret Management Integration', () => {
  it('should store SSO credentials in Secret Management Service', async () => {
    const response = await request(app)
      .put('/organizations/org-123/sso/config')
      .send({
        enabled: true,
        provider: 'azure_ad',
        config: { entityId: 'test', ssoUrl: 'https://...' },
        credentials: { certificate: 'cert', clientId: 'id', clientSecret: 'secret' }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.secretId).toBeDefined();
    
    // Verify secret was created in Secret Management Service
    const secret = await secretService.getSSOSecret(response.body.secretId);
    expect(secret.credentials.certificate).toBe('cert');
  });
  
  it('should retrieve credentials for SSO authentication', async () => {
    // Auth service requesting credentials
    const credentials = await orgService.getSSOCredentials('org-123', {
      serviceToken: process.env.SERVICE_AUTH_TOKEN,
      requestingService: 'auth-service'
    });
    
    expect(credentials.credentials.certificate).toBeDefined();
    expect(credentials.config.entityId).toBeDefined();
  });
  
  it('should rotate SSO certificate', async () => {
    const response = await request(app)
      .post(`/secrets/sso/${secretId}/rotate`)
      .send({
        newCertificate: 'new-cert',
        gracePeriodHours: 24
      });
    
    expect(response.status).toBe(200);
    expect(response.body.rotatedAt).toBeDefined();
  });
});
```

---

## Summary

This integration ensures that:

1. **All SSO credentials are stored securely** in the Secret Management Service, not in the database
2. **Non-sensitive configuration** remains in the database for quick access
3. **Service-to-service authentication** protects credential access
4. **Comprehensive audit logging** tracks all secret access
5. **Certificate expiration monitoring** prevents SSO outages
6. **Credential rotation** maintains security best practices
7. **Migration path** exists for transitioning existing SSO configurations

The Secret Management Service becomes the single source of truth for all SSO credentials, with proper access control, encryption, and audit trails.
