# Configuration Management Guide

## Overview

The Castiel platform uses a centralized configuration management system via `ConfigurationService` to ensure:
- Consistent configuration access patterns
- Validation of configuration values
- Type safety and documentation
- Environment-specific defaults
- Secret management integration

## Architecture

### Components

1. **ConfigurationService** (`apps/api/src/services/configuration.service.ts`)
   - Centralized configuration management
   - Schema-based validation
   - Environment-specific configs
   - Secret management integration

2. **Config Helper** (`apps/api/src/config/config-helper.ts`)
   - Utility functions for easy config access
   - Automatic fallback to `process.env`
   - Server decoration access helpers

3. **Config Schema** (`apps/api/src/services/configuration.service.ts`)
   - Defines all configuration keys
   - Validation rules
   - Default values
   - Impact descriptions

## Usage Patterns

### Pattern 1: Using Config Helper (Recommended)

```typescript
import { getConfigValue, getRequiredConfigValue } from '../config/config-helper.js';

// Get optional config with default
const port = getConfigValue('port', 3001);

// Get required config (throws if missing)
const endpoint = getRequiredConfigValue('cosmosDb.endpoint');

// Nested keys supported
const shardsContainer = getConfigValue('cosmosDb.containers.shards', 'shards');
```

### Pattern 2: Using ConfigurationService Directly

```typescript
// In route handlers or services with server access
const configurationService = (server as any).configurationService;
if (configurationService) {
  const endpoint = configurationService.getValue('cosmosDb.endpoint', 'default');
  const requiredKey = configurationService.getRequiredValue('cosmosDb.key');
}
```

### Pattern 3: Using Config Helper with Server

```typescript
import { getConfigurationServiceFromServer } from '../config/config-helper.js';

const configService = getConfigurationServiceFromServer(server);
if (configService) {
  const value = configService.getValue('some.key', 'default');
}
```

## Migration Guide

### Before (Direct process.env access)

```typescript
// ❌ Don't do this
const endpoint = process.env.COSMOS_DB_ENDPOINT || 'default';
const apiKey = process.env.AZURE_OPENAI_API_KEY;
```

### After (Using Config Helper)

```typescript
// ✅ Do this
import { getConfigValue, getRequiredConfigValue } from '../config/config-helper.js';

const endpoint = getConfigValue('cosmosDb.endpoint', 'default');
const apiKey = getRequiredConfigValue('ai.azureOpenAI.apiKey');
```

### After (Using ConfigurationService from Server)

```typescript
// ✅ Or this (in route handlers)
const configurationService = (server as any).configurationService;
const endpoint = configurationService
  ? configurationService.getValue('cosmosDb.endpoint', 'default')
  : process.env.COSMOS_DB_ENDPOINT || 'default';
```

## Configuration Keys

### Database Configuration

- `cosmosDb.endpoint` - Cosmos DB endpoint URL
- `cosmosDb.key` - Cosmos DB access key (secret)
- `cosmosDb.databaseId` - Database ID
- `cosmosDb.containers.shards` - Shards container name
- `cosmosDb.containers.users` - Users container name
- ... (see schema for full list)

### AI Configuration

- `ai.azureOpenAI.endpoint` - Azure OpenAI endpoint
- `ai.azureOpenAI.apiKey` - Azure OpenAI API key (secret)
- `ai.azureOpenAI.deploymentName` - Deployment name

### Server Configuration

- `port` - Server port (default: 3001)
- `host` - Server host (default: '0.0.0.0')
- `nodeEnv` - Environment ('development' | 'staging' | 'production')
- `logLevel` - Logging level

## Benefits

1. **Validation**: Configuration values are validated against schema
2. **Type Safety**: TypeScript types ensure correct usage
3. **Documentation**: Schema includes descriptions and impact statements
4. **Consistency**: Single source of truth for configuration
5. **Fallback**: Graceful fallback to `process.env` if service unavailable
6. **Secret Management**: Integration with Azure Key Vault for secrets

## Best Practices

1. **Use Config Helper**: Prefer `getConfigValue()` and `getRequiredConfigValue()` for simple access
2. **Provide Defaults**: Always provide sensible defaults for optional configs
3. **Use Required for Critical**: Use `getRequiredConfigValue()` for critical configs that must exist
4. **Document New Keys**: When adding new config keys, add them to the schema
5. **Test Fallbacks**: Ensure code works if ConfigurationService is unavailable

## Adding New Configuration Keys

1. Add entry to `CONFIG_SCHEMA` in `configuration.service.ts`:

```typescript
{
  key: 'myService.apiKey',
  envVar: 'MY_SERVICE_API_KEY',
  rule: {
    type: 'string',
    required: true,
    description: 'API key for My Service',
    impact: 'My Service features will be unavailable if invalid',
  },
  category: ConfigCategory.INTEGRATION,
  secret: true, // If it's a secret
}
```

2. Use the key in your code:

```typescript
const apiKey = getRequiredConfigValue('myService.apiKey');
```

## Troubleshooting

### Configuration Not Found

If you get "Configuration not loaded" errors:
1. Ensure `ConfigurationService` is initialized in `routes/index.ts`
2. Check that `loadConfig()` was called
3. Verify the config key exists in the schema

### Fallback to process.env

If ConfigurationService is unavailable, the helper functions automatically fall back to `process.env`. This ensures backward compatibility but bypasses validation.

### Validation Errors

Configuration validation errors are logged during startup. Check logs for:
- Missing required configuration
- Invalid types or formats
- Out-of-range values

## See Also

- `apps/api/src/services/configuration.service.ts` - Service implementation
- `apps/api/src/config/config-helper.ts` - Helper functions
- `apps/api/src/config/env.ts` - Legacy config loader (still used internally)
