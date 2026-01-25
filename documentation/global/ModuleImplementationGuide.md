# Module Implementation Guide

## Overview

This document defines the **mandatory rules**, **best practices**, and **recommendations** for creating and implementing modules in the Coder IDE system. All modules MUST follow these guidelines to ensure **reusability**, **maintainability**, and **consistency**.

---

## Table of Contents

### Backend Standards
1. [Core Principles](#1-core-principles)
2. [Module Classification](#2-module-classification)
3. [Module Structure](#3-module-structure)
4. [Configuration Standards](#4-configuration-standards)
5. [Dependency Rules](#5-dependency-rules)
6. [Abstraction Layer Pattern](#6-abstraction-layer-pattern)
7. [API Standards](#7-api-standards)
8. [Database Standards](#8-database-standards)
9. [Event-Driven Communication](#9-event-driven-communication)
10. [Error Handling](#10-error-handling)
11. [Security Requirements](#11-security-requirements)
12. [Testing Requirements](#12-testing-requirements)
13. [Documentation Requirements](#13-documentation-requirements)
14. [Naming Conventions](#14-naming-conventions)
15. [Observability Standards](#15-observability-standards)
16. [Deployment Checklist](#16-deployment-checklist)

### Frontend Standards
17. [UI Module Structure](#17-ui-module-structure)
18. [Component Classification](#18-component-classification)
19. [Component Design Principles](#19-component-design-principles)
20. [State Management](#20-state-management)
21. [Styling Standards](#21-styling-standards)
22. [Component Library Standards](#22-component-library-standards)
23. [DataTable Standards](#23-datatable-standards)
24. [Icon Standards](#24-icon-standards)
25. [Internationalization (i18n)](#25-internationalization-i18n)
26. [Mobile & Responsive Design](#26-mobile--responsive-design)
27. [Accessibility Requirements](#27-accessibility-requirements)
28. [Performance Guidelines](#28-performance-guidelines)
29. [UI Testing Requirements](#29-ui-testing-requirements)
30. [UI Naming Conventions](#30-ui-naming-conventions)

---

## 1. Core Principles

Every module MUST be designed with these principles:

### 1.1 Reusability

> **Modules must be usable in other applications without modification.**

- No hardcoded values (URLs, ports, secrets, paths)
- All behavior configurable via config files
- Clean interfaces that don't expose implementation details
- Minimal assumptions about the host application

### 1.2 Independence

> **Modules must be independently deployable and testable.**

- No direct imports from other modules' internal code
- Own database tables (prefixed)
- Own configuration
- Can run in isolation for testing

### 1.3 Flexibility

> **Modules must adapt to different environments and requirements.**

- Pluggable providers for external services
- Feature flags for optional functionality
- Configurable behavior per tenant/organization

### 1.4 Observability

> **Modules must be transparent about their state and behavior.**

- Health endpoints
- Structured logging
- Metrics exposure
- Audit trail for sensitive operations

---

## 2. Module Classification

### 2.1 Core Modules

**Definition**: Modules required for basic system operation.

| Module | Purpose |
|--------|---------|
| Authentication | Identity verification, sessions |
| User Management | Users, orgs, teams, RBAC |
| Secret Management | Credential storage, encryption |
| Logging | Audit trail, compliance |
| Notification | Multi-channel message delivery |

**Rules for Core Modules**:
- ✅ MUST be always available
- ✅ MUST have fallback/degradation strategies
- ✅ MUST NOT depend on Extension modules
- ✅ MUST support multi-tenancy from day one

### 2.2 Extension Modules

**Definition**: Modules that add specialized functionality.

**Rules for Extension Modules**:
- ✅ CAN be enabled/disabled per deployment
- ✅ CAN depend on Core modules
- ✅ CAN depend on other Extension modules (declare explicitly)
- ✅ MUST gracefully handle missing dependencies

---

## 3. Module Structure

### 3.1 Standard Directory Layout

```
containers/[module-name]/
├── Dockerfile                    # Container definition
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── README.md                     # Module documentation
├── CHANGELOG.md                  # Version history
│
├── config/                       # Configuration
│   ├── default.yaml              # Default settings
│   ├── production.yaml           # Production overrides
│   ├── test.yaml                 # Test settings
│   └── schema.json               # Validation schema
│
├── openapi.yaml                  # API specification (in module root)
├── architecture.md               # Design decisions (in module root)
├── logs-events.md                # Audit log events (in module root, if applicable)
├── notifications-events.md      # Notification events (in module root, if applicable)
└── examples/                     # Usage examples (optional)
│
├── src/
│   ├── server.ts                 # Entry point
│   │
│   ├── config/                   # Config loading
│   │   ├── index.ts              # Config loader
│   │   └── types.ts              # Config types
│   │
│   ├── routes/                   # API routes
│   │   ├── index.ts              # Route registration
│   │   └── [resource].ts         # Resource routes
│   │
│   ├── services/                 # Business logic
│   │   ├── [Service].ts          # Service classes
│   │   └── providers/            # External integrations
│   │       ├── I[Provider].ts    # Interface
│   │       ├── [Impl]Provider.ts # Implementations
│   │       └── ProviderFactory.ts
│   │
│   ├── models/                   # Data models
│   │   └── [Model].ts
│   │
│   ├── events/                   # Event handling
│   │   ├── publisher.ts          # Event publishing
│   │   └── consumers/            # Event handlers
│   │
│   ├── jobs/                     # Background jobs
│   │   └── [Job].ts
│   │
│   ├── middleware/               # Request middleware
│   │   └── [middleware].ts
│   │
│   ├── types/                    # Type definitions
│   │   └── index.ts
│   │
│   └── utils/                    # Utilities
│       └── [utility].ts
│
└── tests/
    ├── unit/                     # Unit tests
    ├── integration/              # Integration tests
    └── fixtures/                 # Test data
```

### 3.2 Required Files

| File | Required | Purpose |
|------|----------|---------|
| `Dockerfile` | ✅ Yes | Container build |
| `package.json` | ✅ Yes | Dependencies |
| `README.md` | ✅ Yes | Documentation |
| `CHANGELOG.md` | ✅ Yes | Version history |
| `config/default.yaml` | ✅ Yes | Default config |
| `config/schema.json` | ✅ Yes | Config validation |
| `openapi.yaml` | ✅ Yes | API spec (in module root) |
| `src/server.ts` | ✅ Yes | Entry point |

---

## 4. Configuration Standards

### 4.1 Configuration Hierarchy

**Priority** (highest to lowest):
1. **Environment variables** - Secrets and deployment-specific
2. **Config files** (YAML) - Module behavior
3. **Database settings** - Runtime-changeable settings
4. **Default values** - Hardcoded fallbacks

### 4.2 Configuration File Format

```yaml
# config/default.yaml

# Module metadata
module:
  name: notification
  version: 1.0.0

# Server settings (use env vars for deployment)
server:
  port: ${PORT:-3001}
  host: ${HOST:-0.0.0.0}

# Database (always from env)
database:
  url: ${DATABASE_URL}
  pool_size: 10

# Module-specific settings
notification:
  providers:
    email:
      enabled: true
      provider: sendgrid  # sendgrid | ses | smtp
    push:
      enabled: false
      provider: firebase
  
  defaults:
    retry_attempts: 3
    retry_delay_ms: 1000

# Feature flags
features:
  email_templates: true
  delivery_tracking: true

# External service URLs (from config, not hardcoded)
services:
  user_management:
    url: ${USER_MANAGEMENT_URL:-http://localhost:3000}
  logging:
    url: ${LOGGING_URL:-http://localhost:3014}
```

### 4.3 Configuration Rules

| Rule | Status |
|------|--------|
| All config in YAML files | ✅ MANDATORY |
| Schema validation for config | ✅ MANDATORY |
| Environment variable support for secrets | ✅ MANDATORY |
| Default values for non-secrets | ✅ MANDATORY |
| No hardcoded URLs, ports, or paths | ✅ MANDATORY |
| Config typed with TypeScript interfaces | ✅ MANDATORY |

### 4.4 Configuration Loading Pattern

```typescript
// src/config/index.ts
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import Ajv from 'ajv';
import { ModuleConfig } from './types';
import schema from '../../config/schema.json';

export function loadConfig(): ModuleConfig {
  const env = process.env.NODE_ENV || 'development';
  
  // Load default config
  const defaultConfig = load(
    readFileSync('config/default.yaml', 'utf8')
  ) as ModuleConfig;
  
  // Load environment-specific overrides
  let envConfig = {};
  try {
    envConfig = load(
      readFileSync(`config/${env}.yaml`, 'utf8')
    ) as Partial<ModuleConfig>;
  } catch (e) {
    // No env-specific config, use defaults
  }
  
  // Merge configs
  const config = deepMerge(defaultConfig, envConfig);
  
  // Resolve environment variables
  const resolved = resolveEnvVars(config);
  
  // Validate against schema
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  if (!validate(resolved)) {
    throw new Error(`Invalid config: ${JSON.stringify(validate.errors)}`);
  }
  
  return resolved;
}
```

---

## 5. Dependency Rules

### 5.1 Allowed Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                        ALLOWED                               │
├─────────────────────────────────────────────────────────────┤
│ ✅ Import from @coder/shared (types, interfaces, utilities) │
│ ✅ Communicate via REST API (config-driven URLs)            │
│ ✅ Communicate via events (RabbitMQ)                        │
│ ✅ Use shared database client (Cosmos DB SDK)               │
│ ✅ Import npm packages                                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Forbidden Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                       FORBIDDEN                              │
├─────────────────────────────────────────────────────────────┤
│ ❌ Direct imports from another module's src/ folder         │
│ ❌ Hardcoded service URLs (use config)                      │
│ ❌ Direct database queries to another module's tables       │
│ ❌ Assumptions about other module's internal state          │
│ ❌ Circular dependencies between modules                    │
│ ❌ Azure Service Bus, Event Grid, or other message brokers  │
│   (use RabbitMQ only for events and job queuing)             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Service Communication Pattern

```typescript
// ✅ CORRECT: Config-driven service client
import { createServiceClient } from '@coder/shared';
import { config } from './config';

const userService = createServiceClient({
  name: 'user-management',
  baseUrl: config.services.userManagement.url,  // From config!
  timeout: 5000,
  retries: 3,
});

// Usage
const user = await userService.get(`/api/v1/users/${userId}`);
```

```typescript
// ❌ WRONG: Hardcoded URL
const user = await fetch('http://localhost:3000/api/v1/users/' + userId);
```

### 5.4 Shared Types Pattern

```typescript
// @coder/shared/types/user.types.ts
// Shared types that multiple modules need

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
}

export interface UserReference {
  id: string;
  name: string;
}
```

```typescript
// Module using shared types
import { User, UserReference } from '@coder/shared';

// Use the shared type, not a local copy
function processUser(user: User): void { ... }
```

---

## 6. Abstraction Layer Pattern

### 6.1 When to Use Abstraction

**ALWAYS abstract when:**
- Integrating with external services (email, storage, payment)
- The implementation might change (database, cache)
- Multiple implementations are possible
- Testing requires mocking

### 6.2 Provider Interface Pattern

```typescript
// src/services/providers/email/IEmailProvider.ts

/**
 * Email provider interface
 * All email implementations must conform to this contract
 */
export interface IEmailProvider {
  /**
   * Send a single email
   */
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  
  /**
   * Send bulk emails
   */
  sendBulk(options: BulkEmailOptions): Promise<BulkEmailResult>;
  
  /**
   * Get delivery status
   */
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
  
  /**
   * Verify provider is configured and reachable
   */
  healthCheck(): Promise<HealthCheckResult>;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Attachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

### 6.3 Provider Implementation

```typescript
// src/services/providers/email/SendGridProvider.ts
import sgMail from '@sendgrid/mail';
import { IEmailProvider, SendEmailOptions, SendEmailResult } from './IEmailProvider';

export class SendGridProvider implements IEmailProvider {
  constructor(private config: SendGridConfig) {
    sgMail.setApiKey(config.apiKey);
  }
  
  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const [response] = await sgMail.send({
        to: options.to,
        from: options.from || this.config.defaultFrom,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      
      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  // ... other methods
}
```

### 6.4 Provider Factory

```typescript
// src/services/providers/email/ProviderFactory.ts
import { IEmailProvider } from './IEmailProvider';
import { SendGridProvider } from './SendGridProvider';
import { SESProvider } from './SESProvider';
import { SMTPProvider } from './SMTPProvider';

export function createEmailProvider(config: EmailConfig): IEmailProvider {
  switch (config.provider) {
    case 'sendgrid':
      return new SendGridProvider(config.sendgrid);
    case 'ses':
      return new SESProvider(config.ses);
    case 'smtp':
      return new SMTPProvider(config.smtp);
    default:
      throw new Error(`Unknown email provider: ${config.provider}`);
  }
}
```

### 6.5 Using Providers in Services

```typescript
// src/services/NotificationService.ts
import { IEmailProvider } from './providers/email/IEmailProvider';
import { createEmailProvider } from './providers/email/ProviderFactory';

export class NotificationService {
  private emailProvider: IEmailProvider;
  
  constructor(config: NotificationConfig) {
    // Provider is injected, not hardcoded
    this.emailProvider = createEmailProvider(config.email);
  }
  
  async sendEmailNotification(notification: EmailNotification): Promise<void> {
    // Uses abstraction - doesn't know if it's SendGrid, SES, or SMTP
    const result = await this.emailProvider.send({
      to: notification.recipient,
      subject: notification.subject,
      html: notification.body,
    });
    
    if (!result.success) {
      throw new Error(`Failed to send email: ${result.error}`);
    }
  }
}
```

---

## 7. API Standards

### 7.1 API Versioning

- **URL-based versioning**: `/api/v1/`, `/api/v2/`
- **Maintain backward compatibility** within major versions
- **Deprecation notice** 2 versions before removal
- **Breaking changes** only in major version bumps

### 7.2 REST Conventions

| Operation | HTTP Method | URL Pattern | Response |
|-----------|-------------|-------------|----------|
| List | GET | `/api/v1/resources` | 200 + array |
| Create | POST | `/api/v1/resources` | 201 + object |
| Read | GET | `/api/v1/resources/:id` | 200 + object |
| Update | PUT | `/api/v1/resources/:id` | 200 + object |
| Partial Update | PATCH | `/api/v1/resources/:id` | 200 + object |
| Delete | DELETE | `/api/v1/resources/:id` | 204 |
| Action | POST | `/api/v1/resources/:id/action` | 200/202 |

### 7.3 Response Format

```typescript
// Success response (single item)
{
  "data": {
    "id": "123",
    "name": "Example"
  }
}

// Success response (list)
{
  "data": [
    { "id": "1", "name": "First" },
    { "id": "2", "name": "Second" }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### 7.4 OpenAPI Specification

Every module MUST have an OpenAPI spec:

```yaml
# openapi.yaml (in module root)
openapi: 3.0.3
info:
  title: Notification Service API
  version: 1.0.0
  description: |
    Multi-channel notification delivery service.
    
    ## Authentication
    All endpoints require JWT authentication via Bearer token.
    
    ## Rate Limiting
    - 100 requests per minute per user
    - 1000 requests per minute per organization

servers:
  - url: /api/v1
    description: API Version 1

tags:
  - name: Notifications
    description: Notification management
  - name: Templates
    description: Notification templates
  - name: Preferences
    description: User preferences

paths:
  /notifications:
    post:
      summary: Send a notification
      operationId: sendNotification
      tags: [Notifications]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SendNotificationRequest'
      responses:
        '202':
          description: Notification queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    SendNotificationRequest:
      type: object
      required:
        - type
        - recipient
        - content
      properties:
        type:
          type: string
          enum: [email, push, sms, in_app]
        recipient:
          type: string
        content:
          $ref: '#/components/schemas/NotificationContent'
```

---

## 8. Database Standards

### 8.1 Table Naming

```sql
-- Pattern: {module}_{table_name}

-- Notification module
notification_notifications
notification_templates
notification_preferences
notification_delivery_logs

-- Logging module
audit_logs
audit_retention_policies
audit_configurations
audit_alert_rules
```

### 8.2 Column Naming

| Convention | Example |
|------------|---------|
| snake_case | `created_at`, `user_id` |
| Foreign keys as `{entity}_id` | `organization_id`, `user_id` |
| Timestamps with `_at` suffix | `created_at`, `updated_at`, `deleted_at` |
| Booleans as `is_` or `has_` | `is_active`, `has_password` |

### 8.3 Required Columns

Every table SHOULD have:

```sql
CREATE TABLE module_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... other columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For multi-tenant tables
CREATE TABLE module_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  -- ... other columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 8.4 Indexing Rules

```sql
-- Always index foreign keys
CREATE INDEX idx_entity_org_id ON module_entities(organization_id);

-- Index columns used in WHERE clauses
CREATE INDEX idx_entity_status ON module_entities(status);

-- Composite indexes for common query patterns
CREATE INDEX idx_entity_org_created ON module_entities(organization_id, created_at DESC);
```

### 8.5 Migrations

- One migration file per change
- Migrations must be **idempotent**
- Migrations must be **reversible** when possible
- Never modify existing migrations in production

---

## 9. Event-Driven Communication

### 9.1 Event Naming Convention

```
{domain}.{entity}.{action}
```

**Message broker:** All event-driven communication MUST use **RabbitMQ**. Do not use Azure Service Bus, Event Grid, or other message brokers. The `coder_events` exchange and queues use RabbitMQ (config: `config.rabbitmq.url` or env).

**Rules:**
- All lowercase
- Dot-separated
- Domain = module name (singular)
- Entity = resource type (singular)
- Action = past tense verb

**Standard Actions:**
| Action | When to Use |
|--------|-------------|
| `created` | Resource was created |
| `updated` | Resource was modified |
| `deleted` | Resource was deleted |
| `accessed` | Resource was read/viewed (for audit) |
| `started` | Long-running operation began |
| `completed` | Long-running operation finished |
| `failed` | Operation failed |
| `triggered` | Alert or automation was triggered |
| `sent` | Message was dispatched |
| `received` | Message was received |
| `expired` | Resource or token expired |
| `rotated` | Credential was rotated |

**Examples by Module:**

```
# Authentication
auth.session.created
auth.session.expired
auth.login.failed
auth.password.reset

# User Management
user.created
user.updated
user.deleted
user.role.changed

# Secret Management
secret.created
secret.accessed
secret.rotated
secret.expired

# Logging (Audit)
audit.log.created
audit.alert.triggered
audit.verification.completed
audit.verification.failed

# Notification
notification.email.sent
notification.email.failed
notification.push.sent
notification.sms.sent

# Planning
plan.created
plan.updated
plan.step.completed
plan.execution.started
plan.execution.completed

# AI Services
ai.completion.started
ai.completion.completed
ai.completion.failed
ai.ratelimit.exceeded
```

### 9.2 Event Structure

```typescript
interface DomainEvent<T = unknown> {
  // Identity
  id: string;                    // Unique event ID (UUID)
  type: string;                  // Event type (domain.entity.action)
  
  // Metadata
  timestamp: string;             // ISO 8601
  version: string;               // Event schema version
  source: string;                // Module that emitted
  correlationId?: string;        // Request correlation
  
  // Context
  tenantId?: string;             // Tenant context (PREFERRED for new modules)
  organizationId?: string;       // DEPRECATED for new modules; prefer tenantId
  userId?: string;               // Actor
  
  // Payload
  data: T;                       // Event-specific data
}

// Example
const event: DomainEvent<UserCreatedData> = {
  id: "evt_123",
  type: "user.created",
  timestamp: "2025-01-22T10:00:00Z",
  version: "1.0",
  source: "user-management",
  correlationId: "req_456",
  tenantId: "tenant_789",
  userId: "user_admin",
  data: {
    userId: "user_new",
    email: "new@example.com",
    name: "New User"
  }
};
```

### 9.3 Publishing Events

```typescript
// src/events/publisher.ts
import { EventPublisher } from '@coder/shared';

const publisher = new EventPublisher({
  exchange: 'coder_events',
  connection: config.rabbitmq.url,
});

// In service
await publisher.publish('notification.email.sent', {
  notificationId: notification.id,
  recipient: notification.to,
  messageId: result.messageId,
});
```

### 9.4 Consuming Events

```typescript
// src/events/consumers/userConsumer.ts
import { EventConsumer } from '@coder/shared';

const consumer = new EventConsumer({
  queue: 'notification_user_events',
  exchange: 'coder_events',
  bindings: ['user.created', 'user.updated'],
});

consumer.on('user.created', async (event) => {
  // Send welcome email
  await notificationService.sendWelcomeEmail(event.data.userId);
});

consumer.on('user.updated', async (event) => {
  // Update notification preferences if email changed
  if (event.data.changes.includes('email')) {
    await preferencesService.updateEmail(event.data.userId, event.data.email);
  }
});
```

### 9.5 Event Documentation Requirements

**MANDATORY**: All modules that publish events that get logged OR trigger notifications MUST document their events in dedicated files.

#### 9.5.1 Required Documentation Files

| File | Required When | Location |
|------|---------------|----------|
| `logs-events.md` | Module publishes events that get logged | `logs-events.md` (in module root) |
| `notifications-events.md` | Module publishes events that trigger notifications | `notifications-events.md` (in module root) |

**Rules:**
- ✅ If a module publishes events that are logged (e.g., `user.created` → logged by logging module), it MUST have `logs-events.md` in the module root
- ✅ If a module publishes events that trigger notifications (e.g., `plan.completed` → triggers notification), it MUST have `notifications-events.md` in the module root
- ✅ A module can have both files if it publishes both types of events
- ✅ Special cases:
  - Logging module publishes `audit.log.created` → MUST have `logs-events.md` (in module root)
  - Notification module publishes `notification.email.sent` → MUST have `notifications-events.md` (in module root)

#### 9.5.2 Required Content

Each event documentation file MUST include:

1. **Published Events** (if applicable)
   - Complete list of all events published by this module
   - Event type (following naming convention: `{domain}.{entity}.{action}`)
   - When the event is triggered
   - Event payload schema (JSON Schema format)
   - Example event payload

2. **Consumed Events** (if applicable)
   - Complete list of all events consumed by this module
   - Event handler description
   - What action is taken when the event is received

3. **Event Payload Schemas**
   - MUST use JSON Schema format (primary)
   - Optionally include TypeScript interfaces for developer convenience
   - MUST follow the `DomainEvent<T>` structure pattern (see Section 9.2)
   - All fields in the `data` property must be documented

#### 9.5.3 Event Documentation Template

```markdown
# [Module Name] - [Logs/Notifications] Events

## Overview

Brief description of the events documented in this file.

## Published Events

### {domain}.{entity}.{action}

**Description**: When this event is triggered (e.g., "Emitted when a user account is created").

**Triggered When**: 
- Specific condition 1
- Specific condition 2

**Event Type**: `{domain}.{entity}.{action}`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "timestamp", "version", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event ID"
    },
    "type": {
      "type": "string",
      "enum": ["{domain}.{entity}.{action}"],
      "description": "Event type"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "version": {
      "type": "string",
      "description": "Event schema version (e.g., '1.0')"
    },
    "source": {
      "type": "string",
      "description": "Module that emitted the event"
    },
    "correlationId": {
      "type": "string",
      "description": "Request correlation ID (optional)"
    },
    "organizationId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant context (optional)"
    },
    "userId": {
      "type": "string",
      "format": "uuid",
      "description": "Actor user ID (optional)"
    },
    "data": {
      "type": "object",
      "required": ["field1", "field2"],
      "properties": {
        "field1": {
          "type": "string",
          "description": "Description of field1"
        },
        "field2": {
          "type": "number",
          "description": "Description of field2"
        }
      }
    }
  }
}
```

**TypeScript Interface** (optional):

```typescript
interface {Entity}{Action}EventData {
  field1: string;
  field2: number;
  // ... other fields
}

interface {Entity}{Action}Event extends DomainEvent<{Entity}{Action}EventData> {
  type: '{domain}.{entity}.{action}';
  data: {Entity}{Action}EventData;
}
```

**Example Event**:

```json
{
  "id": "evt_12345678-1234-1234-1234-123456789abc",
  "type": "{domain}.{entity}.{action}",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "module-name",
  "correlationId": "req_45678901-2345-2345-2345-234567890def",
  "organizationId": "org_78901234-3456-3456-3456-345678901ghi",
  "userId": "user_90123456-4567-4567-4567-456789012jkl",
  "data": {
    "field1": "example value",
    "field2": 42
  }
}
```

## Consumed Events

### {domain}.{entity}.{action}

**Description**: What this module does when it receives this event.

**Handler**: `src/events/consumers/{handler}.ts`

**Action Taken**:
- Action 1
- Action 2

**Example Handler**:

```typescript
consumer.on('{domain}.{entity}.{action}', async (event) => {
  // Handler implementation
});
```
```

#### 9.5.4 Schema Format Standards

**Primary Format: JSON Schema**
- ✅ Language-agnostic
- ✅ Can be validated programmatically
- ✅ Standard format (JSON Schema Draft 7)
- ✅ Works with any programming language

**Optional Format: TypeScript Interfaces**
- ✅ Developer-friendly for TypeScript projects
- ✅ Provides type safety in code
- ✅ Should match the JSON Schema structure

**Schema Structure Requirements:**
- MUST include all fields from `DomainEvent<T>` base structure
- MUST document the `data` property with complete schema
- MUST specify required fields
- MUST include descriptions for all properties
- MUST use appropriate JSON Schema types (string, number, boolean, object, array)
- MUST use format constraints where applicable (uuid, date-time, email, etc.)

#### 9.5.5 Example: Notification Module

```markdown
# Notification Module - Notifications Events

## Published Events

### notification.email.sent

**Description**: Emitted when an email notification is successfully sent.

**Triggered When**: 
- Email provider successfully delivers an email
- Email is queued and confirmed by provider

**Event Type**: `notification.email.sent`

**Event Schema**: [JSON Schema as shown in template]

**Example Event**:

```json
{
  "id": "evt_123",
  "type": "notification.email.sent",
  "timestamp": "2025-01-22T10:00:00Z",
  "version": "1.0",
  "source": "notification-manager",
  "organizationId": "org_789",
  "userId": "user_123",
  "data": {
    "notificationId": "notif_456",
    "recipient": "user@example.com",
    "messageId": "msg_789",
    "channel": "email",
    "templateId": "welcome-email"
  }
}
```

## Consumed Events

### user.created

**Description**: Sends a welcome email notification when a new user is created.

**Handler**: `src/events/consumers/userConsumer.ts`

**Action Taken**:
- Retrieves user email from event data
- Loads welcome email template
- Sends email notification via email provider
```

### 9.6 Scheduled and Batch Jobs

When a module needs **scheduled or batch jobs** (e.g. nightly clustering, backfill, benchmarks):

1. **Scheduler:** A scheduler (e.g. `node-cron` in `jobs/BatchJobScheduler.ts` in `workflow-orchestrator` or similar) runs on a schedule and **publishes** to RabbitMQ with a routing key such as `workflow.job.trigger`. Payload: `{ job: string, metadata?: object, triggeredBy: 'scheduler'|'manual', timestamp }`.
2. **Queue:** A durable queue (e.g. `bi_batch_jobs`) is bound to the `coder_events` exchange for that routing key.
3. **Workers:** One or more containers have `events/consumers/BatchJobWorker.ts` (or similar) that consume from the queue, execute the job by `job` type, and publish `workflow.job.completed` or `workflow.job.failed` on RabbitMQ.

**Prefer this pattern** over a separate job-queue product so all queuing stays on RabbitMQ. The `jobs/` folder in the scheduler container holds the cron logic; the actual work runs in the consumer container(s).

---

## 10. Error Handling

### 10.1 Error Types

```typescript
// @coder/shared/errors

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationDetail[]) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} not found: ${id}`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}
```

### 10.2 Error Handling Middleware

```typescript
// src/middleware/errorHandler.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@coder/shared';
import { logger } from '../utils/logger';

export function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  logger.error({
    error: error.message,
    code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
    stack: error.stack,
    requestId: request.id,
    path: request.url,
  });
  
  // Handle known errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }
  
  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: error.validation,
      },
    });
  }
  
  // Handle unknown errors
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
    },
  });
}
```

### 10.3 Error Handling Rules

| Rule | Status |
|------|--------|
| Never expose stack traces in production | ✅ MANDATORY |
| Always log errors with context | ✅ MANDATORY |
| Use typed error classes | ✅ MANDATORY |
| Return consistent error response format | ✅ MANDATORY |
| Include correlation ID in error logs | ✅ MANDATORY |

---

## 11. Security Requirements

### 11.1 Authentication

```typescript
// All routes MUST use authentication middleware
fastify.addHook('preHandler', authenticateRequest);

// Except health endpoints
fastify.get('/health', { preHandler: [] }, healthHandler);
fastify.get('/ready', { preHandler: [] }, readyHandler);
```

### 11.2 Authorization (RBAC)

```typescript
// Routes MUST check permissions
fastify.get(
  '/api/v1/admin/users',
  { 
    preHandler: [
      authenticateRequest,
      requirePermission('users:read')  // RBAC check
    ] 
  },
  listUsersHandler
);
```

### 11.3 Input Validation

```typescript
// All inputs MUST be validated
const createUserSchema = {
  body: {
    type: 'object',
    required: ['email', 'name'],
    properties: {
      email: { type: 'string', format: 'email' },
      name: { type: 'string', minLength: 1, maxLength: 100 },
    },
    additionalProperties: false,  // Reject unknown fields
  },
};

fastify.post('/api/v1/users', { schema: createUserSchema }, createUserHandler);
```

### 11.4 Secrets Management

| Rule | Status |
|------|--------|
| Never log secrets | ✅ MANDATORY |
| Never hardcode secrets | ✅ MANDATORY |
| Use environment variables for secrets | ✅ MANDATORY |
| Use Secret Management module for app secrets | ✅ MANDATORY |
| Rotate secrets regularly | ✅ RECOMMENDED |

### 11.5 Data Protection

```typescript
// Redact sensitive data in logs
const redactPatterns = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /authorization/i,
];

function redactSensitive(obj: unknown): unknown {
  // Implementation
}
```

---

## 12. Testing Requirements

### 12.1 Coverage Requirements

| Test Type | Coverage | Mandatory |
|-----------|----------|-----------|
| Unit Tests | ≥ 80% | ✅ Yes |
| Integration Tests | Critical paths | ✅ Yes |
| API Contract Tests | All endpoints | ✅ Yes |
| E2E Tests | Happy paths | ⚠️ Recommended |
| Performance Tests | Key operations | ⚠️ Recommended |

### 12.2 Unit Test Pattern

```typescript
// tests/unit/services/NotificationService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../../../src/services/NotificationService';
import { IEmailProvider } from '../../../src/services/providers/email/IEmailProvider';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockEmailProvider: IEmailProvider;
  
  beforeEach(() => {
    // Create mock provider
    mockEmailProvider = {
      send: vi.fn().mockResolvedValue({ success: true, messageId: '123' }),
      sendBulk: vi.fn(),
      getDeliveryStatus: vi.fn(),
      healthCheck: vi.fn(),
    };
    
    // Inject mock
    service = new NotificationService({
      email: { provider: mockEmailProvider },
    });
  });
  
  describe('sendEmailNotification', () => {
    it('should send email successfully', async () => {
      const notification = {
        recipient: 'user@example.com',
        subject: 'Test',
        body: '<p>Hello</p>',
      };
      
      await service.sendEmailNotification(notification);
      
      expect(mockEmailProvider.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });
    });
    
    it('should throw error when send fails', async () => {
      mockEmailProvider.send = vi.fn().mockResolvedValue({
        success: false,
        error: 'Provider error',
      });
      
      await expect(
        service.sendEmailNotification({ ... })
      ).rejects.toThrow('Failed to send email');
    });
  });
});
```

### 12.3 Integration Test Pattern

```typescript
// tests/integration/routes/notifications.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/server';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database';

describe('POST /api/v1/notifications', () => {
  let app: FastifyInstance;
  let authToken: string;
  
  beforeAll(async () => {
    await setupTestDatabase();
    app = await buildApp();
    authToken = await getTestAuthToken();
  });
  
  afterAll(async () => {
    await app.close();
    await cleanupTestDatabase();
  });
  
  it('should create notification and return 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        type: 'email',
        recipient: 'user@example.com',
        content: {
          subject: 'Test',
          body: 'Hello',
        },
      },
    });
    
    expect(response.statusCode).toBe(202);
    expect(response.json()).toHaveProperty('data.id');
  });
  
  it('should return 400 for invalid input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        type: 'invalid',
      },
    });
    
    expect(response.statusCode).toBe(400);
  });
});
```

---

## 13. Documentation Requirements

### 13.1 Required Documentation

| Document | Location | Content | Required When |
|----------|----------|---------|---------------|
| README.md | Root | Setup, config, usage | ✅ Always |
| CHANGELOG.md | Root | Version history | ✅ Always |
| openapi.yaml | Root | API specification | ✅ Always |
| architecture.md | Root | Design decisions | ✅ Always |
| logs-events.md | Root | Events that get logged | If module publishes events that get logged |
| notifications-events.md | Root | Events that trigger notifications | If module publishes events that trigger notifications |

**Event Documentation Rules:**
- ✅ `logs-events.md` (in module root) is MANDATORY if the module publishes any events that are logged
- ✅ `notifications-events.md` (in module root) is MANDATORY if the module publishes any events that trigger notifications
- ✅ Both files can exist in the same module if it publishes both types of events
- ✅ See Section 9.5 for detailed requirements and template

### 13.2 README Template

```markdown
# Module Name

Brief description of what this module does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+

### Installation

\`\`\`bash
npm install
\`\`\`

### Configuration

\`\`\`bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
\`\`\`

### Running

\`\`\`bash
# Development
npm run dev

# Production
npm run build
npm start
\`\`\`

## Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| server.port | number | 3001 | Server port |
| ... | ... | ... | ... |

## API Reference

See [OpenAPI Specification](./openapi.yaml)

## Events

For detailed event documentation including schemas and examples, see:
- [Logs Events](./logs-events.md) (if applicable)
- [Notifications Events](./notifications-events.md) (if applicable)

### Published Events

| Event | Description |
|-------|-------------|
| notification.sent | Notification was delivered |
| notification.failed | Notification delivery failed |

### Consumed Events

| Event | Handler |
|-------|---------|
| user.created | Send welcome notification |

## Development

### Running Tests

\`\`\`bash
npm test           # All tests
npm run test:unit  # Unit tests only
npm run test:int   # Integration tests
\`\`\`

### Code Style

\`\`\`bash
npm run lint       # Check linting
npm run lint:fix   # Fix linting issues
\`\`\`

## License

Proprietary
```

### 13.3 Code Documentation

```typescript
/**
 * Service for managing notifications across multiple channels.
 * 
 * @example
 * ```typescript
 * const service = new NotificationService(config);
 * await service.send({
 *   type: 'email',
 *   recipient: 'user@example.com',
 *   content: { subject: 'Hello', body: 'World' }
 * });
 * ```
 */
export class NotificationService {
  /**
   * Send a notification through the appropriate channel.
   * 
   * @param notification - The notification to send
   * @returns The sent notification with delivery status
   * @throws {ValidationError} If notification data is invalid
   * @throws {ProviderError} If the provider fails to deliver
   */
  async send(notification: SendNotificationInput): Promise<Notification> {
    // Implementation
  }
}
```

---

## 14. Naming Conventions

### 14.1 Files and Folders

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `secret-management/` |
| Service files | PascalCase | `NotificationService.ts` |
| Route files | kebab-case | `notifications.ts` |
| Interface files | I + PascalCase | `IEmailProvider.ts` |
| Type files | camelCase + .types | `notification.types.ts` |
| Test files | *.test.ts | `NotificationService.test.ts` |
| Config files | kebab-case.yaml | `default.yaml` |

### 14.2 Code

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `NotificationService` |
| Interfaces | I + PascalCase | `IEmailProvider` |
| Type aliases | PascalCase | `NotificationConfig` |
| Functions | camelCase | `sendNotification()` |
| Variables | camelCase | `notificationCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Enums | PascalCase | `NotificationType` |
| Enum values | UPPER_SNAKE_CASE | `NotificationType.EMAIL` |

### 14.3 Database

| Type | Convention | Example |
|------|------------|---------|
| Tables | module_tablename | `notification_templates` |
| Columns | snake_case | `created_at` |
| Indexes | idx_table_columns | `idx_notifications_org_created` |
| Foreign keys | fk_table_reference | `fk_notifications_user` |

### 14.4 API

| Type | Convention | Example |
|------|------------|---------|
| Endpoints | kebab-case | `/notification-templates` |
| Query params | camelCase | `?startDate=2025-01-01` |
| Request body | camelCase | `{ "recipientEmail": "..." }` |
| Response body | camelCase | `{ "notificationId": "..." }` |

### 14.5 Events

| Type | Convention | Example |
|------|------------|---------|
| Event types | dot.separated.lowercase | `notification.email.sent` |
| Event data | camelCase | `{ notificationId, recipientEmail }` |

---

## 15. Observability Standards

### 15.1 Azure Application Insights

**MANDATORY** for all containers: instrument with **Azure Application Insights** for distributed tracing, dependency tracking, custom events, and exceptions.

- **Config:** `APPLICATIONINSIGHTS_CONNECTION_STRING` (env) or `application_insights.connection_string` in config. Initialize **before** other imports that perform I/O.
- **Implementation:** Use **`@azure/monitor-opentelemetry`** (OTel-based). Best option: OTel standard, supports multiple exporters, Azure’s recommended path for new Node.js apps. Auto-instrument HTTP, Cosmos DB, and (where supported) RabbitMQ/amqplib.
- **Custom events:** Track business semantics (e.g. `risk.evaluated`, `ml.prediction`, batch job start/end) with `trackEvent`; include `tenantId`, `modelId`, `duration_ms` where applicable.
- **Local dev:** Set `APPLICATIONINSIGHTS_DISABLE=true` or `application_insights.disable: true` when connection string is empty to avoid errors.

### 15.2 Health Endpoints

```typescript
// GET /health - Liveness (is the process running?)
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:00:00Z"
}

// GET /ready - Readiness (can it handle requests?)
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok", "latency_ms": 5 },
    "redis": { "status": "ok", "latency_ms": 2 },
    "rabbitmq": { "status": "ok", "latency_ms": 3 }
  },
  "timestamp": "2025-01-22T10:00:00Z"
}
```

### 15.3 Logging Standards

```typescript
// Use structured logging
import { logger } from '@coder/shared';

// ✅ CORRECT: Structured log with context
logger.info('Notification sent', {
  notificationId: notification.id,
  type: notification.type,
  recipient: notification.recipient,
  duration_ms: Date.now() - startTime,
});

// ❌ WRONG: Unstructured log
console.log(`Sent notification ${notification.id} to ${notification.recipient}`);
```

### 15.4 Log Levels

| Level | Usage |
|-------|-------|
| ERROR | Errors requiring attention |
| WARN | Degraded functionality, recoverable errors |
| INFO | Significant business events |
| DEBUG | Detailed debugging (disabled in prod) |

### 15.5 Metrics (Prometheus & Grafana)

**MANDATORY:** Each container MUST expose a **Prometheus metrics** endpoint for scraping by **Prometheus** and dashboards in **Grafana**.

- **Endpoint:** `GET /metrics` (or `metrics.path` from config). **Content-Type:** `text/plain; version=0.0.4` (Prometheus exposition format).
- **Auth (configurable):** When `metrics.require_auth` is true, `/metrics` MUST require `Authorization: Bearer <token>`, validated against `metrics.bearer_token` or `METRICS_BEARER_TOKEN`. Prometheus uses `bearer_token` or `bearer_token_file` in scrape config. When `require_auth` is false (e.g. trusted internal network), no auth.
- **Implementation:** Use **prom-client** (`Counter`, `Histogram`, `Gauge`). Register with the default registry; on `GET /metrics` return `register.metrics()`. Do not hand-build strings; use prom-client so values are live.
- **Standard metrics:** Include `http_requests_total{method,route,status}` and `http_request_duration_seconds{method,route}`. Add **app-specific** metrics (e.g. `risk_evaluations_total`, `ml_predictions_total{model=}`, `batch_job_duration_seconds{job=}`).
- **Prometheus & Grafana in repo:** The repo MUST include **Prometheus scrape config** and **Grafana dashboard JSON** for the module’s services (e.g. `deployment/monitoring/prometheus/`, `deployment/monitoring/grafana/dashboards/`). Scrape config uses `bearer_token` when `metrics.require_auth` is true.

```typescript
// Expose Prometheus metrics via GET /metrics
import { Counter, Histogram, register } from 'prom-client';

// App-specific
const notificationsSent = new Counter({
  name: 'notifications_sent_total',
  help: 'Total notifications sent',
  labelNames: ['type', 'status'],
});

const notificationDuration = new Histogram({
  name: 'notification_duration_seconds',
  help: 'Notification send duration',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// GET /metrics (check metrics.require_auth; if true, validate Authorization: Bearer <token>)
fastify.get('/metrics', async (req, reply) => {
  if (config.metrics.require_auth) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${config.metrics.bearer_token}`) {
      return reply.code(401).send('Unauthorized');
    }
  }
  reply.type('text/plain; version=0.0.4').send(await register.metrics());
});

// Usage in code
notificationsSent.inc({ type: 'email', status: 'success' });
notificationDuration.observe({ type: 'email' }, durationSeconds);
```

---

## 16. Deployment Checklist

Before deploying a module, verify ALL items:

### 16.1 Code Quality

- [ ] All linting rules pass
- [ ] No TypeScript errors
- [ ] No console.log statements (use logger)
- [ ] No hardcoded values (URLs, ports, secrets)
- [ ] No TODO/FIXME in critical paths

### 16.2 Configuration

- [ ] `config/default.yaml` exists with all settings
- [ ] `config/schema.json` validates config
- [ ] All secrets from environment variables
- [ ] Service URLs from config (not hardcoded)

### 16.3 API

- [ ] `openapi.yaml` complete and valid
- [ ] All endpoints documented
- [ ] Authentication on all routes (except `/health`, `/ready`, `/metrics`)
- [ ] Input validation on all routes
- [ ] Consistent error responses

### 16.4 Database

- [ ] Tables prefixed with module name
- [ ] Migrations idempotent
- [ ] Indexes for common queries
- [ ] Foreign keys where appropriate

### 16.5 Testing

- [ ] Unit tests ≥ 80% coverage
- [ ] Integration tests for critical paths
- [ ] All tests passing
- [ ] No skipped tests

### 16.6 Documentation

- [ ] README.md complete
- [ ] CHANGELOG.md updated
- [ ] API documented in OpenAPI
- [ ] Events documented

### 16.7 Security

- [ ] Authentication middleware applied
- [ ] RBAC permissions checked
- [ ] Input validated and sanitized
- [ ] Sensitive data not logged
- [ ] No secrets in code

### 16.8 Observability

- [ ] **Azure Application Insights** configured (`APPLICATIONINSIGHTS_CONNECTION_STRING`); initialized before other imports; custom events for key business operations
- [ ] **GET /metrics** endpoint (Prometheus text format via prom-client); `http_requests_total`, `http_request_duration_seconds`, and app-specific metrics; scrapable by Prometheus for Grafana
- [ ] `/health` endpoint implemented
- [ ] `/ready` endpoint implemented
- [ ] Structured logging (no console.log)

### 16.9 Abstraction

- [ ] External services use provider pattern
- [ ] Providers configurable via config
- [ ] No direct integration with external APIs

### 16.10 Events

- [ ] Published events documented
- [ ] Consumed events documented
- [ ] Event handlers idempotent
- [ ] `logs-events.md` exists in module root (if module publishes events that get logged)
- [ ] `notifications-events.md` exists in module root (if module publishes events that trigger notifications)
- [ ] Event documentation includes JSON Schema for all event payloads
- [ ] Event documentation includes examples for all events
- [ ] Event documentation specifies when each event is triggered

### 16.11 Frontend (if applicable)

- [ ] Components follow naming conventions
- [ ] Pages use proper layout structure
- [ ] Proper loading and error states
- [ ] Accessible (ARIA, keyboard navigation)
- [ ] Responsive design
- [ ] Unit tests for components

---

## 17. UI Module Structure

### 17.1 Frontend Module Layout

```
src/renderer/modules/[module-name]/
├── index.ts                      # Public exports
├── pages/                        # Page components (routes)
│   ├── index.ts
│   ├── [Resource]Page.tsx
│   ├── [Resource]ListPage.tsx
│   └── [Resource]DetailPage.tsx
│
├── components/                   # UI components
│   ├── index.ts
│   ├── [Component].tsx
│   └── [Component]/              # Complex components
│       ├── index.ts
│       ├── [Component].tsx
│       ├── [Component].test.tsx
│       └── [SubComponent].tsx
│
├── hooks/                        # Custom hooks
│   ├── index.ts
│   ├── use[Feature].ts
│   └── use[Feature].test.ts
│
├── context/                      # React contexts
│   ├── index.ts
│   └── [Feature]Context.tsx
│
├── services/                     # API calls and business logic
│   ├── index.ts
│   └── [resource]Service.ts
│
├── types/                        # TypeScript types
│   └── index.ts
│
├── utils/                        # Utility functions
│   └── index.ts
│
└── constants/                    # Module constants
    └── index.ts
```

### 17.2 Required Frontend Files

| File | Required | Purpose |
|------|----------|---------|
| `index.ts` | ✅ Yes | Public API exports |
| `pages/index.ts` | ✅ Yes | Page exports |
| `components/index.ts` | ✅ Yes | Component exports |
| `hooks/index.ts` | ⚠️ If hooks exist | Hook exports |
| `types/index.ts` | ✅ Yes | Type definitions |

---

## 18. Component Classification

### 18.1 Component Types

| Type | Location | Purpose | Example |
|------|----------|---------|---------|
| **Pages** | `pages/` | Route-level components, data fetching | `NotificationListPage.tsx` |
| **Features** | `components/` | Complex, stateful business components | `NotificationComposer.tsx` |
| **UI Components** | `components/` | Reusable, presentational | `NotificationCard.tsx` |
| **Shared Components** | `@/components/` | Cross-module components | `Button.tsx`, `Modal.tsx` |

### 18.2 Page Components

**Rules for Pages:**
- ✅ One page per route
- ✅ Handle data fetching (queries, mutations)
- ✅ Handle loading, error, and empty states
- ✅ Compose feature and UI components
- ✅ Minimal business logic (delegate to hooks/services)

```tsx
// pages/NotificationListPage.tsx
import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationList } from '../components/NotificationList';
import { NotificationFilters } from '../components/NotificationFilters';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState, ErrorState, EmptyState } from '@/components/states';

export function NotificationListPage() {
  const [filters, setFilters] = useState<NotificationFilters>({});
  const { data, isLoading, error, refetch } = useNotifications(filters);
  
  if (isLoading) {
    return <LoadingState message="Loading notifications..." />;
  }
  
  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }
  
  if (!data?.items.length) {
    return (
      <EmptyState
        title="No notifications"
        description="You're all caught up!"
        icon={<BellIcon />}
      />
    );
  }
  
  return (
    <PageLayout title="Notifications">
      <NotificationFilters value={filters} onChange={setFilters} />
      <NotificationList notifications={data.items} />
    </PageLayout>
  );
}
```

### 18.3 Feature Components

**Rules for Feature Components:**
- ✅ Encapsulate complex business logic
- ✅ Can have internal state
- ✅ Can use hooks for data fetching
- ✅ Should be testable in isolation

```tsx
// components/NotificationComposer/NotificationComposer.tsx
import { useState } from 'react';
import { useSendNotification } from '../../hooks/useSendNotification';
import { NotificationForm } from './NotificationForm';
import { RecipientSelector } from './RecipientSelector';
import { TemplateSelector } from './TemplateSelector';

interface NotificationComposerProps {
  onSuccess?: () => void;
  defaultRecipient?: string;
}

export function NotificationComposer({ 
  onSuccess, 
  defaultRecipient 
}: NotificationComposerProps) {
  const [step, setStep] = useState<'recipient' | 'content' | 'review'>('recipient');
  const { mutate: sendNotification, isLoading } = useSendNotification();
  
  // Complex multi-step form logic...
  
  return (
    <div className="notification-composer">
      {step === 'recipient' && <RecipientSelector ... />}
      {step === 'content' && <NotificationForm ... />}
      {step === 'review' && <ReviewStep ... />}
    </div>
  );
}
```

### 18.4 UI Components

**Rules for UI Components:**
- ✅ Purely presentational (no data fetching)
- ✅ Receive all data via props
- ✅ Emit events via callbacks
- ✅ Highly reusable
- ✅ Well-documented props

```tsx
// components/NotificationCard.tsx
interface NotificationCardProps {
  /** The notification to display */
  notification: Notification;
  /** Called when user clicks the card */
  onClick?: (notification: Notification) => void;
  /** Called when user marks as read */
  onMarkAsRead?: (id: string) => void;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function NotificationCard({
  notification,
  onClick,
  onMarkAsRead,
  isSelected = false,
  className,
}: NotificationCardProps) {
  return (
    <div 
      className={cn(
        'notification-card',
        { 'notification-card--selected': isSelected },
        { 'notification-card--unread': !notification.read },
        className
      )}
      onClick={() => onClick?.(notification)}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <div className="notification-card__icon">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="notification-card__content">
        <h4 className="notification-card__title">{notification.title}</h4>
        <p className="notification-card__message">{notification.message}</p>
        <time className="notification-card__time">
          {formatRelativeTime(notification.createdAt)}
        </time>
      </div>
      {!notification.read && (
        <button
          className="notification-card__mark-read"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead?.(notification.id);
          }}
          aria-label="Mark as read"
        >
          <CheckIcon />
        </button>
      )}
    </div>
  );
}
```

---

## 19. Component Design Principles

### 19.1 Single Responsibility

Each component should do ONE thing well.

```tsx
// ❌ WRONG: Component does too much
function NotificationPage() {
  // Fetches data, handles filtering, renders list, handles modals...
  // 500+ lines of code
}

// ✅ CORRECT: Composed of focused components
function NotificationPage() {
  return (
    <PageLayout>
      <NotificationHeader />
      <NotificationFilters />
      <NotificationList />
      <NotificationPagination />
    </PageLayout>
  );
}
```

### 19.2 Props Interface Design

```tsx
// ✅ GOOD: Clear, typed props with JSDoc
interface ButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS classes */
  className?: string;
}

// ❌ BAD: Unclear, untyped props
interface ButtonProps {
  children: any;
  variant?: string;
  onClick?: Function;
  [key: string]: any;  // Avoid spreading unknown props
}
```

### 19.3 Composition over Configuration

```tsx
// ❌ WRONG: Over-configured component
<Card
  hasHeader={true}
  headerTitle="Title"
  headerSubtitle="Subtitle"
  headerIcon={<Icon />}
  hasFooter={true}
  footerActions={[...]}
  footerAlignment="right"
/>

// ✅ CORRECT: Composable component
<Card>
  <Card.Header>
    <Card.Icon><Icon /></Card.Icon>
    <Card.Title>Title</Card.Title>
    <Card.Subtitle>Subtitle</Card.Subtitle>
  </Card.Header>
  <Card.Content>
    {/* Content */}
  </Card.Content>
  <Card.Footer align="right">
    <Button>Cancel</Button>
    <Button variant="primary">Save</Button>
  </Card.Footer>
</Card>
```

### 19.4 Controlled vs Uncontrolled

Support both patterns when appropriate:

```tsx
interface SelectProps<T> {
  /** Controlled value */
  value?: T;
  /** Default value for uncontrolled usage */
  defaultValue?: T;
  /** Change handler */
  onChange?: (value: T) => void;
  options: SelectOption<T>[];
}

function Select<T>({ value, defaultValue, onChange, options }: SelectProps<T>) {
  // Use internal state if uncontrolled
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  
  const handleChange = (newValue: T) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };
  
  // ...
}
```

---

## 20. State Management

### 20.1 State Location Guidelines

| State Type | Location | Example |
|------------|----------|---------|
| UI state (local) | `useState` | Modal open, form input |
| UI state (shared) | Context | Theme, sidebar collapsed |
| Server state | React Query / SWR | API data, cache |
| URL state | Router | Filters, pagination, tab |
| Global app state | Zustand / Context | User session, preferences |

### 20.2 Server State with React Query

```tsx
// hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';

export function useNotifications(filters: NotificationFilters) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.list(filters),
    staleTime: 30 * 1000,  // 30 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

### 20.3 URL State for Filters

```tsx
// hooks/useNotificationFilters.ts
import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

export function useNotificationFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters = useMemo(() => ({
    type: searchParams.get('type') || undefined,
    read: searchParams.get('read') === 'true' ? true : 
          searchParams.get('read') === 'false' ? false : undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
  }), [searchParams]);
  
  const setFilters = useCallback((newFilters: Partial<NotificationFilters>) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });
      return params;
    });
  }, [setSearchParams]);
  
  return { filters, setFilters };
}
```

### 20.4 Context for Module State

```tsx
// context/NotificationContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

interface NotificationState {
  selectedIds: Set<string>;
  viewMode: 'list' | 'grid';
}

type NotificationAction =
  | { type: 'SELECT'; id: string }
  | { type: 'DESELECT'; id: string }
  | { type: 'SELECT_ALL'; ids: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_VIEW_MODE'; mode: 'list' | 'grid' };

const NotificationContext = createContext<{
  state: NotificationState;
  dispatch: React.Dispatch<NotificationAction>;
} | null>(null);

function notificationReducer(
  state: NotificationState, 
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedIds: new Set([...state.selectedIds, action.id]) };
    case 'DESELECT':
      const newIds = new Set(state.selectedIds);
      newIds.delete(action.id);
      return { ...state, selectedIds: newIds };
    case 'CLEAR_SELECTION':
      return { ...state, selectedIds: new Set() };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    default:
      return state;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, {
    selectedIds: new Set(),
    viewMode: 'list',
  });
  
  return (
    <NotificationContext.Provider value={{ state, dispatch }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
```

---

## 21. Styling Standards

### 21.1 Styling Approach

| Approach | When to Use |
|----------|-------------|
| Tailwind CSS | Default for all components |
| CSS Modules | Complex animations, legacy components |
| Inline styles | Dynamic values only (e.g., calculated positions) |

### 21.2 Tailwind Best Practices

```tsx
// ✅ GOOD: Organized, readable classes
<button
  className={cn(
    // Base styles
    'inline-flex items-center justify-center',
    'rounded-md font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2',
    // Variant styles
    variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
    variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    // Size styles
    size === 'sm' && 'h-8 px-3 text-sm',
    size === 'md' && 'h-10 px-4',
    size === 'lg' && 'h-12 px-6 text-lg',
    // State styles
    disabled && 'opacity-50 cursor-not-allowed',
    // Custom classes
    className
  )}
>
  {children}
</button>

// ❌ BAD: Unorganized, hard to read
<button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 disabled:opacity-50">
```

### 21.3 Design Tokens

Use CSS variables for consistent theming:

```css
/* styles/tokens.css */
:root {
  /* Colors */
  --color-primary: 222.2 47.4% 11.2%;
  --color-primary-foreground: 210 40% 98%;
  --color-secondary: 210 40% 96.1%;
  --color-destructive: 0 84.2% 60.2%;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.dark {
  --color-primary: 210 40% 98%;
  --color-primary-foreground: 222.2 47.4% 11.2%;
  /* ... dark mode overrides */
}
```

### 21.4 Responsive Design

```tsx
// Mobile-first approach
<div className={cn(
  // Mobile (default)
  'flex flex-col gap-4 p-4',
  // Tablet (md: 768px+)
  'md:flex-row md:gap-6 md:p-6',
  // Desktop (lg: 1024px+)
  'lg:gap-8 lg:p-8',
  // Wide (xl: 1280px+)
  'xl:max-w-7xl xl:mx-auto'
)}>
```

---

## 22. Component Library Standards

### 22.1 Mandatory: shadcn/ui

All UI components MUST use **shadcn/ui** components. Custom CSS is discouraged.

| Rule | Status |
|------|--------|
| Use shadcn/ui components | ✅ MANDATORY |
| Avoid custom CSS | ✅ MANDATORY |
| Extend shadcn components when needed | ✅ ALLOWED |
| Use Tailwind for styling | ✅ MANDATORY |
| Raw HTML elements (div, span) only for layout | ✅ ALLOWED |

### 22.2 Core shadcn Components

```tsx
// ✅ CORRECT: Using shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ❌ WRONG: Custom components or raw HTML
<button className="custom-button">Click me</button>
<div className="custom-card">...</div>
```

### 22.3 Extending shadcn Components

When you need custom behavior, extend shadcn components:

```tsx
// @/components/ui/button-loading.tsx
import { Button, ButtonProps } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface ButtonLoadingProps extends ButtonProps {
  loading?: boolean;
}

export function ButtonLoading({ 
  loading, 
  disabled, 
  children, 
  className,
  ...props 
}: ButtonLoadingProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading && (
        <Icon 
          icon="lucide:loader-2" 
          className="mr-2 h-4 w-4 animate-spin" 
        />
      )}
      {children}
    </Button>
  );
}
```

### 22.4 Form Components

Use shadcn form components with react-hook-form:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

export function NotificationForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '' },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Handle submit
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormDescription>
                The notification recipient name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## 23. DataTable Standards

### 23.1 Mandatory DataTable Features

All data tables MUST include:

| Feature | Status | Description |
|---------|--------|-------------|
| Pagination | ✅ MANDATORY | Page size selector, page navigation |
| Sorting | ✅ MANDATORY | Click column headers to sort |
| Filtering | ✅ MANDATORY | Global search and/or column filters |
| Primary Column | ✅ MANDATORY | Name/title as first column, clickable |
| Actions Column | ✅ MANDATORY | View, Edit, Delete actions |
| Loading State | ✅ MANDATORY | Skeleton or spinner while loading |
| Empty State | ✅ MANDATORY | Message when no data |
| Responsive | ✅ MANDATORY | Works on all screen sizes |

### 23.2 Standard DataTable Component

Create a reusable DataTable wrapper:

```tsx
// @/components/ui/data-table/DataTable.tsx
import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  isLoading = false,
  pageSize = 10,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation('common');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize },
    },
  });

  if (isLoading) {
    return <DataTableSkeleton columns={columns.length} />;
  }

  return (
    <div className="space-y-4">
      {/* Search/Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            placeholder={searchPlaceholder || t('table.search')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <Icon
                            icon={
                              header.column.getIsSorted() === 'asc'
                                ? 'lucide:arrow-up'
                                : header.column.getIsSorted() === 'desc'
                                ? 'lucide:arrow-down'
                                : 'lucide:arrow-up-down'
                            }
                            className="h-4 w-4"
                          />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('table.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
```

### 23.3 Primary Column (Clickable Name/Title)

The first column MUST be the primary identifier (name, title) and MUST be clickable:

```tsx
// columns/notificationColumns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Notification } from '../types';
import { DataTableRowActions } from '@/components/ui/data-table/DataTableRowActions';

export const notificationColumns: ColumnDef<Notification>[] = [
  // ✅ FIRST COLUMN: Primary identifier (clickable)
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
      <Link
        to={`/notifications/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.getValue('title')}
      </Link>
    ),
  },
  
  // Other columns...
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant={getTypeVariant(row.getValue('type'))}>
        {row.getValue('type')}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => formatDate(row.getValue('createdAt')),
  },
  
  // ✅ LAST COLUMN: Actions
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DataTableRowActions
        row={row}
        onView={() => navigate(`/notifications/${row.original.id}`)}
        onEdit={() => navigate(`/notifications/${row.original.id}/edit`)}
        onDelete={() => handleDelete(row.original.id)}
      />
    ),
  },
];
```

### 23.4 Actions Column Component

```tsx
// @/components/ui/data-table/DataTableRowActions.tsx
import { Row } from '@tanstack/react-table';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  customActions?: Array<{
    label: string;
    icon: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
  }>;
}

export function DataTableRowActions<TData>({
  row,
  onView,
  onEdit,
  onDelete,
  customActions,
}: DataTableRowActionsProps<TData>) {
  const { t } = useTranslation('common');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label={t('table.actions')}
        >
          <Icon icon="lucide:more-horizontal" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Icon icon="lucide:eye" className="mr-2 h-4 w-4" />
            {t('actions.view')}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Icon icon="lucide:pencil" className="mr-2 h-4 w-4" />
            {t('actions.edit')}
          </DropdownMenuItem>
        )}
        {customActions?.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={action.onClick}
            className={action.variant === 'destructive' ? 'text-destructive' : ''}
          >
            <Icon icon={action.icon} className="mr-2 h-4 w-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Icon icon="lucide:trash-2" className="mr-2 h-4 w-4" />
              {t('actions.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 23.5 Pagination Component

```tsx
// @/components/ui/data-table/DataTablePagination.tsx
import { Table } from '@tanstack/react-table';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation('common');

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {t('table.showing', {
          from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
          to: Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          ),
          total: table.getFilteredRowModel().rows.length,
        })}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {t('table.rowsPerPage')}
          </span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon icon="lucide:chevrons-left" className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <Icon icon="lucide:chevron-left" className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <Icon icon="lucide:chevron-right" className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <Icon icon="lucide:chevrons-right" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 24. Icon Standards

### 24.1 Mandatory: Iconify with Lucide

All icons MUST use **@iconify/react** with the **lucide** icon set.

| Rule | Status |
|------|--------|
| Use @iconify/react | ✅ MANDATORY |
| Use lucide icon set | ✅ MANDATORY |
| No other icon libraries | ✅ MANDATORY |
| Consistent sizing | ✅ MANDATORY |

### 24.2 Installation

```bash
npm install @iconify/react
```

### 24.3 Icon Usage

```tsx
import { Icon } from '@iconify/react';

// Basic usage
<Icon icon="lucide:bell" />

// With size (use Tailwind classes)
<Icon icon="lucide:bell" className="h-4 w-4" />
<Icon icon="lucide:bell" className="h-5 w-5" />
<Icon icon="lucide:bell" className="h-6 w-6" />

// With color
<Icon icon="lucide:check" className="h-4 w-4 text-green-500" />
<Icon icon="lucide:x" className="h-4 w-4 text-destructive" />

// In buttons
<Button>
  <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
  Add New
</Button>

// Loading spinner
<Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
```

### 24.4 Common Icons Reference

| Purpose | Icon | Code |
|---------|------|------|
| Add/Create | ➕ | `lucide:plus` |
| Edit | ✏️ | `lucide:pencil` |
| Delete | 🗑️ | `lucide:trash-2` |
| View | 👁️ | `lucide:eye` |
| Search | 🔍 | `lucide:search` |
| Settings | ⚙️ | `lucide:settings` |
| User | 👤 | `lucide:user` |
| Notification | 🔔 | `lucide:bell` |
| Close | ✕ | `lucide:x` |
| Check | ✓ | `lucide:check` |
| Warning | ⚠️ | `lucide:alert-triangle` |
| Error | ❌ | `lucide:alert-circle` |
| Info | ℹ️ | `lucide:info` |
| Loading | ⏳ | `lucide:loader-2` |
| Menu | ☰ | `lucide:menu` |
| More | ⋯ | `lucide:more-horizontal` |
| Arrow Right | → | `lucide:arrow-right` |
| Arrow Left | ← | `lucide:arrow-left` |
| Chevron Down | ▼ | `lucide:chevron-down` |
| Sort | ↕️ | `lucide:arrow-up-down` |
| Filter | 🔽 | `lucide:filter` |
| Download | ⬇️ | `lucide:download` |
| Upload | ⬆️ | `lucide:upload` |
| Copy | 📋 | `lucide:copy` |
| Link | 🔗 | `lucide:link` |
| Calendar | 📅 | `lucide:calendar` |
| Clock | 🕐 | `lucide:clock` |
| Mail | ✉️ | `lucide:mail` |
| Phone | 📞 | `lucide:phone` |

### 24.5 Icon Button Component

```tsx
// @/components/ui/icon-button.tsx
import { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: string;
  label: string;  // Required for accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, className, size = 'icon', variant = 'ghost', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn('h-8 w-8', className)}
        aria-label={label}
        {...props}
      >
        <Icon icon={icon} className="h-4 w-4" />
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

// Usage
<IconButton icon="lucide:trash-2" label="Delete item" onClick={handleDelete} />
```

---

## 25. Internationalization (i18n)

### 25.1 Mandatory: react-i18next

All UI text MUST be internationalized using **react-i18next**.

| Rule | Status |
|------|--------|
| Use react-i18next | ✅ MANDATORY |
| Default language: English | ✅ MANDATORY |
| Translation files in /locales/ | ✅ MANDATORY |
| JSON format | ✅ MANDATORY |
| No hardcoded UI text | ✅ MANDATORY |

### 25.2 Setup

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from '@/locales/en/common.json';
import enNotifications from '@/locales/en/notifications.json';
// Add more modules...

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        notifications: enNotifications,
      },
      // Add more languages...
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### 25.3 Translation File Structure

```
src/
└── locales/
    ├── en/                          # English (default)
    │   ├── common.json              # Shared translations
    │   ├── notifications.json       # Notification module
    │   ├── users.json               # User module
    │   ├── auth.json                # Authentication
    │   └── ...
    ├── fr/                          # French
    │   ├── common.json
    │   └── ...
    └── es/                          # Spanish
        └── ...
```

### 25.4 Translation File Format

```json
// locales/en/common.json
{
  "app": {
    "name": "Coder IDE",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "view": "View",
    "create": "Create",
    "submit": "Submit",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next"
  },
  "table": {
    "search": "Search...",
    "noResults": "No results found",
    "rowsPerPage": "Rows per page",
    "showing": "Showing {{from}} to {{to}} of {{total}} results",
    "actions": "Actions"
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email",
    "minLength": "Must be at least {{min}} characters"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "completed": "Completed"
  },
  "confirm": {
    "delete": {
      "title": "Delete {{item}}?",
      "description": "This action cannot be undone.",
      "confirm": "Delete",
      "cancel": "Cancel"
    }
  }
}
```

```json
// locales/en/notifications.json
{
  "title": "Notifications",
  "list": {
    "title": "All Notifications",
    "empty": "No notifications yet",
    "markAllRead": "Mark all as read"
  },
  "create": {
    "title": "Create Notification",
    "success": "Notification created successfully"
  },
  "form": {
    "title": "Title",
    "titlePlaceholder": "Enter notification title",
    "message": "Message",
    "messagePlaceholder": "Enter notification message",
    "type": "Type",
    "recipient": "Recipient"
  },
  "types": {
    "email": "Email",
    "push": "Push Notification",
    "sms": "SMS",
    "inApp": "In-App"
  }
}
```

### 25.5 Using Translations

```tsx
import { useTranslation } from 'react-i18next';

function NotificationList() {
  // Load specific namespace
  const { t } = useTranslation('notifications');
  // Or load multiple
  const { t: tCommon } = useTranslation('common');

  return (
    <div>
      <h1>{t('list.title')}</h1>
      
      {/* With interpolation */}
      <p>{tCommon('table.showing', { from: 1, to: 10, total: 100 })}</p>
      
      {/* Nested keys */}
      <Button>{tCommon('actions.save')}</Button>
      
      {/* Dynamic keys */}
      <Badge>{t(`types.${notification.type}`)}</Badge>
    </div>
  );
}
```

### 25.6 Translation in Non-Component Code

```typescript
// For services, utilities, etc.
import i18n from '@/i18n';

function formatErrorMessage(error: Error): string {
  return i18n.t('common:validation.required');
}
```

---

## 26. Mobile & Responsive Design

### 26.1 Responsive Requirements

| Requirement | Status |
|-------------|--------|
| Mobile-first approach | ✅ MANDATORY |
| All pages fully responsive | ✅ MANDATORY |
| No horizontal scroll on mobile | ✅ MANDATORY |
| Touch-friendly targets (44px min) | ✅ MANDATORY |
| No modals on mobile | ✅ MANDATORY |

### 26.2 Breakpoints

Use Tailwind's default breakpoints:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| (default) | 0px | Mobile phones |
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### 26.3 Mobile Alternatives to Modals

**❌ NEVER use modals on mobile. Use these alternatives:**

#### Full-Screen Pages (Recommended)

```tsx
// Desktop: Modal | Mobile: Full page
function CreateNotificationButton() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const handleClick = () => {
    if (isMobile) {
      // Navigate to full page
      navigate('/notifications/create');
    } else {
      // Open modal (desktop only)
      setModalOpen(true);
    }
  };
  
  return (
    <>
      <Button onClick={handleClick}>
        <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
        Create
      </Button>
      
      {/* Desktop modal */}
      {!isMobile && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <NotificationForm />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Mobile: Full-screen page with slide animation
// pages/notifications/CreateNotificationPage.tsx
function CreateNotificationPage() {
  const navigate = useNavigate();
  
  return (
    <div className="fixed inset-0 bg-background z-50 animate-slide-in-right">
      <header className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <Icon icon="lucide:arrow-left" className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Create Notification</h1>
      </header>
      <main className="p-4">
        <NotificationForm />
      </main>
    </div>
  );
}
```

#### Bottom Sheet for Quick Actions

```tsx
// @/components/ui/bottom-sheet.tsx
import { Drawer } from 'vaul';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({ 
  open, 
  onOpenChange, 
  children, 
  title 
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-4" />
          {title && (
            <Drawer.Title className="px-4 pb-4 text-lg font-semibold">
              {title}
            </Drawer.Title>
          )}
          <div className="px-4 pb-8">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Usage for confirmations
function DeleteConfirmation({ open, onOpenChange, onConfirm }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t } = useTranslation('common');
  
  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={t('confirm.delete.title')}>
        <p className="text-muted-foreground mb-6">
          {t('confirm.delete.description')}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="destructive" onClick={onConfirm} className="w-full">
            {t('confirm.delete.confirm')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            {t('confirm.delete.cancel')}
          </Button>
        </div>
      </BottomSheet>
    );
  }
  
  // Desktop: Use AlertDialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* ... desktop dialog */}
    </AlertDialog>
  );
}
```

### 26.4 Mobile Table Actions

```tsx
// On mobile: Dropdown menu + Long press support
function DataTableRowActions({ row, onView, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const longPressRef = useLongPress(() => setShowActions(true), { delay: 500 });
  
  return (
    <>
      {/* Dropdown trigger (always visible) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Icon icon="lucide:more-horizontal" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onView}>
            <Icon icon="lucide:eye" className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Icon icon="lucide:pencil" className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Icon icon="lucide:trash-2" className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Mobile: Bottom sheet on long press (optional enhancement) */}
      <BottomSheet open={showActions} onOpenChange={setShowActions} title="Actions">
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onView} className="w-full justify-start">
            <Icon icon="lucide:eye" className="mr-2 h-4 w-4" />
            View Details
          </Button>
          <Button variant="outline" onClick={onEdit} className="w-full justify-start">
            <Icon icon="lucide:pencil" className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={onDelete} className="w-full justify-start">
            <Icon icon="lucide:trash-2" className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
```

### 26.5 Responsive Layout Patterns

```tsx
// Responsive page layout
function NotificationListPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Header: Stack on mobile, row on desktop */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button className="w-full sm:w-auto">
          <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
          Create
        </Button>
      </div>
      
      {/* Filters: Full width on mobile */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row">
        <Input 
          placeholder="Search..." 
          className="w-full sm:max-w-xs" 
        />
        <Select>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
        </Select>
      </div>
      
      {/* Content */}
      <DataTable columns={columns} data={data} />
    </div>
  );
}
```

### 26.6 useMediaQuery Hook

```tsx
// @/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Convenience hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)');
}
```

---

## 27. Accessibility Requirements

### 27.1 Mandatory Accessibility

| Requirement | Status |
|-------------|--------|
| Semantic HTML | ✅ MANDATORY |
| Keyboard navigation | ✅ MANDATORY |
| ARIA labels for interactive elements | ✅ MANDATORY |
| Focus management | ✅ MANDATORY |
| Color contrast (WCAG AA) | ✅ MANDATORY |
| Screen reader support | ✅ MANDATORY |

### 27.2 Semantic HTML

```tsx
// ✅ GOOD: Semantic elements
<article className="notification-card">
  <header>
    <h3>{notification.title}</h3>
  </header>
  <p>{notification.message}</p>
  <footer>
    <time dateTime={notification.createdAt}>
      {formatDate(notification.createdAt)}
    </time>
  </footer>
</article>

// ❌ BAD: Div soup
<div className="notification-card">
  <div className="notification-title">{notification.title}</div>
  <div className="notification-message">{notification.message}</div>
  <div className="notification-time">{formatDate(notification.createdAt)}</div>
</div>
```

### 27.3 ARIA Attributes

```tsx
// Interactive elements need proper ARIA
<button
  aria-label="Mark notification as read"
  aria-pressed={notification.read}
  onClick={handleMarkAsRead}
>
  <CheckIcon aria-hidden="true" />
</button>

// Loading states
<div
  role="status"
  aria-live="polite"
  aria-busy={isLoading}
>
  {isLoading ? <Spinner /> : content}
</div>

// Error messages
<div
  role="alert"
  aria-live="assertive"
>
  {error && <p className="error">{error.message}</p>}
</div>

// Form fields
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <p id="email-error" className="error">
    {errors.email}
  </p>
)}
```

### 27.4 Keyboard Navigation

```tsx
// Handle keyboard events for custom components
function NotificationList({ notifications, onSelect }) {
  const [focusIndex, setFocusIndex] = useState(0);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusIndex(i => Math.min(i + 1, notifications.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(notifications[focusIndex]);
        break;
    }
  };
  
  return (
    <ul
      role="listbox"
      aria-label="Notifications"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {notifications.map((notification, index) => (
        <li
          key={notification.id}
          role="option"
          aria-selected={index === focusIndex}
          tabIndex={index === focusIndex ? 0 : -1}
        >
          <NotificationCard notification={notification} />
        </li>
      ))}
    </ul>
  );
}
```

### 27.5 Focus Management

```tsx
// Focus trap in modals
import { FocusTrap } from '@/components/FocusTrap';

