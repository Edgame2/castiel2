# Secret Management Module - Compliance Plan

**Date:** 2026-01-22  
**Status:** Planning  
**Goal:** Align Secret Management module with ModuleImplementationGuide.md standards

---

## Executive Summary

The Secret Management module has a solid implementation but needs alignment with the Module Implementation Guide standards. This plan identifies gaps and provides a roadmap for compliance.

**Current Status:**
- ✅ Core functionality: Complete
- ✅ Database schema: Complete
- ✅ API endpoints: Complete
- ⚠️ Configuration: Needs YAML config files
- ⚠️ Documentation: Missing OpenAPI spec and CHANGELOG
- ⚠️ Hardcoded values: Found in config and services

---

## Compliance Gap Analysis

### 1. Configuration Standards (Section 4) ❌ **CRITICAL**

#### Current State
- Configuration loaded only from environment variables
- No YAML configuration files
- No config schema validation
- Hardcoded defaults: `localhost:3014`, port `3003`

#### Required Changes
- [ ] Create `config/default.yaml` with all default settings
- [ ] Create `config/schema.json` for validation
- [ ] Create `config/production.yaml` for production overrides
- [ ] Create `config/test.yaml` for test settings
- [ ] Implement config loader following ModuleImplementationGuide pattern
- [ ] Remove hardcoded URLs and ports
- [ ] Use config-driven service URLs

#### Files to Create/Modify
```
containers/secret-management/
├── config/
│   ├── default.yaml          # NEW
│   ├── production.yaml        # NEW
│   ├── test.yaml             # NEW
│   └── schema.json           # NEW
└── src/config/
    └── index.ts              # MODIFY - Add YAML loading
```

---

### 2. Module Structure (Section 3) ⚠️ **HIGH PRIORITY**

#### Current State
- ✅ Has `Dockerfile`
- ✅ Has `package.json`
- ✅ Has `README.md`
- ❌ Missing `CHANGELOG.md`
- ❌ Missing `config/` directory with YAML files
- ❌ Missing `docs/` directory with OpenAPI spec

#### Required Changes
- [ ] Create `CHANGELOG.md` with version history
- [ ] Create `docs/` directory
- [ ] Create `docs/openapi.yaml` (see API Standards)
- [ ] Create `docs/architecture.md` (optional but recommended)

#### Files to Create
```
containers/secret-management/
├── CHANGELOG.md              # NEW
└── docs/
    ├── openapi.yaml          # NEW
    └── architecture.md       # NEW (optional)
```

---

### 3. API Standards (Section 7) ❌ **CRITICAL**

#### Current State
- ✅ Routes use `/api/secrets` prefix
- ✅ Input validation with Zod
- ❌ No OpenAPI specification
- ⚠️ Response format needs verification

#### Required Changes
- [ ] Create `docs/openapi.yaml` with full API specification
- [ ] Document all 33+ endpoints
- [ ] Include request/response schemas
- [ ] Document authentication requirements
- [ ] Document error responses
- [ ] Verify response format matches standard (`{ data: ... }` or `{ error: ... }`)

#### Files to Create
```
containers/secret-management/
└── docs/
    └── openapi.yaml          # NEW - Complete API spec
```

---

### 4. Hardcoded Values (Section 4.3) ❌ **CRITICAL**

#### Found Issues
1. **`src/config/index.ts:51`**: `port: parseInt(process.env.PORT || '3003', 10)`
   - ✅ Acceptable: Default port with env override
   
2. **`src/config/index.ts:67`**: `serviceUrl: process.env.LOGGING_SERVICE_URL || 'http://localhost:3014'`
   - ❌ **VIOLATION**: Hardcoded URL
   - **Fix**: Move to config file with env variable only

3. **`src/services/logging/LoggingClient.ts:11`**: `process.env.LOGGING_SERVICE_URL || 'http://localhost:3014'`
   - ❌ **VIOLATION**: Hardcoded URL
   - **Fix**: Use config service

4. **`src/services/health/HealthService.ts:72`**: `process.env.LOGGING_SERVICE_URL || 'http://localhost:3014'`
   - ❌ **VIOLATION**: Hardcoded URL
   - **Fix**: Use config service

#### Required Changes
- [ ] Remove all hardcoded URLs
- [ ] Use config-driven service URLs
- [ ] Ensure all service URLs come from config files

---

### 5. Configuration Loading Pattern (Section 4.4) ❌ **HIGH PRIORITY**

#### Current State
- Simple environment variable loading
- No YAML file support
- No schema validation
- No environment-specific overrides

#### Required Changes
- [ ] Implement config loader following ModuleImplementationGuide pattern:
  ```typescript
  // Priority: env vars > config files > defaults
  // 1. Load default.yaml
  // 2. Load environment-specific YAML (production.yaml, test.yaml)
  // 3. Resolve environment variables
  // 4. Validate against schema.json
  ```
- [ ] Use `js-yaml` for YAML parsing
- [ ] Use `ajv` for schema validation
- [ ] Support environment variable interpolation in YAML

---

