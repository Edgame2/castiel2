# Secret Management Module - Quick Start Guide

**For Developers and Operators**

---

## Quick Setup

### 1. Install Dependencies

```bash
cd containers/secret-management
npm install
```

### 2. Configure Environment

```bash
# Generate master key (64 hex characters)
export SECRET_MASTER_KEY=$(openssl rand -hex 32)

# Set required environment variables
export SERVICE_AUTH_TOKEN="your-service-token"
export COSMOS_DB_CONNECTION_STRING="AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;"
```

### 3. Start Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Verify

- Service should start on port 3003 (or configured port)
- Check logs for "OpenAPI specification exported to docs/openapi.yaml"
- Visit `http://localhost:3003/docs` for interactive API docs
- Visit `http://localhost:3003/health` for health check

---

## Configuration Files

All configuration is in `config/` directory:

- `config/default.yaml` - Default settings
- `config/production.yaml` - Production overrides
- `config/test.yaml` - Test environment

**Configuration Priority:**
1. Environment variables (highest)
2. Environment-specific YAML (`production.yaml`, `test.yaml`)
3. Default YAML (`default.yaml`)

---

## Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:int

# With coverage
npm run test:coverage
```

---

## API Documentation

- **Interactive Docs**: `http://localhost:3003/docs`
- **OpenAPI Spec**: `docs/openapi.yaml` (auto-generated)

---

## Common Issues

### Config Loading Fails

**Error:** `Failed to load default config`

**Solution:** Ensure `config/default.yaml` exists and is valid YAML

### Schema Validation Fails

**Error:** `Invalid config: ...`

**Solution:** Check that all required fields are set in environment variables or config files

### OpenAPI Export Fails

**Warning:** `Failed to export OpenAPI spec`

**Solution:** Check that `docs/` directory is writable. This is non-critical and won't prevent server startup.

---

## Next Steps

1. Review [COMPLIANCE_SUMMARY.md](./COMPLIANCE_SUMMARY.md) for full compliance status
2. Review [COMPLIANCE_PLAN.md](./COMPLIANCE_PLAN.md) for implementation details
3. See [README.md](../../../containers/secret-management/README.md) for complete documentation


