# Credentials Management

## Overview

All integration credentials are securely stored in Azure Key Vault. This document covers the credential storage structure, access patterns, and security best practices.

---

## Table of Contents

1. [Key Vault Structure](#key-vault-structure)
2. [Secret Naming Convention](#secret-naming-convention)
3. [Credential Types](#credential-types)
4. [OAuth Token Management](#oauth-token-management)
5. [Access Policies](#access-policies)
6. [Credential Service](#credential-service)
7. [Security Best Practices](#security-best-practices)
8. [Rotation & Expiration](#rotation--expiration)

---

## Key Vault Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AZURE KEY VAULT: kv-castiel-{env}                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SYSTEM SECRETS                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Castiel infrastructure credentials                                  │   │
│  │                                                                      │   │
│  │  system-cosmos-connection-string                                     │   │
│  │  system-redis-connection-string                                      │   │
│  │  system-storage-connection-string                                    │   │
│  │  system-eventgrid-endpoint                                           │   │
│  │  system-eventgrid-key                                                │   │
│  │  system-servicebus-embedding-connection                              │   │
│  │  system-servicebus-sync-connection                                   │   │
│  │  system-servicebus-contentgen-connection                             │   │
│  │  system-azure-openai-endpoint                                        │   │
│  │  system-azure-openai-key                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TENANT INTEGRATION SECRETS                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Per-tenant, per-integration credentials                             │   │
│  │                                                                      │   │
│  │  Format: tenant-{tenantId}-{provider}-{type}                         │   │
│  │                                                                      │   │
│  │  OAuth Tokens:                                                       │   │
│  │  ├── tenant-abc123-salesforce-oauth                                  │   │
│  │  ├── tenant-abc123-dynamics-oauth                                    │   │
│  │  ├── tenant-abc123-google-oauth                                      │   │
│  │  ├── tenant-xyz789-salesforce-oauth                                  │   │
│  │  └── tenant-xyz789-hubspot-oauth                                     │   │
│  │                                                                      │   │
│  │  API Keys:                                                           │   │
│  │  ├── tenant-abc123-gong-apikey                                       │   │
│  │  ├── tenant-abc123-zoom-apikey                                       │   │
│  │  └── tenant-xyz789-custom-apikey                                     │   │
│  │                                                                      │   │
│  │  Service Accounts:                                                   │   │
│  │  ├── tenant-abc123-google-serviceaccount                             │   │
│  │  └── tenant-xyz789-google-serviceaccount                             │   │
│  │                                                                      │   │
│  │  Tenant's Own AI Keys:                                               │   │
│  │  ├── tenant-abc123-openai-apikey                                     │   │
│  │  └── tenant-xyz789-anthropic-apikey                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Secret Naming Convention

### Format

```
{scope}-{identifier}-{provider}-{type}
```

### Examples

| Secret Name | Description |
|-------------|-------------|
| `system-azure-openai-key` | System-wide Azure OpenAI key |
| `tenant-abc123-salesforce-oauth` | Tenant abc123's Salesforce OAuth tokens |
| `tenant-abc123-gong-apikey` | Tenant abc123's Gong API key |
| `tenant-xyz789-google-serviceaccount` | Tenant xyz789's Google service account |

### Naming Rules

- Use lowercase only
- Separate parts with hyphens
- TenantId should be URL-safe
- Provider names match `integration_providers.provider` field

### Updated Naming Patterns (Container Architecture)

With the new container architecture, secret names include instance identifiers for multiple instances:

**Tenant-scoped connections:**
```
tenant-{tenantId}-{providerName}-{instanceId}-oauth
tenant-{tenantId}-{providerName}-{instanceId}-apikey
```

**User-scoped connections:**
```
tenant-{tenantId}-user-{userId}-{providerName}-{instanceId}-oauth
```

**System-scoped connections:**
```
system-{providerName}-oauth
```

**Examples:**
- `tenant-abc123-salesforce-sales-team-oauth` - Tenant's "Sales Team" Salesforce instance
- `tenant-abc123-salesforce-support-team-oauth` - Tenant's "Support Team" Salesforce instance
- `tenant-abc123-user-user456-gmail-personal-oauth` - User's personal Gmail connection
- `system-salesforce-oauth` - System-level Salesforce connection

---

## Credential Types

### OAuth 2.0 Tokens

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "5Aep861...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "expires_at": "2025-11-30T11:00:00Z",
  "scope": "api refresh_token offline_access",
  "instance_url": "https://na1.salesforce.com"
}
```

### API Keys

```json
{
  "api_key": "gong_api_key_xxx",
  "api_secret": "gong_api_secret_xxx",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Service Account (Google)

```json
{
  "type": "service_account",
  "project_id": "project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "service@project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Basic Auth

```json
{
  "username": "api_user",
  "password": "api_password"
}
```

---

## OAuth Token Management

### Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OAUTH TOKEN LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. INITIAL AUTHORIZATION                                                   │
│     User completes OAuth flow in browser                                    │
│     ├── Redirect to provider auth URL                                       │
│     ├── User grants permissions                                             │
│     ├── Provider redirects with auth code                                   │
│     └── Exchange code for tokens                                            │
│                    │                                                        │
│                    ▼                                                        │
│  2. TOKEN STORAGE                                                           │
│     Store in Key Vault: tenant-{tenantId}-{provider}-oauth                  │
│     ├── access_token                                                        │
│     ├── refresh_token                                                       │
│     ├── expires_at                                                          │
│     └── metadata (scopes, instance_url)                                     │
│                    │                                                        │
│                    ▼                                                        │
│  3. TOKEN USAGE                                                             │
│     Sync worker retrieves token for API calls                               │
│     ├── Check expires_at                                                    │
│     ├── If expired or near expiry → refresh                                 │
│     └── Use access_token in API requests                                    │
│                    │                                                        │
│                    ▼                                                        │
│  4. TOKEN REFRESH (Proactive)                                               │
│     TokenRefresher function runs hourly                                     │
│     ├── Find tokens expiring within 2 hours                                 │
│     ├── Call provider's token endpoint with refresh_token                   │
│     ├── Update Key Vault with new tokens                                    │
│     └── If refresh fails → notify admin                                     │
│                    │                                                        │
│                    ▼                                                        │
│  5. RE-AUTHORIZATION (When refresh fails)                                   │
│     ├── Mark integration as "needs_reauth"                                  │
│     ├── Notify tenant admin                                                 │
│     └── User must complete OAuth flow again                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Refresh Implementation

```typescript
interface TokenRefreshResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
}

async function refreshOAuthToken(
  providerId: string,
  currentTokens: OAuthTokens
): Promise<TokenRefreshResult> {
  const provider = await getProvider(providerId);
  
  const response = await fetch(provider.authConfig.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: currentTokens.refresh_token,
      client_id: provider.authConfig.clientId,
      client_secret: await getProviderSecret(providerId, 'client_secret')
    })
  });
  
  if (!response.ok) {
    return {
      success: false,
      error: `Token refresh failed: ${response.status}`
    };
  }
  
  const newTokens = await response.json();
  
  return {
    success: true,
    tokens: {
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || currentTokens.refresh_token,
      expires_at: calculateExpiry(newTokens.expires_in),
      token_type: newTokens.token_type,
      scope: newTokens.scope,
      instance_url: currentTokens.instance_url
    }
  };
}
```

---

## Access Policies

### Managed Identity Access

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KEY VAULT ACCESS POLICIES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  func-sync-{env} (Managed Identity)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Secrets:                                                            │   │
│  │  ├── GET: tenant-*-*-oauth                                           │   │
│  │  ├── GET: tenant-*-*-apikey                                          │   │
│  │  ├── GET: tenant-*-*-serviceaccount                                  │   │
│  │  ├── SET: tenant-*-*-oauth (for token refresh)                       │   │
│  │  └── GET: system-servicebus-sync-connection                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  func-embedding-{env} (Managed Identity)                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Secrets:                                                            │   │
│  │  ├── GET: system-azure-openai-*                                      │   │
│  │  └── GET: system-servicebus-embedding-connection                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  func-contentgen-{env} (Managed Identity)                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Secrets:                                                            │   │
│  │  ├── GET: system-azure-openai-*                                      │   │
│  │  ├── GET: tenant-*-openai-apikey                                     │   │
│  │  ├── GET: tenant-*-anthropic-apikey                                  │   │
│  │  └── GET: system-servicebus-contentgen-connection                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Core API (Managed Identity)                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Secrets:                                                            │   │
│  │  ├── GET: system-*                                                   │   │
│  │  ├── SET: tenant-*-* (when admin configures integration)             │   │
│  │  ├── DELETE: tenant-*-* (when integration removed)                   │   │
│  │  └── LIST: tenant-{tenantId}-* (for tenant's integrations only)      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Super Admin (Azure AD)                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Full access for emergency operations                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Access Policy ARM Template

```json
{
  "type": "Microsoft.KeyVault/vaults/accessPolicies",
  "name": "[concat(parameters('keyVaultName'), '/add')]",
  "properties": {
    "accessPolicies": [
      {
        "tenantId": "[subscription().tenantId]",
        "objectId": "[reference(resourceId('Microsoft.Web/sites', 'func-sync-prod'), '2021-02-01', 'Full').identity.principalId]",
        "permissions": {
          "secrets": ["get", "set", "list"]
        }
      }
    ]
  }
}
```

---

## Credential Service

### Interface

```typescript
interface CredentialService {
  // Store credentials
  storeCredentials(
    tenantId: string,
    provider: string,
    type: CredentialType,
    credentials: Record<string, any>
  ): Promise<string>;
  
  // Retrieve credentials
  getCredentials(
    tenantId: string,
    provider: string,
    type: CredentialType
  ): Promise<Record<string, any>>;
  
  // Delete credentials
  deleteCredentials(
    tenantId: string,
    provider: string,
    type: CredentialType
  ): Promise<void>;
  
  // Update OAuth tokens
  updateOAuthTokens(
    tenantId: string,
    provider: string,
    tokens: OAuthTokens
  ): Promise<void>;
  
  // Check token expiration
  isTokenExpired(
    tenantId: string,
    provider: string
  ): Promise<boolean>;
  
  // Get tokens expiring soon
  getExpiringTokens(
    withinMs: number
  ): Promise<ExpiringToken[]>;
}

type CredentialType = 'oauth' | 'apikey' | 'serviceaccount' | 'basic';
```

### Implementation

```typescript
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

class AzureCredentialService implements CredentialService {
  private client: SecretClient;
  
  constructor(keyVaultUrl: string) {
    this.client = new SecretClient(
      keyVaultUrl,
      new DefaultAzureCredential()
    );
  }
  
  private getSecretName(
    tenantId: string,
    provider: string,
    type: CredentialType
  ): string {
    return `tenant-${tenantId}-${provider}-${type}`;
  }
  
  async storeCredentials(
    tenantId: string,
    provider: string,
    type: CredentialType,
    credentials: Record<string, any>
  ): Promise<string> {
    const secretName = this.getSecretName(tenantId, provider, type);
    const secretValue = JSON.stringify(credentials);
    
    const result = await this.client.setSecret(secretName, secretValue, {
      tags: {
        tenantId,
        provider,
        type,
        updatedAt: new Date().toISOString()
      }
    });
    
    return result.name;
  }
  
  async getCredentials(
    tenantId: string,
    provider: string,
    type: CredentialType
  ): Promise<Record<string, any>> {
    const secretName = this.getSecretName(tenantId, provider, type);
    
    try {
      const secret = await this.client.getSecret(secretName);
      return JSON.parse(secret.value!);
    } catch (error) {
      if (error.code === 'SecretNotFound') {
        throw new Error(`Credentials not found: ${secretName}`);
      }
      throw error;
    }
  }
  
  async updateOAuthTokens(
    tenantId: string,
    provider: string,
    tokens: OAuthTokens
  ): Promise<void> {
    await this.storeCredentials(tenantId, provider, 'oauth', tokens);
  }
  
  async isTokenExpired(
    tenantId: string,
    provider: string
  ): Promise<boolean> {
    const credentials = await this.getCredentials(tenantId, provider, 'oauth');
    const expiresAt = new Date(credentials.expires_at);
    return expiresAt <= new Date();
  }
  
  async getExpiringTokens(withinMs: number): Promise<ExpiringToken[]> {
    const expiring: ExpiringToken[] = [];
    const threshold = new Date(Date.now() + withinMs);
    
    // List all secrets with oauth type
    for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
      if (secretProperties.tags?.type === 'oauth') {
        const secret = await this.client.getSecret(secretProperties.name);
        const credentials = JSON.parse(secret.value!);
        
        if (new Date(credentials.expires_at) <= threshold) {
          expiring.push({
            secretName: secretProperties.name,
            tenantId: secretProperties.tags.tenantId,
            provider: secretProperties.tags.provider,
            expiresAt: credentials.expires_at
          });
        }
      }
    }
    
    return expiring;
  }
}
```

---

## Security Best Practices

### 1. Never Log Credentials

```typescript
// ❌ BAD
console.log(`Token: ${credentials.access_token}`);

// ✅ GOOD
console.log(`Token retrieved for integration: ${integrationId}`);
```

### 2. Short-Lived Access

```typescript
// Retrieve credentials just before use, don't cache
async function executeWithCredentials(
  integrationId: string,
  tenantId: string,
  operation: (creds: Credentials) => Promise<void>
): Promise<void> {
  const credentials = await credentialService.getCredentials(
    tenantId,
    integrationId
  );
  
  try {
    await operation(credentials);
  } finally {
    // Credentials go out of scope immediately
  }
}
```

### 3. Tenant Isolation

```typescript
// Always validate tenantId
async function getIntegrationCredentials(
  tenantId: string,
  integrationId: string
): Promise<Credentials> {
  // Load integration
  const integration = await getIntegration(integrationId, tenantId);
  
  // Verify tenant ownership
  if (integration.tenantId !== tenantId) {
    throw new SecurityError('Tenant mismatch');
  }
  
  // Get credentials
  return credentialService.getCredentials(
    tenantId,
    integration.structuredData.providerName,
    'oauth'
  );
}
```

### 4. Audit Logging

```typescript
// Log all credential access
async function auditCredentialAccess(
  tenantId: string,
  provider: string,
  action: 'read' | 'write' | 'delete',
  actorId: string
): Promise<void> {
  await auditLog.log({
    eventType: 'credential_access',
    tenantId,
    provider,
    action,
    actorId,
    timestamp: new Date().toISOString(),
    ipAddress: getCurrentIP()
  });
}
```

### 5. Encryption at Rest

Key Vault automatically encrypts all secrets. Additional recommendations:
- Enable soft-delete
- Enable purge protection
- Use HSM-backed keys for highest security

---

## Credential Management Permissions

### Tenant Admin Permissions

Tenant admins can change credentials for their tenant integrations:

- **Scope**: Only their tenant's integration instances
- **Process**:
  1. Update credentials in Azure Key Vault (create new secret version)
  2. Update `credentialSecretName` reference in `integrations` container (if secret name changed)
  3. Test connection to verify new credentials work
  4. Audit log entry created: `integration.credentials.updated`
  5. Notification sent to tenant admins (if configured)

**Example:**
```typescript
// Update OAuth credentials
const newSecretName = `tenant-${tenantId}-${providerName}-${instanceId}-oauth-v2`;
await keyVaultClient.setSecret(newSecretName, {
  access_token: newAccessToken,
  refresh_token: newRefreshToken,
  expires_at: expiresAt
});

// Update integration document
await integrationRepository.update(integrationId, tenantId, {
  credentialSecretName: newSecretName,
  updatedAt: new Date()
});

// Test connection
await testConnection(integrationId, tenantId);

// Send notification
await notificationService.createSystemNotification({
  tenantId,
  targetType: 'all_tenant',
  type: 'information',
  name: 'Integration Credentials Updated',
  content: `Credentials for ${integration.name} have been updated successfully.`,
  link: `/integrations/${integrationId}/credentials`,
  metadata: {
    source: 'integration_system',
    relatedId: integrationId
  }
});
```

### Super Admin Permissions

Super admins can change system-level integration credentials only:

- **Scope**: System-level connections (`scope: 'system'` in `integration-connections`)
- **Process**:
  1. Update credentials in Azure Key Vault
  2. Update connection document in `integration-connections` container
  3. Test connection
  4. Audit log entry created
  5. Notifications sent to affected tenants (if any)

**Example:**
```typescript
// Update system-level credentials
const systemSecretName = `system-${providerName}-oauth`;
await keyVaultClient.setSecret(systemSecretName, newCredentials);

// Update connection document
await connectionRepository.update(connectionId, {
  status: 'active',
  lastValidatedAt: new Date(),
  updatedAt: new Date()
});
```

### Credential Change Process

1. **Initiate Change**: Admin initiates credential update via UI or API
2. **Validate Permissions**: System validates admin has permission for the scope
3. **Update Key Vault**: Create new secret or update existing secret in Key Vault
4. **Update Reference**: Update `credentialSecretName` in `integrations` container (if name changed)
5. **Test Connection**: Automatically test connection with new credentials
6. **Update Status**: Update connection status based on test result
7. **Audit Log**: Create audit log entry
8. **Notify**: Send notification to tenant admins (if test fails or credentials expire)

### Audit Logging

All credential changes are audited:

```typescript
{
  eventType: 'integration.credentials.updated',
  actor: {
    type: 'tenant_admin',
    userId: userId,
    tenantId: tenantId
  },
  target: {
    type: 'connection',
    integrationId: integrationId
  },
  action: {
    operation: 'update',
    field: 'credentialSecretName',
    oldValue: oldSecretName,
    newValue: newSecretName
  },
  result: {
    success: true
  },
  metadata: {
    secretVersion: newSecretVersion,
    testResult: 'success'
  }
}
```

---

## Rotation & Expiration

### API Key Rotation

```typescript
async function rotateApiKey(
  tenantId: string,
  provider: string
): Promise<void> {
  // 1. Generate new key via provider API
  const adapter = getAdapter(provider);
  const newKey = await adapter.regenerateApiKey();
  
  // 2. Test new key
  const testResult = await adapter.testConnection(newKey);
  if (!testResult.success) {
    throw new Error('New key validation failed');
  }
  
  // 3. Store new key
  await credentialService.storeCredentials(
    tenantId,
    provider,
    'apikey',
    { api_key: newKey, rotated_at: new Date().toISOString() }
  );
  
  // 4. Log rotation
  await auditCredentialAccess(tenantId, provider, 'write', 'system-rotation');
}
```

### Expiration Monitoring

```typescript
// Alert on upcoming expirations
async function checkExpirations(): Promise<void> {
  // Check for tokens expiring in 24 hours
  const expiring = await credentialService.getExpiringTokens(24 * 60 * 60 * 1000);
  
  for (const token of expiring) {
    // Try to refresh
    const result = await refreshOAuthToken(token.provider, token.tenantId);
    
    if (!result.success) {
      // Alert tenant admin
      await notifyTenantAdmin(token.tenantId, {
        type: 'INTEGRATION_AUTH_EXPIRING',
        provider: token.provider,
        expiresAt: token.expiresAt,
        message: 'Please re-authenticate this integration'
      });
    }
  }
}
```

---

**Last Updated**: November 2025  
**Version**: 1.0.0

