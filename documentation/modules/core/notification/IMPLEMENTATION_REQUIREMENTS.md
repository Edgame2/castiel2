# Notification Manager - Information Requirements

This document outlines the specific information needed to increase implementation confidence from **85-90%** to **95%+**.

## ✅ Resolved Questions (From ModuleImplementationGuide.md)

The following questions have been **answered** by reviewing the Module Implementation Guide:

1. **Configuration Management**: ✅ **MANDATORY** to use YAML files with `js-yaml` and `Ajv` validation (Section 4)
2. **Database Connection**: ✅ Use `getDatabaseClient()` from `@coder/shared` (Section 5.1)
3. **Table Naming**: ✅ Pattern `{module}_{table_name}` (Section 8.1)
4. **RabbitMQ Exchange**: ✅ `coder_events` exchange name (Section 9.3)
5. **Service Authentication**: ✅ `x-service-token` header with `SERVICE_AUTH_TOKEN` env var
6. **Event Structure**: ✅ `DomainEvent<T>` interface defined (Section 9.2)

**Confidence increased from 85-90% to ~92%** with these clarifications.

---

## 1. Event Structure & RabbitMQ Integration (HIGH PRIORITY)

### 1.1 Event Types from Main Application

**Question**: What exact event types will the main application publish that should trigger notifications?

**Current Understanding**:
- Event naming follows: `{domain}.{entity}.{action}` pattern
- Examples: `task.assigned`, `incident.created`, `collaboration.message`
- Event structure follows `DomainEvent<T>` interface

**Needed**:
- [ ] Complete list of event types that should trigger notifications, i don't have it and it will evolve of time.
- [ ] Exact event payload structure for each event type, 
you need to define it, must be part of the implementation plan and of the documentation
- [ ] Which events are critical vs. non-critical.
Must be configurable by Super Admins and Org Admins
- [ ] Event routing keys used in RabbitMQ

**Example Needed**:
```typescript
// What does the actual event look like when published?
{
  id: "evt_123",
  type: "task.assigned",
  timestamp: "2025-01-22T10:00:00Z",
  version: "1.0",
  source: "task-management",
  organizationId: "org_789",
  userId: "user_admin",
  data: {
    // What fields are here?
    taskId: string;
    assigneeId: string;
    taskTitle: string;
    // ... what else?
  }
}
```

### 1.2 RabbitMQ Exchange Configuration

**Question**: What is the exact RabbitMQ exchange name and queue naming convention?

**✅ ANSWERED from ModuleImplementationGuide.md**:
- Exchange: `coder_events` (confirmed from guide section 9.3)
- Use `EventConsumer` from `@coder/shared` with exchange name
- Queue naming: Per module (e.g., `notification_user_events` from guide example)
- Use topic exchange with routing key patterns

**Still Needed**:
- [ ] DLQ configuration details
- [ ] Specific routing key patterns to bind to (which events to consume)

---

## 2. Secret Management Integration (HIGH PRIORITY)

### 2.1 Secret Retrieval API

**Question**: How exactly should we retrieve secrets from Secret Management module?

**✅ PARTIALLY ANSWERED from codebase**:
- Service-to-service auth: Use `x-service-token` header with `SERVICE_AUTH_TOKEN` env var
- Also include `x-requesting-service` header (e.g., `"notification-manager"`)
- Endpoint: `GET /api/secrets/:id/value` (confirmed from secret-management routes)
- Use `HttpClient` from `@coder/shared`

**Example Implementation**:
```typescript
// How to retrieve a secret
const secretClient = new HttpClient({
  baseUrl: config.services.secretManagement.url,
  headers: {
    'x-service-token': process.env.SERVICE_AUTH_TOKEN!,
    'x-requesting-service': 'notification-manager',
  }
});

const secret = await secretClient.get(`/api/secrets/${secretId}/value`);
// Response format needs confirmation
```

**Still Needed**:
- [ ] Exact response format from `/api/secrets/:id/value` endpoint
- [ ] Error handling when secret not found (what status code/error format?)
- [ ] How to map provider config `secret_id: ${SENDGRID_SECRET_ID}` to actual secret retrieval

### 2.2 Secret Storage Format

**Question**: How are provider credentials stored in Secret Management?

**Needed**:
- [ ] Secret type (API_KEY, PASSWORD, JSON, etc.)
- [ ] Structure for complex secrets (e.g., Twilio needs account SID + auth token)
- [ ] How to store multiple values in one secret

---

## 3. Configuration Management (MEDIUM PRIORITY)