### 6. Documentation Requirements (Section 13) ⚠️ **HIGH PRIORITY**

#### Current State
- ✅ Has `README.md` (basic)
- ❌ Missing `CHANGELOG.md`
- ❌ Missing OpenAPI spec
- ❌ Missing architecture documentation

#### Required Changes
- [ ] Create `CHANGELOG.md` following standard format
- [ ] Create `docs/openapi.yaml` (see API Standards)
- [ ] Enhance `README.md` with:
  - Configuration reference table
  - API reference link
  - Events published/consumed
  - Development setup
  - Testing instructions

#### Files to Create/Modify
```
containers/secret-management/
├── CHANGELOG.md              # NEW
├── README.md                 # ENHANCE
└── docs/
    └── openapi.yaml          # NEW
```

---

### 7. Testing Requirements (Section 12) ⚠️ **VERIFY**

#### Current State
- ⚠️ Unknown: Need to verify test coverage
- ⚠️ Unknown: Need to verify test structure

#### Required Actions
- [ ] Verify test directory structure exists
- [ ] Verify unit tests ≥ 80% coverage
- [ ] Verify integration tests for critical paths
- [ ] Verify API contract tests

---

### 8. Observability Standards (Section 15) ✅ **VERIFIED**

#### Current State
- ✅ Has `/health` endpoint (via `setupHealthCheck`)
- ✅ Has `/ready` endpoint (via `setupHealthCheck`)
- ✅ Has structured logging
- ⚠️ Need to verify metrics exposure

#### Required Actions
- [ ] Verify metrics are exposed (if applicable)
- [ ] Verify health endpoint returns correct format
- [ ] Verify ready endpoint checks dependencies

---

### 9. Error Handling (Section 10) ✅ **VERIFIED**

#### Current State
- ✅ Has error handler middleware
- ✅ Has typed error classes
- ✅ Consistent error response format

#### Status
- ✅ **COMPLIANT** - No changes needed

---

### 10. Security Requirements (Section 11) ✅ **VERIFIED**

#### Current State
- ✅ Authentication middleware applied
- ✅ Input validation on all routes
- ✅ Secrets never logged
- ✅ No secrets in code

#### Status
- ✅ **COMPLIANT** - No changes needed

---

## Implementation Plan

### Phase 1: Configuration Compliance (Priority: CRITICAL)

**Estimated Time:** 2-3 days

1. **Create Configuration Files**
   - [ ] Create `config/default.yaml` with all settings
   - [ ] Create `config/schema.json` for validation
   - [ ] Create `config/production.yaml` (minimal overrides)
   - [ ] Create `config/test.yaml` for test environment

2. **Implement Config Loader**
   - [ ] Install `js-yaml` and `ajv` dependencies
   - [ ] Refactor `src/config/index.ts` to:
     - Load YAML files
     - Support environment variable interpolation
     - Validate against schema
     - Support environment-specific overrides

3. **Remove Hardcoded Values**
   - [ ] Update `src/config/index.ts` to remove hardcoded URLs
   - [ ] Update `src/services/logging/LoggingClient.ts` to use config
   - [ ] Update `src/services/health/HealthService.ts` to use config
   - [ ] Ensure all service URLs come from config

**Files to Modify:**
- `src/config/index.ts` (major refactor)
- `src/services/logging/LoggingClient.ts`
- `src/services/health/HealthService.ts`
- `package.json` (add dependencies)

**Files to Create:**
- `config/default.yaml`
- `config/schema.json`
- `config/production.yaml`
- `config/test.yaml`

---

### Phase 2: Documentation Compliance (Priority: HIGH)

**Estimated Time:** 2-3 days

1. **Create OpenAPI Specification**
   - [ ] Document all 33+ endpoints
   - [ ] Include request/response schemas
   - [ ] Document authentication
   - [ ] Document error responses
   - [ ] Include examples

2. **Create CHANGELOG**
   - [ ] Document version history
   - [ ] Follow standard format
   - [ ] Include breaking changes

3. **Enhance README**
   - [ ] Add configuration reference table
   - [ ] Add API reference link
   - [ ] Document events published/consumed
   - [ ] Add development setup
   - [ ] Add testing instructions

**Files to Create:**
- `docs/openapi.yaml`
- `CHANGELOG.md`

**Files to Modify:**
- `README.md`

---

### Phase 3: Module Structure Compliance (Priority: MEDIUM)

**Estimated Time:** 1 day

1. **Create Missing Directories**
   - [ ] Ensure `docs/` directory exists
   - [ ] Ensure `config/` directory exists

2. **Verify File Structure**
   - [ ] Verify all required files exist
   - [ ] Verify directory structure matches guide

**Status:** Mostly compliant, minor adjustments needed

---

### Phase 4: Testing Verification (Priority: MEDIUM)

**Estimated Time:** 1-2 days

1. **Verify Test Coverage**
   - [ ] Check if tests exist
   - [ ] Verify coverage ≥ 80%
   - [ ] Verify integration tests exist

2. **Add Missing Tests** (if needed)
   - [ ] Add unit tests for config loading
   - [ ] Add integration tests for API endpoints