function Modal({ isOpen, onClose, children }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <FocusTrap>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </FocusTrap>
  );
}
```

---

## 28. Performance Guidelines

### 28.1 Component Optimization

```tsx
// Memoize expensive renders
const NotificationList = memo(function NotificationList({ 
  notifications 
}: NotificationListProps) {
  return (
    <ul>
      {notifications.map(notification => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </ul>
  );
});

// Memoize callbacks passed to children
function NotificationPage() {
  const handleSelect = useCallback((id: string) => {
    // Handle selection
  }, []);
  
  const handleDelete = useCallback((id: string) => {
    // Handle delete
  }, []);
  
  return (
    <NotificationList
      notifications={notifications}
      onSelect={handleSelect}
      onDelete={handleDelete}
    />
  );
}

// Memoize expensive calculations
function NotificationStats({ notifications }) {
  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    byType: groupBy(notifications, 'type'),
  }), [notifications]);
  
  return <StatsDisplay stats={stats} />;
}
```

### 28.2 Code Splitting

```tsx
// Lazy load pages
const NotificationPage = lazy(() => 
  import('./pages/NotificationPage')
);

const SettingsPage = lazy(() => 
  import('./pages/SettingsPage')
);

// Use Suspense for loading
function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}

// Lazy load heavy components
const RichTextEditor = lazy(() => 
  import('@/components/RichTextEditor')
);