### 3.1 YAML vs Environment Variables

**✅ ANSWERED from ModuleImplementationGuide.md Section 4**:
- **MANDATORY**: Use YAML config files (Section 4.3: "All config in YAML files | ✅ MANDATORY")
- **MANDATORY**: Use `js-yaml` for loading (Section 4.4 example)
- **MANDATORY**: Use `Ajv` for schema validation (Section 4.4 example)
- Config files location: `config/default.yaml`, `config/production.yaml`, `config/test.yaml`
- Config files are in the module directory, loaded at runtime using `readFileSync`
- Environment variables are resolved via `${VAR:-default}` syntax in YAML

**Implementation Pattern** (from guide):
```typescript
// src/config/index.ts
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import Ajv from 'ajv';
import schema from '../../config/schema.json';

export function loadConfig(): ModuleConfig {
  const env = process.env.NODE_ENV || 'development';
  const defaultConfig = load(readFileSync('config/default.yaml', 'utf8'));
  // ... merge with env-specific config, resolve env vars, validate
}
```

**No longer needed** - This is fully specified in the guide.

### 3.2 Config Schema Structure

**✅ ANSWERED from ModuleImplementationGuide.md**:
- Schema file: `config/schema.json` (required file per Section 3.2)
- Use Ajv for validation (Section 4.4)
- Validate after resolving environment variables (env vars resolved first, then schema validation)

**Still Needed**:
- [ ] Example JSON schema structure for notification-manager config
- [ ] Schema for nested objects (providers, services, etc.) - can be inferred from YAML structure
- Note: Environment variable placeholders are resolved BEFORE schema validation, so schema validates the resolved values

---

## 4. Database & Prisma (MEDIUM PRIORITY)

### 4.1 Database Connection

**✅ ANSWERED from ModuleImplementationGuide.md Section 5.1**:
- **MANDATORY**: Use shared database client (Prisma) from `@coder/shared`
- Use `getDatabaseClient()` function (confirmed from shared/src/database/client.ts)
- Database URL: From environment variable `DATABASE_URL` (Section 4.2 example)
- Prisma schema location: Per module structure (Section 3.1 shows `database/prisma/schema.prisma`)

**Still Needed**:
- [ ] Migration strategy (run migrations on container start? Use separate migration step?)
- [ ] Confirm: Own database instance (separate container) or shared database?

### 4.2 Table Naming

**✅ ANSWERED from ModuleImplementationGuide.md Section 8.1**:
- **MANDATORY**: Pattern `{module}_{table_name}` (Section 8.1)
- Examples given: `notification_notifications`, `notification_templates`, `notification_preferences`, `notification_delivery_logs`
- Use Prisma's `@@map` directive to map model names to table names

**Implementation**:
```prisma
model Notification {
  // ... fields
  @@map("notification_notifications")
}
```

**No longer needed** - Fully specified in guide.

---

## 5. Service Communication (MEDIUM PRIORITY)

### 5.1 User Management Integration

**Question**: How to fetch user information (email, phone, preferences)?

**Current Understanding**:
- Use `HttpClient` from `@coder/shared`
- Service URL from config: `config.services.userManagement.url`
- Need authentication

**Needed**:
- [ ] User Management API endpoints:
  - `GET /api/v1/users/:id` - Get user details?
  - `GET /api/v1/users/:id/preferences` - Get preferences?
- [ ] Authentication method
- [ ] Response structure

### 5.2 Logging Module Integration

**Question**: How to send audit logs to Logging module?

**Current Understanding**:
- Logging module has API endpoint
- Use `LoggingClient` pattern (seen in secret-management)
- Service URL from config: `config.services.logging.url`

**✅ PARTIALLY ANSWERED**:
- Authentication: Use service-to-service auth (`x-service-token` header)
- Pattern: Similar to Secret Management integration

**Still Needed**:
- [ ] Logging API endpoint format (e.g., `POST /api/v1/logs`?)
- [ ] Log entry structure (what fields are required?)
- [ ] Confirm authentication method matches Secret Management pattern

---

## 6. Provider Implementations (MEDIUM PRIORITY)

### 6.1 Provider Priority

**Question**: Which providers should be implemented first?

**Current Plan**:
- Phase 3: Email (SendGrid, SMTP), Push (FCM), In-App
- Phase 6: SMS (Twilio), WhatsApp (Twilio), Voice (Twilio)

**Needed**:
- [ ] Confirm priority order
- [ ] Which providers are required vs. optional?
- [ ] Any provider-specific requirements or constraints?