---

## Configuration File Templates

### config/default.yaml

```yaml
# Secret Management Module Configuration
# Default settings - override with environment variables or environment-specific files

module:
  name: secret-management
  version: 1.0.0

server:
  port: ${PORT:-3003}
  host: ${HOST:-0.0.0.0}
  env: ${NODE_ENV:-development}

database:
  url: ${DATABASE_URL}

encryption:
  masterKey: ${SECRET_MASTER_KEY}  # Required, 64 hex characters
  algorithm: AES-256-GCM
  keyRotation:
    enabled: true
    intervalDays: 90

service:
  authToken: ${SERVICE_AUTH_TOKEN}  # Required

rabbitmq:
  url: ${RABBITMQ_URL}
  exchange: ${RABBITMQ_EXCHANGE:-coder_events}

logging:
  serviceUrl: ${LOGGING_SERVICE_URL}
  enabled: ${LOGGING_ENABLED:-true}
  level: ${LOG_LEVEL:-info}

# Secret Management specific settings
secrets:
  defaultBackend: ${SECRETS_DEFAULT_BACKEND:-LOCAL_ENCRYPTED}
  cache:
    enabled: true
    ttlSeconds: 300
    maxSize: 1000
  softDelete:
    recoveryPeriodDays: 30
  rotation:
    defaultIntervalDays: 90
  expiration:
    notificationDays: [30, 14, 7, 1]

# External service URLs (from config, not hardcoded)
services:
  logging:
    url: ${LOGGING_SERVICE_URL}
  notification:
    url: ${NOTIFICATION_SERVICE_URL}
```

### config/schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["module", "server", "database", "encryption", "service"],
  "properties": {
    "module": {
      "type": "object",
      "required": ["name", "version"],
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" }
      }
    },
    "server": {
      "type": "object",
      "required": ["port"],
      "properties": {
        "port": { "type": "number", "minimum": 1, "maximum": 65535 },
        "host": { "type": "string" },
        "env": { "type": "string", "enum": ["development", "test", "production"] }
      }
    },
    "database": {
      "type": "object",
      "required": ["url"],
      "properties": {
        "url": { "type": "string" }
      }
    },
    "encryption": {
      "type": "object",
      "required": ["masterKey"],
      "properties": {
        "masterKey": { "type": "string", "minLength": 64, "maxLength": 64 },
        "algorithm": { "type": "string" }
      }
    },
    "service": {
      "type": "object",
      "required": ["authToken"],
      "properties": {
        "authToken": { "type": "string", "minLength": 1 }
      }
    },
    "logging": {
      "type": "object",
      "properties": {
        "serviceUrl": { "type": "string", "format": "uri" },
        "enabled": { "type": "boolean" },
        "level": { "type": "string", "enum": ["debug", "info", "warn", "error"] }
      }
    }
  }
}
```

---

## Implementation Decisions (Confirmed)

1. **Service URLs**: ✅ **Config files with env variable fallback** (per ModuleImplementationGuide Section 4.4)
   - All service URLs must come from `config/default.yaml`
   - Environment variables can override via `${SERVICE_URL}` syntax
   - No hardcoded URLs allowed

2. **OpenAPI Spec**: ✅ **Generated from code** (per user requirement)
   - Use `@fastify/swagger` to generate from route schemas
   - Export as YAML to `docs/openapi.yaml`
   - Format: OpenAPI 3.0.3 (per ModuleImplementationGuide Section 7.4)

3. **Test Coverage**: ✅ **Verify and ensure ≥ 80%** (per ModuleImplementationGuide Section 12.1)
   - Unit tests: ≥ 80% coverage (mandatory)
   - Integration tests: Critical paths (mandatory)
   - API contract tests: All endpoints (mandatory)
   - Structure: `tests/unit/`, `tests/integration/`, `tests/fixtures/`

4. **Configuration**: ✅ **Follow ModuleImplementationGuide Section 4.4 exactly**
   - Use `js-yaml` for YAML parsing
   - Use `ajv` for schema validation
   - Load `config/default.yaml` → `config/${env}.yaml` → env vars → validate

5. **CHANGELOG**: ✅ **Create from current version** (standard practice)
   - Document current version (1.0.0)
   - Include breaking changes, features, fixes

---

## Success Criteria

### Must Have (Critical)
- [ ] All hardcoded URLs removed
- [ ] YAML configuration files created
- [ ] Config loader implemented with validation
- [ ] OpenAPI specification created
- [ ] CHANGELOG.md created

### Should Have (High Priority)
- [ ] README.md enhanced with all required sections
- [ ] Test coverage verified ≥ 80%
- [ ] All service URLs from config

### Nice to Have (Medium Priority)
- [ ] Architecture documentation
- [ ] Metrics exposed (if applicable)
- [ ] Code examples in documentation

---

## Next Steps

1. **Review this plan** with the team
2. **Answer clarification questions** above
3. **Prioritize phases** based on business needs
4. **Assign tasks** to team members
5. **Begin Phase 1** (Configuration Compliance)

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-22  
**Status:** Ready for Review

