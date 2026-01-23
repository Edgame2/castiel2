# Secret Management Module - Migration Guide

**For:** Upgrading from pre-compliance to compliance version  
**Date:** 2026-01-22

---

## Overview

This guide helps you migrate the Secret Management module to the new compliance-compliant version that follows ModuleImplementationGuide.md standards.

---

## Breaking Changes

**None** - All changes are backward compatible. The module will continue to work with existing environment variables.

---

## Migration Steps

### Step 1: Backup Current Configuration

```bash
# Backup any existing configuration
cp -r containers/secret-management/config containers/secret-management/config.backup
```

### Step 2: Install New Dependencies

```bash
cd containers/secret-management
npm install
```

This will install:
- `js-yaml` - YAML config parsing
- `ajv` - Schema validation
- `@fastify/swagger` - OpenAPI generation
- `@fastify/swagger-ui` - Interactive API docs
- `zod-to-json-schema` - Schema conversion
- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting

### Step 3: Verify Environment Variables

Your existing environment variables will continue to work. Verify they are set:

```bash
# Required
export SECRET_MASTER_KEY="your-64-char-hex-key"
export SERVICE_AUTH_TOKEN="your-token"
export DATABASE_URL="postgresql://..."

# Optional (will use defaults from config/default.yaml if not set)
export PORT="3003"
export RABBITMQ_URL="amqp://..."
export LOGGING_SERVICE_URL="http://..."
```

### Step 4: Test Configuration Loading

```bash
# Start server - should load config successfully
npm run dev

# Check logs for:
# - "Secret Management Service listening on port..."
# - "OpenAPI specification exported to..."
```

### Step 5: Verify API Documentation

1. Start the server
2. Visit `http://localhost:3003/docs` for interactive API docs
3. Check that `docs/openapi.yaml` was created

### Step 6: Run Tests

```bash
# Run tests to verify everything works
npm test
```

---

## Configuration Changes

### Before (Environment Variables Only)

```bash
# All configuration via environment variables
export PORT=3003
export LOGGING_SERVICE_URL=http://localhost:3014
# ... etc
```

### After (YAML + Environment Variables)

**New:** Configuration files in `config/` directory:
- `config/default.yaml` - Default settings
- `config/production.yaml` - Production overrides
- `config/test.yaml` - Test environment

**Still Works:** Environment variables override YAML values:

```yaml
# config/default.yaml
server:
  port: ${PORT:-3003}  # Uses env var if set, otherwise 3003
```

**Priority:** Environment variables > YAML files > Hardcoded defaults

---

## What Changed

### Configuration Loading

**Before:**
```typescript
// Direct environment variable access
const port = parseInt(process.env.PORT || '3003', 10);
const loggingUrl = process.env.LOGGING_SERVICE_URL || 'http://localhost:3014';
```

**After:**
```typescript
// Config from YAML files with validation
const config = getConfig();
const port = config.server.port;
const loggingUrl = config.services.logging?.url;
```

### Service URLs

**Before:**
- Hardcoded `http://localhost:3014` in 3 locations

**After:**
- All URLs from `config/default.yaml`
- No hardcoded values

### API Documentation

**Before:**
- No API documentation

**After:**
- OpenAPI 3.0.3 specification
- Interactive docs at `/docs`
- Auto-generated from route schemas

---

## Rollback Plan

If you need to rollback:

1. **Restore old config approach:**
   ```bash
   git checkout HEAD~1 -- src/config/index.ts
   ```

2. **Remove new dependencies:**
   ```bash
   npm uninstall js-yaml ajv @fastify/swagger @fastify/swagger-ui zod-to-json-schema vitest @vitest/coverage-v8 @types/js-yaml
   ```

3. **Restore hardcoded URLs** (if needed):
   - `src/services/logging/LoggingClient.ts`
   - `src/services/health/HealthService.ts`

---

## Verification Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] Configuration loads from YAML files
- [ ] Environment variables still override YAML
- [ ] No hardcoded URLs in code
- [ ] OpenAPI spec generated at `docs/openapi.yaml`
- [ ] Interactive docs available at `/docs`
- [ ] Tests pass: `npm test`
- [ ] Health endpoint works: `GET /health`
- [ ] API endpoints respond correctly

---

## Troubleshooting

### Config Loading Fails

**Error:** `Failed to load default config`

**Solution:**
- Verify `config/default.yaml` exists
- Check file permissions
- Verify YAML syntax is valid

### Schema Validation Fails

**Error:** `Invalid config: ...`

**Solution:**
- Check that all required environment variables are set
- Review `config/schema.json` for required fields
- Check YAML file syntax

### OpenAPI Export Fails

**Warning:** `Failed to export OpenAPI spec`

**Solution:**
- Non-critical - server will still start
- Check `docs/` directory permissions
- Verify `@fastify/swagger` is installed

### Tests Fail

**Error:** Test failures

**Solution:**
- Ensure all dependencies installed: `npm install`
- Check that test environment variables are set
- Verify `vitest.config.ts` is correct

---

## Support

For issues or questions:
1. Review [COMPLIANCE_SUMMARY.md](./documentation/modules/microservices/secret-management/COMPLIANCE_SUMMARY.md)
2. Check [QUICK_START.md](./documentation/modules/microservices/secret-management/QUICK_START.md)
3. Review [README.md](./README.md)

---

**Migration Guide Version:** 1.0  
**Last Updated:** 2026-01-22