function NotificationComposer() {
  return (
    <Suspense fallback={<TextareaSkeleton />}>
      <RichTextEditor />
    </Suspense>
  );
}
```

### 28.3 Virtual Lists for Large Data

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function NotificationList({ notifications }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,  // Estimated row height
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <NotificationCard 
              notification={notifications[virtualRow.index]} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 28.4 Image Optimization

```tsx
// Lazy load images
<img
  src={notification.image}
  alt={notification.title}
  loading="lazy"
  decoding="async"
/>

// Use responsive images
<picture>
  <source
    srcSet={`${imageUrl}?w=400 1x, ${imageUrl}?w=800 2x`}
    media="(max-width: 768px)"
  />
  <source
    srcSet={`${imageUrl}?w=800 1x, ${imageUrl}?w=1600 2x`}
    media="(min-width: 769px)"
  />
  <img src={imageUrl} alt={alt} />
</picture>
```

---

## 29. UI Testing Requirements

### 29.1 Testing Pyramid

| Test Type | Coverage | Focus |
|-----------|----------|-------|
| Unit Tests | ≥ 80% | Hooks, utils, logic |
| Component Tests | Critical components | Rendering, interactions |
| Integration Tests | User flows | Multi-component behavior |
| E2E Tests | Happy paths | Full user journeys |

### 29.2 Component Testing

```tsx
// NotificationCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationCard } from './NotificationCard';
import { createMockNotification } from '@/test/factories';