### 6.2 Provider API Keys & Credentials

**Question**: What credentials are needed for each provider?

**Needed**:
- [ ] SendGrid: API key format
- [ ] FCM: Service account JSON? API key?
- [ ] Twilio: Account SID + Auth Token format
- [ ] SMTP: Host, port, user, password format

---

## 7. Frontend Integration (LOW PRIORITY - Can be clarified later)

### 7.1 In-App Notification Delivery

**Question**: How exactly should in-app notifications be delivered to the frontend?

**Current Understanding**:
- Notification Manager → RabbitMQ → Main App → WebSocket → Client
- Exchange: `notification.inapp.deliver`?

**Needed**:
- [ ] Exact RabbitMQ exchange/queue for in-app notifications
- [ ] Message format expected by main app
- [ ] WebSocket event name/format

### 7.2 Frontend Module Location

**Question**: Where should frontend notification components live?

**Current Understanding**:
- `src/renderer/modules/notifications/`

**Needed**:
- [ ] Confirm path structure
- [ ] How to register routes in main app?

---

## 8. Testing & Development (LOW PRIORITY)

### 8.1 Test Database

**Question**: How to set up test database for integration tests?

**Needed**:
- [ ] Use separate test database?
- [ ] Docker compose setup for tests?
- [ ] Test data seeding strategy

### 8.2 Mock Providers

**Question**: How to mock external providers in tests?

**Needed**:
- [ ] Use test doubles or actual test accounts?
- [ ] Mock HTTP requests or provider SDKs?

---

## 9. Deployment & Infrastructure (LOW PRIORITY)

### 9.1 Docker Configuration

**Question**: Any specific Docker requirements?

**Needed**:
- [ ] Base image preference (Node.js version?)
- [ ] Health check configuration
- [ ] Resource limits?

### 9.2 Environment Variables

**Question**: Which environment variables are required vs. optional?

**Needed**:
- [ ] Required: `DATABASE_URL`, `RABBITMQ_URL`, `PORT`?
- [ ] Optional: `REDIS_URL`, provider secret IDs?
- [ ] Default values for development

---

## Priority Summary

### ✅ RESOLVED (Answered from ModuleImplementationGuide.md)
1. ✅ **Configuration approach**: YAML files with js-yaml + Ajv (MANDATORY)
2. ✅ **Database connection**: Use `getDatabaseClient()` from `@coder/shared` (MANDATORY)
3. ✅ **Table naming**: `notification_{table_name}` pattern (MANDATORY)
4. ✅ **RabbitMQ exchange**: `coder_events` (confirmed from guide)
5. ✅ **Service-to-service auth**: `x-service-token` header with `SERVICE_AUTH_TOKEN`

### Must Have Before Starting (Remaining Blockers)
1. ⚠️ **Event structure**: Complete list of event types and payload structures from main app
2. ⚠️ **Secret Management**: Response format from `/api/secrets/:id/value` endpoint
3. ⚠️ **RabbitMQ**: Specific routing key patterns and DLQ configuration

### Should Have Before Phase 3 (Provider Layer)
4. ⚠️ Provider priority and credential formats
5. ⚠️ User Management API endpoints
6. ⚠️ Logging API endpoint format

### Nice to Have (Can clarify during implementation)
7. ⚠️ Frontend integration details
8. ⚠️ Testing setup details
9. ⚠️ Deployment specifics

---

## Recommended Next Steps

1. **Start with Phase 1 (Foundation)** - Can proceed with:
   - ✅ YAML config setup (fully specified)
   - ✅ Database schema (naming convention known)
   - ✅ Basic structure (guide specifies everything)
   
2. **Clarify remaining blockers** before Phase 2:
   - Event types and payloads from main app
   - Secret Management response format
   - RabbitMQ routing patterns
   
3. **Iterate on remaining items** as we progress through phases

## Summary of Changes

**Resolved from ModuleImplementationGuide.md**:
- ✅ Configuration: YAML files mandatory (Section 4)
- ✅ Database: Shared Prisma client (Section 5.1)
- ✅ Table naming: `{module}_{table_name}` pattern (Section 8.1)
- ✅ RabbitMQ: `coder_events` exchange (Section 9.3)
- ✅ Service auth: `x-service-token` header pattern (from codebase)

**Still Need Clarification**:
- Event types and payloads (application-specific)
- Secret Management API response format
- RabbitMQ routing patterns and DLQ
- User Management API endpoints
- Logging API endpoint format

---

*Last Updated: 2025-01-22*

