# @castiel/key-vault

Azure Key Vault integration for secure secret management with in-memory caching and graceful fallback to environment variables for local development.

## Features

- **Secure Secret Retrieval**: Retrieve secrets from Azure Key Vault using Managed Identity or Service Principal
- **In-Memory Caching**: Cache secrets for configurable TTL (default: 5 minutes) to reduce Key Vault calls
- **Graceful Fallback**: Fall back to environment variables in local development when Key Vault is unavailable
- **TypeScript Support**: Full TypeScript types for all secrets and configurations
- **Health Checks**: Built-in connectivity checks for monitoring
- **Batch Operations**: Retrieve multiple secrets in parallel

## Installation

```bash
pnpm add @castiel/key-vault
```

## Usage

### Basic Setup

```typescript
import { KeyVaultService, SecretName } from '@castiel/key-vault';

// In production (using Managed Identity)
const keyVault = new KeyVaultService({
  vaultUrl: 'https://my-vault.vault.azure.net/',
  useManagedIdentity: true,
  cacheTTL: 300000, // 5 minutes
  enableFallback: false,
});

// In development (using Service Principal)
const keyVault = new KeyVaultService({
  vaultUrl: process.env.KEY_VAULT_URL!,
  useManagedIdentity: false,
  servicePrincipal: {
    tenantId: process.env.AZURE_TENANT_ID!,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
  cacheTTL: 300000,
  enableFallback: true, // Fall back to env vars
});
```

### Retrieving Secrets

```typescript
// Get a single secret
const result = await keyVault.getSecret(SecretName.REDIS_PRIMARY_CONNECTION_STRING);
console.log(result.value); // The secret value
console.log(result.fromCache); // Whether retrieved from cache
console.log(result.fromFallback); // Whether retrieved from env var

// Get secret with custom fallback
const sendgridKey = await keyVault.getSecret(
  SecretName.SENDGRID_API_KEY,
  {
    fallbackEnvVar: 'SENDGRID_KEY', // Custom env var name
    required: true, // Throw if not found
  }
);

// Get multiple secrets in parallel
const secrets = await keyVault.getSecrets([
  SecretName.REDIS_PRIMARY_CONNECTION_STRING,
  SecretName.COSMOS_DB_PRIMARY_KEY,
  SecretName.JWT_ACCESS_SECRET,
]);

const redisConnectionString = secrets.get(SecretName.REDIS_PRIMARY_CONNECTION_STRING)?.value;
```

### Cache Management

```typescript
// Invalidate a specific secret (forces fresh retrieval)
keyVault.invalidateSecret(SecretName.REDIS_PRIMARY_CONNECTION_STRING);

// Clear all cached secrets
keyVault.clearCache();

// Get cache statistics
const stats = keyVault.getCacheStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Cached secrets: ${stats.entries.join(', ')}`);
```

### Health Checks

```typescript
const isHealthy = await keyVault.healthCheck();
if (!isHealthy) {
  console.error('Key Vault is not accessible');
}
```

## Standard Secret Names

The package provides a `SecretName` enum with standard secret names:

### Redis
- `REDIS_PRIMARY_CONNECTION_STRING`
- `REDIS_SECONDARY_CONNECTION_STRING`

### Cosmos DB
- `COSMOS_DB_PRIMARY_KEY`
- `COSMOS_DB_SECONDARY_KEY`
- `COSMOS_DB_ENDPOINT`

### Azure AD B2C
- `AZURE_AD_B2C_CLIENT_SECRET`
- `AZURE_AD_B2C_TENANT_NAME`
- `AZURE_AD_B2C_CLIENT_ID`

### SendGrid
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

### JWT
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### OAuth Providers
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### Application Insights
- `APP_INSIGHTS_CONNECTION_STRING`
- `APP_INSIGHTS_INSTRUMENTATION_KEY`

### SAML (Enterprise SSO)
- `SAML_CERTIFICATE`
- `SAML_PRIVATE_KEY`

## Configuration

### KeyVaultConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `vaultUrl` | `string` | Required | The URL of your Azure Key Vault |
| `useManagedIdentity` | `boolean` | `true` in production | Use Managed Identity for authentication |
| `servicePrincipal` | `object` | `undefined` | Service Principal credentials for local dev |
| `cacheTTL` | `number` | `300000` (5 min) | Cache TTL in milliseconds |
| `enableFallback` | `boolean` | `true` in dev | Fall back to environment variables |

### GetSecretOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `bypassCache` | `boolean` | `false` | Skip cache and fetch fresh from Key Vault |
| `fallbackEnvVar` | `string` | `undefined` | Custom environment variable for fallback |
| `required` | `boolean` | `true` | Throw error if secret not found |

## Local Development

For local development, the service can fall back to environment variables. The mapping is:

- Secret name: `redis-primary-connection-string`
- Env var name: `REDIS_PRIMARY_CONNECTION_STRING`

You can also specify custom fallback environment variable names:

```typescript
const secret = await keyVault.getSecret(
  SecretName.SENDGRID_API_KEY,
  { fallbackEnvVar: 'MY_CUSTOM_SENDGRID_KEY' }
);
```

## Security Best Practices

1. **Use Managed Identity in Production**: Never store credentials in code or config files
2. **Short Cache TTL**: Keep cache TTL short (5 minutes) to ensure secrets can be rotated quickly
3. **Disable Fallback in Production**: Set `enableFallback: false` to prevent accidental use of env vars
4. **Monitor Secret Access**: Use Azure Monitor to track Key Vault access patterns
5. **Regular Secret Rotation**: Implement 90-day rotation policies for all secrets
6. **Least Privilege**: Grant only necessary Key Vault permissions to each service

## Error Handling

```typescript
try {
  const secret = await keyVault.getSecret(SecretName.REDIS_PRIMARY_CONNECTION_STRING);
  console.log('Secret retrieved:', secret.value);
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to retrieve secret:', error.message);
  }
  // Handle error appropriately (retry, alert, fallback, etc.)
}
```

## Integration with Services

### Main API Example

```typescript
import { KeyVaultService, SecretName } from '@castiel/key-vault';

// Initialize Key Vault service
const keyVault = new KeyVaultService({
  vaultUrl: process.env.KEY_VAULT_URL!,
  useManagedIdentity: process.env.NODE_ENV === 'production',
  enableFallback: process.env.NODE_ENV !== 'production',
});

// Retrieve secrets for main-api
const secrets = await keyVault.getSecrets([
  SecretName.REDIS_PRIMARY_CONNECTION_STRING,
  SecretName.AZURE_AD_B2C_CLIENT_SECRET,
  SecretName.JWT_ACCESS_SECRET,
  SecretName.SENDGRID_API_KEY,
]);

const config = {
  redis: {
    connectionString: secrets.get(SecretName.REDIS_PRIMARY_CONNECTION_STRING)!.value,
  },
  azureAdB2C: {
    clientSecret: secrets.get(SecretName.AZURE_AD_B2C_CLIENT_SECRET)!.value,
  },
  jwt: {
    secret: secrets.get(SecretName.JWT_ACCESS_SECRET)!.value,
  },
  sendgrid: {
    apiKey: secrets.get(SecretName.SENDGRID_API_KEY)!.value,
  },
};
```

## Monitoring

```typescript
// Add health check endpoint
app.get('/health/keyvault', async (req, res) => {
  const isHealthy = await keyVault.healthCheck();
  res.status(isHealthy ? 200 : 503).json({
    service: 'key-vault',
    status: isHealthy ? 'healthy' : 'unhealthy',
    cache: keyVault.getCacheStats(),
  });
});
```

## License

MIT