describe('NotificationCard', () => {
  it('renders notification content', () => {
    const notification = createMockNotification({
      title: 'Test Title',
      message: 'Test Message',
    });
    
    render(<NotificationCard notification={notification} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', async () => {
    const notification = createMockNotification();
    const handleClick = vi.fn();
    
    render(
      <NotificationCard 
        notification={notification} 
        onClick={handleClick} 
      />
    );
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledWith(notification);
  });
  
  it('shows unread indicator for unread notifications', () => {
    const notification = createMockNotification({ read: false });
    
    render(<NotificationCard notification={notification} />);
    
    expect(screen.getByRole('button')).toHaveClass('notification-card--unread');
  });
  
  it('is accessible', async () => {
    const notification = createMockNotification();
    const { container } = render(<NotificationCard notification={notification} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 29.3 Hook Testing

```tsx
// useNotifications.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from './useNotifications';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useNotifications', () => {
  it('fetches notifications', async () => {
    const mockNotifications = [
      createMockNotification({ id: '1' }),
      createMockNotification({ id: '2' }),
    ];
    
    server.use(
      http.get('/api/v1/notifications', () => {
        return HttpResponse.json({ data: mockNotifications });
      })
    );
    
    const { result } = renderHook(
      () => useNotifications({}),
      { wrapper }
    );
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toEqual(mockNotifications);
  });
  
  it('handles errors', async () => {
    server.use(
      http.get('/api/v1/notifications', () => {
        return HttpResponse.json(
          { error: { message: 'Server error' } },
          { status: 500 }
        );
      })
    );
    
    const { result } = renderHook(
      () => useNotifications({}),
      { wrapper }
    );
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

### 29.4 Integration Testing

```tsx
// NotificationFlow.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPage } from './NotificationPage';
import { AppProviders } from '@/test/AppProviders';

describe('Notification Flow', () => {
  it('allows user to filter and mark notifications as read', async () => {
    const user = userEvent.setup();
    
    render(
      <AppProviders>
        <NotificationPage />
      </AppProviders>
    );
    
    // Wait for notifications to load
    await screen.findByText('Notification 1');
    
    // Filter by unread
    await user.click(screen.getByRole('combobox', { name: /filter/i }));
    await user.click(screen.getByRole('option', { name: /unread/i }));
    
    // Verify filter applied
    expect(screen.queryByText('Read Notification')).not.toBeInTheDocument();
    
    // Mark first notification as read
    const firstNotification = screen.getByText('Notification 1').closest('article');
    const markReadButton = within(firstNotification!).getByRole('button', { 
      name: /mark as read/i 
    });
    await user.click(markReadButton);
    
    // Verify notification removed from unread list
    await waitFor(() => {
      expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
    });
  });
});
```

---

## 30. UI Naming Conventions

### 30.1 File Naming

| Type | Convention | Example |
|------|------------|---------|
| Pages | PascalCase + Page | `NotificationListPage.tsx` |
| Components | PascalCase | `NotificationCard.tsx` |
| Hooks | camelCase + use prefix | `useNotifications.ts` |
| Contexts | PascalCase + Context | `NotificationContext.tsx` |
| Utils | camelCase | `formatNotification.ts` |
| Types | camelCase + .types | `notification.types.ts` |
| Tests | same as source + .test | `NotificationCard.test.tsx` |
| Stories | same as source + .stories | `NotificationCard.stories.tsx` |

### 30.2 Component Naming

```tsx
// Page components: [Resource]Page or [Resource][Action]Page
NotificationListPage
NotificationDetailPage
NotificationCreatePage

// Feature components: [Feature] or [Resource][Feature]
NotificationComposer
NotificationFilters
NotificationBulkActions

// UI components: descriptive name
NotificationCard
NotificationBadge
NotificationIcon
NotificationSkeleton

// Layout components: [Name]Layout
PageLayout
SidebarLayout
DashboardLayout

// Provider components: [Feature]Provider
NotificationProvider
ThemeProvider
AuthProvider
```

### 30.3 Props and Event Handlers

```tsx
// Props: descriptive, boolean as is/has/should
interface ComponentProps {
  isLoading: boolean;
  isDisabled: boolean;
  hasError: boolean;
  shouldAutoFocus: boolean;
}

// Event handlers: on[Event] for props
interface ComponentProps {
  onClick: () => void;
  onChange: (value: string) => void;
  onSubmit: (data: FormData) => void;
  onNotificationSelect: (notification: Notification) => void;
}

// Internal handlers: handle[Event]
function Component({ onClick }) {
  const handleClick = () => {
    // Internal logic
    onClick?.();
  };
}
```

### 30.4 CSS Class Naming (BEM-inspired)

```tsx
// Block: component name
// Element: block__element
// Modifier: block--modifier or block__element--modifier

<article className="notification-card notification-card--unread">
  <header className="notification-card__header">
    <h3 className="notification-card__title">Title</h3>
  </header>
  <div className="notification-card__content">
    <p className="notification-card__message notification-card__message--truncated">
      Message...
    </p>
  </div>
  <footer className="notification-card__footer">
    <time className="notification-card__time">2 hours ago</time>
  </footer>
</article>
```

---

## Related Documentation

- [Module Overview](./ModuleOverview.md) - Module list and responsibilities
- [Architecture](./Architecture.md) - System architecture
- [Data Flow](./DataFlow.md) - Communication patterns
- [Technology Stack](./TechnologyStack.md) - Technologies used

---

*Document Version: 1.2*  
*Last Updated: 2025-01-22*

