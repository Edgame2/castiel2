# Configuration Management

## Overview

The Castiel platform uses a centralized configuration management system through `ConfigurationService`. This ensures:
- Consistent configuration access across all services
- Schema-based validation
- Environment-specific configurations
- Secret management integration

## Usage

### Using ConfigurationService

Services should use `ConfigurationService` instead of direct `process.env` access:

```typescript
// ❌ Bad: Direct process.env access
const apiKey = process.env.AZURE_OPENAI_API_KEY;

// ✅ Good: Using ConfigurationService
const config = this.configurationService.getConfig();
const apiKey = config.ai?.azureOpenAI?.apiKey;
```

### Using Configuration Helper

For services that don't have direct access to ConfigurationService, use the helper:

```typescript
import { getConfigValue, getRequiredConfigValue } from '../config/config-helper.js';

// Get optional config value with default
const apiKey = getConfigValue('ai.azureOpenAI.apiKey', 'default-key');

// Get required config value (throws if missing)
const endpoint = getRequiredConfigValue('cosmosDb.endpoint');
```

## Migration Guide

1. Identify direct `process.env` usage in services
2. Replace with `getConfigValue()` or `getRequiredConfigValue()` from config-helper
3. Update service constructors to accept ConfigurationService if needed
4. Test configuration loading and validation

## Configuration Schema

All configuration keys are defined in `ConfigurationService` with:
- Type validation
- Required/optional flags
- Default values
- Environment variable mapping
- Impact descriptions

## Environment Variables

Configuration values are loaded from environment variables following the naming convention:
- Nested keys use underscores: `cosmosDb.endpoint` → `COSMOS_DB_ENDPOINT`
- All uppercase
- Underscores replace dots

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ⚠️ **Partial** - Configuration management partially implemented

#### Implemented Features (✅)

- ✅ ConfigurationService created
- ✅ Configuration helper functions
- ✅ Schema-based validation
- ✅ Environment variable mapping

#### Known Limitations

- ⚠️ **Migration Incomplete** - Not all services use ConfigurationService
  - **Code Reference:**
    - Services may still use direct `process.env` access
  - **Recommendation:**
    1. Complete migration to ConfigurationService
    2. Remove direct `process.env` usage
    3. Add validation for all configuration values

- ⚠️ **Configuration Scattering** - Configuration may be scattered across files
  - **Recommendation:**
    1. Centralize all configuration
    2. Document all configuration options
    3. Create configuration reference guide

### Code References

- **Backend Services:**
  - `apps/api/src/services/configuration.service.ts` - Configuration service
  - `apps/api/src/config/config-helper.ts` - Configuration helper

### Related Documentation

- [Gap Analysis](../GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Environment Variables](../development/ENVIRONMENT_VARIABLES.md) - Environment variable reference
- [Backend Documentation](../backend/README.md) - Backend implementation
