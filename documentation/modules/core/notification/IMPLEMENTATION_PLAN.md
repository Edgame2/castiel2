# Notification Manager Module - Implementation Plan

## Executive Summary

**Module**: Notification Manager  
**Type**: Core Module  
**Port**: 3001 (configurable via env)  
**Status**: New Implementation  
**Estimated Effort**: 6-8 weeks  

### Current State
- No dedicated notification service
- Notifications likely handled ad-hoc in main application
- No multi-channel support
- No provider abstraction
- No preference management
- No delivery tracking

### Target State
- Enterprise-grade multi-channel notification system
- Event-driven architecture via RabbitMQ
- Provider abstraction for easy switching
- Hierarchical preference management (Global → Org → Team → Project → User)
- Presence-aware intelligent routing
- Escalation chains for critical notifications
- Template system with i18n support
- Comprehensive delivery tracking and metrics
- Webhook integration (incoming/outgoing)

---

## Table of Contents

1. [Requirements Summary](#1-requirements-summary)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [Module Structure](#4-module-structure)
5. [Implementation Phases](#5-implementation-phases)
6. [API Specification](#6-api-specification)
7. [Configuration Schema](#7-configuration-schema)
8. [Error Handling](#8-error-handling)
9. [Observability & Metrics](#9-observability--metrics)
10. [Integration Points](#10-integration-points)
11. [Testing Strategy](#11-testing-strategy)
12. [Frontend Implementation](#12-frontend-implementation)
13. [Deployment Checklist](#13-deployment-checklist)

---

## 1. Requirements Summary

### Functional Requirements

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Multi-Channel Delivery | In-App, Email, Push, SMS, WhatsApp, Voice | P0 |
| Event-Driven Architecture | RabbitMQ consumer for platform events | P0 |
| Provider Abstraction | Pluggable providers (SendGrid, Twilio, FCM, etc.) | P0 |
| Template System | Multi-language templates with variable substitution | P0 |
| Preference Management | Hierarchical preferences (Global → Org → Team → Project → User) | P0 |
| Delivery Tracking | Track delivery status, receipts, metrics | P0 |
| Retry & Reliability | Exponential backoff, deduplication, rate limiting | P0 |
| Presence-Aware Routing | Smart channel selection based on user online status | P1 |
| Escalation Chains | Automatic escalation for critical notifications | P1 |
| Quiet Hours/DND | Configurable hold periods with critical override | P1 |
| Batch/Digest | Digest notifications for non-critical events | P1 |
| Webhook Integration | Incoming/outgoing webhooks (CloudEvents) | P1 |
| Admin API | Internal API for template/preference management | P0 |

### Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Throughput | 10,000 notifications/second |
| Latency | < 100ms for in-app, < 500ms for external channels |
| Availability | 99.9% uptime |
| Delivery Guarantee | At-least-once with deduplication |
| Scalability | Horizontally scalable workers |
| Multi-tenancy | Organization-isolated data |

### Compliance Requirements

| Standard | Requirements |
|----------|--------------|
| GDPR | User preference management, data export |
| SOC2 | Audit trail for all notifications |
| HIPAA | Secure delivery, encryption in transit |

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Main Application                               │
│  (Publishes events to RabbitMQ)                                         │
└──────────┬───────────────────────────────────────────────────────────────┘
           │
           │ RabbitMQ Events
           │ (notification.events exchange)
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION MANAGER CONTAINER                        │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Event Consumer                                │  │
│  │  • Consumes from RabbitMQ queues                                  │  │
│  │  • Routes to event handlers                                       │  │
│  └───────────────────────────┬─────────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Notification Engine                               │  │
│  │                                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │   Routing    │  │   Template   │  │  Preference  │          │  │
│  │  │   Engine     │  │   Renderer   │  │   Resolver   │          │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │  │
│  │                                                                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │  Escalation  │  │  Presence   │  │   Delivery   │          │  │
│  │  │   Manager    │  │   Tracker   │  │   Manager   │          │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                           │
│                              ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Provider Abstraction Layer                            │  │
│  │                                                                     │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐      │  │
│  │  │ Email  │  │  SMS   │  │  Push │  │WhatsApp│  │  Voice  │      │  │
│  │  │Provider│  │Provider│  │Provider│  │Provider│  │ Provider│      │  │
│  │  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └────┬─────┘      │  │
│  └──────┼───────────┼───────────┼───────────┼────────────┼────────────┘  │
│         │           │           │           │            │                │
│         ▼           ▼           ▼           ▼            ▼                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              External Notification Services                        │  │
│  │  SendGrid │ Twilio │ FCM │ WhatsApp API │ Vonage │ etc.           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │   Admin API     │  │   PostgreSQL    │  │   RabbitMQ      │          │
│  │  (Internal)     │  │   (Own DB)     │  │   (Consumer)    │          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Event Consumer** | Consumes notification events from RabbitMQ queues |
| **Notification Engine** | Core orchestration of notification processing |
| **Routing Engine** | Determines which channels to use based on preferences, presence, criticality |
| **Template Renderer** | Renders notification content from templates with variable substitution |
| **Preference Resolver** | Resolves effective preferences from hierarchy (Global → Org → Team → Project → User) |
| **Escalation Manager** | Manages escalation chains and timing for critical notifications |
| **Presence Tracker** | Tracks user online status for presence-aware delivery |
| **Delivery Manager** | Orchestrates delivery across multiple channels |
| **Provider Layer** | Abstract interface to external notification services |
| **Retry Service** | Exponential backoff retry logic |
| **Deduplication Service** | Prevents duplicate notification delivery |
| **Rate Limiter** | Enforces rate limits per user/channel |
| **Delivery Tracker** | Tracks delivery status, receipts, and metrics |
| **Admin API** | Internal API for template/preference management |

---

## 3. Data Model

### Core Entities

#### Notification

```typescript
interface Notification {
  // Identity
  id: string;                    // UUID
  organizationId: string;        // Tenant isolation
  
  // Event source
  eventType: string;             // e.g., "task.assigned", "incident.created"
  eventCategory: EventCategory;
  sourceModule: string;          // e.g., "task-management", "incidents"
  sourceResourceId?: string;     // e.g., Task ID, Incident ID
  sourceResourceType?: string;   // e.g., "task", "incident"
  
  // Recipient
  recipientId: string;           // User ID
  recipientEmail?: string;
  recipientPhone?: string;
  
  // Content
  title: string;
  body: string;
  bodyHtml?: string;            // Rich HTML content
  actionUrl?: string;           // Deep link
  actionLabel?: string;         // e.g., "View Task"
  imageUrl?: string;
  
  // Metadata
  metadata?: JsonObject;         // Additional context
  
  // Criticality & Routing
  criticality: NotificationCriticality;
  channelsRequested: NotificationChannel[];
  channelsDelivered: NotificationChannel[];
  
  // Status
  status: NotificationStatus;   // PENDING, PROCESSING, DELIVERED, FAILED, etc.
  
  // Timing
  scheduledFor?: Date;          // Scheduled delivery
  expiresAt?: Date;              // Notification expiry
  
  // Context
  teamId?: string;
  projectId?: string;
  
  // Escalation
  escalationChainId?: string;
  escalationLevel: number;      // Default: 0
  
  // Batch/Digest
  batchId?: string;
  
  // Deduplication
  deduplicationKey?: string;
  
  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  
  // Relations
  deliveries: NotificationDelivery[];
}

enum EventCategory {
  PROJECT_MANAGEMENT = 'PROJECT_MANAGEMENT',
  COLLABORATION = 'COLLABORATION',
  AI_PLANNING = 'AI_PLANNING',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  INCIDENTS = 'INCIDENTS',
  CALENDAR = 'CALENDAR',
  SECURITY = 'SECURITY',
  BILLING = 'BILLING'
}

enum NotificationCriticality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  VOICE = 'VOICE'
}

enum NotificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  FAILED = 'FAILED',
  SCHEDULED = 'SCHEDULED',
  HELD = 'HELD',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}
```

#### NotificationDelivery

```typescript
interface NotificationDelivery {
  id: string;
  notificationId: string;
  notification: Notification;
  
  // Channel
  channel: NotificationChannel;
  providerId: string;            // Which provider was used
  
  // Status
  status: DeliveryStatus;        // PENDING, SENT, DELIVERED, FAILED, etc.
  
  // Provider response
  providerMessageId?: string;    // Provider's message ID
  providerResponse?: JsonObject; // Raw provider response
  
  // Timing
  attemptedAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  
  // Retry
  retryCount: number;
  lastError?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  REJECTED = 'REJECTED'
}
```

#### NotificationTemplate

```typescript
interface NotificationTemplate {
  id: string;
  organizationId?: string;      // null = global template
  
  // Identity
  name: string;                  // Unique name
  eventType: string;             // e.g., "task.assigned"
  channel: NotificationChannel;
  
  // Content
  subject?: string;              // For email
  body: string;                  // Template body
  bodyHtml?: string;             // HTML template
  
  // Variables
  variables: string[];           // Available variables
  
  // Localization
  locale: string;               // e.g., "en", "fr"
  
  // Settings
  enabled: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

#### NotificationPreference

```typescript
interface NotificationPreference {
  id: string;
  
  // Scope
  scope: PreferenceScope;
  scopeId?: string;             // User ID, Team ID, Project ID, etc.
  organizationId: string;
  
  // Channel preferences
  channels: {
    [key in NotificationChannel]: {
      enabled: boolean;
      quietHours?: QuietHours;
    };
  };
  
  // Category preferences
  categories: {
    [key in EventCategory]: {
      enabled: boolean;
      channels: NotificationChannel[];
      criticalityThreshold: NotificationCriticality;
    };
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

enum PreferenceScope {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
  USER = 'USER'
}

interface QuietHours {
  enabled: boolean;
  startTime: string;            // HH:mm format
  endTime: string;              // HH:mm format
  timezone: string;             // IANA timezone
  daysOfWeek: number[];        // 0-6 (Sunday-Saturday)
  criticalityOverride: boolean; // Allow critical notifications
}
```

#### EscalationChain

```typescript
interface EscalationChain {
  id: string;
  organizationId: string;
  
  name: string;
  description?: string;
  
  // Levels
  levels: EscalationLevel[];
  
  enabled: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

interface EscalationLevel {
  level: number;                // 1, 2, 3, ...
  delayMinutes: number;          // Wait before escalating
  channels: NotificationChannel[];
  recipients: string[];          // User IDs or roles
}
```

### Database Schema (Prisma)

```prisma
// Notification Core
model Notification {
  id                    String                @id @default(uuid())
  organizationId        String
  eventType             String
  eventCategory         EventCategory
  sourceModule          String
  sourceResourceId      String?
  sourceResourceType    String?
  recipientId           String
  recipientEmail        String?
  recipientPhone        String?
  title                 String
  body                  String
  bodyHtml              String?
  actionUrl             String?
  actionLabel           String?
  imageUrl              String?
  metadata              Json?
  criticality            NotificationCriticality
  channelsRequested     NotificationChannel[]
  channelsDelivered     NotificationChannel[]
  status                NotificationStatus    @default(PENDING)
  scheduledFor          DateTime?
  expiresAt              DateTime?
  teamId                String?
  projectId              String?
  escalationChainId     String?
  escalationLevel       Int                   @default(0)
  batchId                String?
  deduplicationKey       String?
  createdAt              DateTime              @default(now())
  processedAt           DateTime?
  completedAt           DateTime?
  
  deliveries             NotificationDelivery[]
  escalationChain       EscalationChain?       @relation(fields: [escalationChainId], references: [id])
  batch                 NotificationBatch?     @relation(fields: [batchId], references: [id])
  
  @@index([recipientId, status])
  @@index([recipientId, createdAt])
  @@index([organizationId, createdAt])
  @@index([eventType, createdAt])
  @@index([status, scheduledFor])
  @@index([deduplicationKey])
}

model NotificationDelivery {
  id                    String                @id @default(uuid())
  notificationId        String
  notification          Notification          @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  channel               NotificationChannel
  providerId            String
  status                DeliveryStatus        @default(PENDING)
  providerMessageId     String?
  providerResponse      Json?
  attemptedAt           DateTime?
  deliveredAt           DateTime?
  failedAt              DateTime?
  retryCount             Int                   @default(0)
  lastError              String?
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  @@index([notificationId])
  @@index([channel, status])
  @@index([providerId, status])
}

model NotificationTemplate {
  id                    String                @id @default(uuid())
  organizationId        String?
  name                  String
  eventType             String
  channel               NotificationChannel
  subject               String?
  body                  String
  bodyHtml              String?
  variables             String[]
  locale                String                @default("en")
  enabled               Boolean                @default(true)
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  @@unique([organizationId, name, channel, locale])
  @@index([eventType, channel])
}

model NotificationPreference {
  id                    String                @id @default(uuid())
  scope                 PreferenceScope
  scopeId               String?
  organizationId        String
  channels              Json                   // Channel preferences
  categories            Json                   // Category preferences
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  @@unique([scope, scopeId, organizationId])
  @@index([organizationId, scope])
}

model EscalationChain {
  id                    String                @id @default(uuid())
  organizationId        String
  name                  String
  description           String?
  levels                Json                   // EscalationLevel[]
  enabled               Boolean                @default(true)
  createdAt              DateTime              @default(now())
  updatedAt              DateTime              @updatedAt
  
  notifications         Notification[]
  
  @@index([organizationId])
}

// Enums
enum EventCategory {
  PROJECT_MANAGEMENT
  COLLABORATION
  AI_PLANNING
  SYSTEM_ADMIN
  INCIDENTS
  CALENDAR
  SECURITY
  BILLING
}

enum NotificationCriticality {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
  SMS
  WHATSAPP
  VOICE
}

enum NotificationStatus {
  PENDING
  PROCESSING
  DELIVERED
  PARTIALLY_DELIVERED
  FAILED
  SCHEDULED
  HELD
  EXPIRED
  CANCELLED
}

enum DeliveryStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  BOUNCED
  REJECTED
}

enum PreferenceScope {
  GLOBAL
  ORGANIZATION
  TEAM
  PROJECT
  USER
}
```

---

## 4. Module Structure

### Directory Layout

```
containers/notification-manager/
├── Dockerfile
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
│
├── config/
│   ├── default.yaml
│   ├── production.yaml
│   ├── test.yaml
│   └── schema.json
│
├── docs/
│   ├── openapi.yaml
│   ├── architecture.md
│   └── examples/
│
├── src/
│   ├── server.ts                    # Entry point
│   │
│   ├── config/
│   │   ├── index.ts                 # Config loader
│   │   ├── types.ts                 # Config types
│   │   └── rabbitmq.config.ts       # RabbitMQ config
│   │
│   ├── consumers/
│   │   ├── EventConsumer.ts         # Main event consumer
│   │   ├── CommandConsumer.ts       # Command handler
│   │   └── handlers/
│   │       ├── TaskEventHandler.ts
│   │       ├── CollaborationEventHandler.ts
│   │       ├── IncidentEventHandler.ts
│   │       └── SystemEventHandler.ts
│   │
│   ├── engine/
│   │   ├── NotificationEngine.ts    # Core orchestration
│   │   ├── RoutingEngine.ts         # Channel selection
│   │   ├── EscalationManager.ts     # Escalation chains
│   │   ├── DeliveryManager.ts       # Delivery orchestration
│   │   └── BatchProcessor.ts        # Digest/batch processing
│   │
│   ├── preferences/
│   │   ├── PreferenceResolver.ts     # Hierarchical resolution
│   │   ├── PreferenceService.ts     # Preference CRUD
│   │   └── QuietHoursService.ts     # DND/quiet hours
│   │
│   ├── templates/
│   │   ├── TemplateEngine.ts        # Template rendering
│   │   ├── TemplateService.ts      # Template CRUD
│   │   ├── VariableResolver.ts      # Variable resolution
│   │   └── i18n/
│   │       ├── LocaleManager.ts
│   │       └── locales/
│   │           ├── en.json
│   │           └── fr.json
│   │
│   ├── providers/
│   │   ├── ProviderFactory.ts       # Provider instantiation
│   │   ├── ProviderRegistry.ts     # Provider registration
│   │   ├── BaseProvider.ts          # Abstract base class
│   │   │
│   │   ├── email/
│   │   │   ├── IEmailProvider.ts
│   │   │   ├── SendGridProvider.ts
│   │   │   ├── SESProvider.ts
│   │   │   ├── MailgunProvider.ts
│   │   │   └── SMTPProvider.ts
│   │   │
│   │   ├── sms/
│   │   │   ├── ISMSProvider.ts
│   │   │   ├── TwilioSMSProvider.ts
│   │   │   ├── AWSSNSProvider.ts
│   │   │   └── VonageSMSProvider.ts
│   │   │
│   │   ├── push/
│   │   │   ├── IPushProvider.ts
│   │   │   ├── FCMProvider.ts
│   │   │   ├── OneSignalProvider.ts
│   │   │   └── WebPushProvider.ts
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── IWhatsAppProvider.ts
│   │   │   ├── TwilioWhatsAppProvider.ts
│   │   │   └── MetaWhatsAppProvider.ts
│   │   │
│   │   └── voice/
│   │       ├── IVoiceProvider.ts
│   │       ├── TwilioVoiceProvider.ts
│   │       └── VonageVoiceProvider.ts
│   │
│   ├── presence/
│   │   ├── PresenceTracker.ts       # User presence tracking
│   │   └── PresenceStore.ts          # Redis-based store
│   │
│   ├── reliability/
│   │   ├── RetryService.ts           # Exponential backoff
│   │   ├── DeduplicationService.ts   # Duplicate detection
│   │   ├── RateLimiter.ts           # Rate limiting
│   │   └── CircuitBreaker.ts        # Provider circuit breaker
│   │
│   ├── tracking/
│   │   ├── DeliveryTracker.ts       # Delivery status tracking
│   │   ├── MetricsCollector.ts       # Notification metrics
│   │   └── AuditLogger.ts           # Audit logging
│   │
│   ├── webhooks/
│   │   ├── IncomingWebhookHandler.ts # Process external webhooks
│   │   ├── OutgoingWebhookService.ts # Send webhooks
│   │   └── WebhookValidator.ts       # Signature validation
│   │
│   ├── routes/
│   │   ├── index.ts                  # Route registration
│   │   ├── templates.ts              # Template management
│   │   ├── preferences.ts           # Preference management
│   │   ├── providers.ts              # Provider configuration
│   │   ├── history.ts                # Notification history
│   │   ├── webhooks.ts               # Webhook management
│   │   └── health.ts                 # Health check
│   │
│   ├── middleware/
│   │   ├── auth.ts                   # Authentication
│   │   ├── validation.ts            # Request validation
│   │   └── errorHandler.ts           # Error handling
│   │
│   ├── models/
│   │   └── Notification.ts           # Data models
│   │
│   ├── events/
│   │   ├── publisher.ts              # Event publishing
│   │   └── consumers/                # Event handlers
│   │
│   ├── jobs/
│   │   ├── ScheduledNotificationJob.ts
│   │   ├── EscalationJob.ts
│   │   ├── BatchProcessorJob.ts
│   │   └── CleanupJob.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── notification.types.ts
│   │   ├── channel.types.ts
│   │   ├── provider.types.ts
│   │   ├── preference.types.ts
│   │   ├── template.types.ts
│   │   └── event.types.ts
│   │
│   └── utils/
│       ├── logger.ts
│       └── helpers.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Set up basic infrastructure and core services

#### Tasks
- [ ] Initialize project structure
- [ ] Set up TypeScript configuration
- [ ] Create Dockerfile and docker-compose setup
- [ ] Set up Prisma schema and migrations
- [ ] Implement configuration loader with YAML support
- [ ] Set up database connection
- [ ] Implement basic logging
- [ ] Create health check endpoints
- [ ] Set up RabbitMQ connection
- [ ] Implement basic event consumer skeleton
- [ ] Create base types and interfaces

**Deliverables**:
- Working container that starts and connects to database
- Health check endpoint responding
- Basic RabbitMQ consumer receiving events
- Database schema migrated

### Phase 2: Core Engine (Week 2-3)

**Goal**: Implement core notification processing engine

#### Tasks
- [ ] Implement NotificationEngine (orchestration)
- [ ] Implement RoutingEngine (channel selection)
- [ ] Implement PreferenceResolver (hierarchical preferences)
- [ ] Implement basic preference service (CRUD)
- [ ] Implement TemplateEngine (rendering)
- [ ] Implement VariableResolver (dynamic variables)
- [ ] Create default templates
- [ ] Implement DeliveryManager (orchestration)
- [ ] Set up basic event handlers

**Deliverables**:
- Notification engine processes events end-to-end
- Preferences resolved from hierarchy
- Templates render with variables
- Basic delivery flow works

### Phase 3: Provider Layer (Week 3-4)

**Goal**: Implement provider abstraction and first providers

#### Tasks
- [ ] Create BaseProvider abstract class
- [ ] Implement ProviderFactory and ProviderRegistry
- [ ] Implement IEmailProvider interface
- [ ] Implement SendGridProvider
- [ ] Implement SMTPProvider (fallback)
- [ ] Implement IPushProvider interface
- [ ] Implement FCMProvider
- [ ] Implement In-App provider (RabbitMQ → Main App)
- [ ] Integrate Secret Management module for credentials
- [ ] Implement provider health checks
- [ ] Add provider configuration to config schema

**Deliverables**:
- Email notifications working (SendGrid + SMTP)
- Push notifications working (FCM)
- In-app notifications working (via RabbitMQ)
- Provider abstraction allows easy switching

### Phase 4: Reliability & Tracking (Week 4-5)

**Goal**: Add reliability features and delivery tracking

#### Tasks
- [ ] Implement RetryService (exponential backoff)
- [ ] Implement DeduplicationService
- [ ] Implement RateLimiter
- [ ] Implement CircuitBreaker for providers
- [ ] Implement DeliveryTracker
- [ ] Add delivery status updates
- [ ] Implement MetricsCollector
- [ ] Add Prometheus metrics endpoint
- [ ] Implement AuditLogger
- [ ] Add delivery receipts handling

**Deliverables**:
- Notifications retry on failure
- Duplicate notifications prevented
- Rate limiting enforced
- Delivery status tracked
- Metrics exposed

### Phase 5: Advanced Features (Week 5-6)

**Goal**: Implement advanced routing and management features

#### Tasks
- [ ] Implement PresenceTracker (Redis-based)
- [ ] Update RoutingEngine with presence awareness
- [ ] Implement EscalationManager
- [ ] Implement EscalationChain service
- [ ] Implement QuietHoursService
- [ ] Update RoutingEngine with quiet hours
- [ ] Implement BatchProcessor (digest notifications)
- [ ] Add scheduled notification support
- [ ] Implement notification expiry

**Deliverables**:
- Presence-aware routing
- Escalation chains working
- Quiet hours/DND working
- Batch/digest notifications
- Scheduled notifications

### Phase 6: Additional Providers (Week 6-7)

**Goal**: Add more notification channels

#### Tasks
- [ ] Implement ISMSProvider interface
- [ ] Implement TwilioSMSProvider
- [ ] Implement IWhatsAppProvider interface
- [ ] Implement TwilioWhatsAppProvider
- [ ] Implement IVoiceProvider interface
- [ ] Implement TwilioVoiceProvider
- [ ] Add provider configuration UI support
- [ ] Test all channels end-to-end

**Deliverables**:
- SMS notifications working
- WhatsApp notifications working
- Voice notifications working

### Phase 7: Webhooks & API (Week 7-8)

**Goal**: Implement webhook integration and admin API

#### Tasks
- [ ] Implement IncomingWebhookHandler
- [ ] Implement WebhookValidator (signature validation)
- [ ] Implement OutgoingWebhookService
- [ ] Add webhook management endpoints
- [ ] Complete admin API endpoints
- [ ] Add OpenAPI documentation
- [ ] Implement API authentication
- [ ] Add request validation middleware

**Deliverables**:
- Incoming webhooks processed
- Outgoing webhooks sent
- Admin API complete
- OpenAPI spec documented

### Phase 8: Testing & Polish (Week 8)

**Goal**: Comprehensive testing and final polish

#### Tasks
- [ ] Write unit tests (≥80% coverage)
- [ ] Write integration tests
- [ ] Write API contract tests
- [ ] Performance testing
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation review
- [ ] Code review and refactoring
- [ ] Deployment preparation

**Deliverables**:
- Test suite with ≥80% coverage
- Performance benchmarks met
- Security audit passed
- Documentation complete
- Ready for production

---

## 6. API Specification

### 6.1 Internal Admin API

**Base URL**: `http://notification-manager:3001/api/v1`

#### Health Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe |

#### Template Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/templates` | List templates |
| `GET` | `/templates/:id` | Get template |
| `POST` | `/templates` | Create template |
| `PUT` | `/templates/:id` | Update template |
| `DELETE` | `/templates/:id` | Delete template |

#### Preference Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/preferences/global` | Get global preferences |
| `GET` | `/preferences/organization/:orgId` | Get org preferences |
| `GET` | `/preferences/team/:teamId` | Get team preferences |
| `GET` | `/preferences/project/:projectId` | Get project preferences |
| `GET` | `/preferences/user/:userId` | Get user preferences |
| `PUT` | `/preferences/global` | Update global preferences |
| `PUT` | `/preferences/organization/:orgId` | Update org preferences |
| `PUT` | `/preferences/team/:teamId` | Update team preferences |
| `PUT` | `/preferences/project/:projectId` | Update project preferences |
| `PUT` | `/preferences/user/:userId` | Update user preferences |

#### Notification History

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notifications` | List notifications (with filters) |
| `GET` | `/notifications/:id` | Get notification details |
| `GET` | `/notifications/:id/deliveries` | Get delivery status |

#### Provider Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/providers` | List configured providers |
| `GET` | `/providers/:id` | Get provider details |
| `POST` | `/providers` | Configure provider |
| `PUT` | `/providers/:id` | Update provider |
| `DELETE` | `/providers/:id` | Remove provider |
| `GET` | `/providers/:id/health` | Check provider health |

#### Webhook Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/webhooks` | List webhooks |
| `GET` | `/webhooks/:id` | Get webhook |
| `POST` | `/webhooks` | Create webhook |
| `PUT` | `/webhooks/:id` | Update webhook |
| `DELETE` | `/webhooks/:id` | Delete webhook |

### 6.2 API Request/Response Examples

#### Create Template

```http
POST /api/v1/templates
Content-Type: application/json

{
  "name": "task_assigned",
  "eventType": "task.assigned",
  "channel": "EMAIL",
  "subject": "Task Assigned: {{task.title}}",
  "body": "You have been assigned to task: {{task.title}}",
  "bodyHtml": "<p>You have been assigned to task: <strong>{{task.title}}</strong></p>",
  "variables": ["task.title", "task.description", "assigner.name"],
  "locale": "en"
}
```

#### Update User Preferences

```http
PUT /api/v1/preferences/user/user-123
Content-Type: application/json

{
  "channels": {
    "EMAIL": { "enabled": true },
    "PUSH": { "enabled": true },
    "SMS": { "enabled": false }
  },
  "categories": {
    "PROJECT_MANAGEMENT": {
      "enabled": true,
      "channels": ["IN_APP", "EMAIL"],
      "criticalityThreshold": "MEDIUM"
    }
  }
}
```

#### Get Notification History

```http
GET /api/v1/notifications?recipientId=user-123&status=DELIVERED&limit=20&offset=0
```

### 6.3 OpenAPI Specification

All endpoints MUST be documented in `docs/openapi.yaml` following OpenAPI 3.0.3 specification.

---

## 7. Configuration Schema

### 7.1 Configuration File Structure

```yaml
# config/default.yaml

module:
  name: notification-manager
  version: 1.0.0

server:
  port: ${PORT:-3001}
  host: ${HOST:-0.0.0.0}

database:
  url: ${DATABASE_URL}
  pool_size: 10

rabbitmq:
  url: ${RABBITMQ_URL:-amqp://localhost:5672}
  exchange: notification.events
  queues:
    events: notification.events.queue
    commands: notification.commands.queue
    dlq: notification.dlq

redis:
  url: ${REDIS_URL:-redis://localhost:6379}
  prefix: notification:

# Notification settings
notification:
  # Default retry settings
  retry:
    max_attempts: 3
    initial_delay_ms: 1000
    max_delay_ms: 30000
    backoff_multiplier: 2
  
  # Rate limiting
  rate_limit:
    enabled: true
    per_user_per_channel: 100  # per hour
    per_organization: 10000     # per hour
  
  # Deduplication
  deduplication:
    enabled: true
    window_minutes: 60
  
  # Batch/Digest
  batch:
    enabled: true
    digest_interval_minutes: 15
    max_batch_size: 10
  
  # Quiet hours
  quiet_hours:
    enabled: true
    default_start: "22:00"
    default_end: "08:00"
    default_timezone: "UTC"
  
  # Presence
  presence:
    enabled: true
    timeout_seconds: 300

# Provider configurations
providers:
  email:
    default: sendgrid
    sendgrid:
      enabled: true
      secret_id: ${SENDGRID_SECRET_ID}  # From Secret Management
    ses:
      enabled: false
      secret_id: ${SES_SECRET_ID}
    smtp:
      enabled: true
      host: ${SMTP_HOST}
      port: ${SMTP_PORT:-587}
      secure: true
      auth:
        user: ${SMTP_USER}
        password: ${SMTP_PASSWORD}
  
  push:
    default: fcm
    fcm:
      enabled: true
      secret_id: ${FCM_SECRET_ID}
    onesignal:
      enabled: false
      secret_id: ${ONESIGNAL_SECRET_ID}
  
  sms:
    default: twilio
    twilio:
      enabled: true
      secret_id: ${TWILIO_SECRET_ID}
  
  whatsapp:
    default: twilio
    twilio:
      enabled: true
      secret_id: ${TWILIO_WHATSAPP_SECRET_ID}
  
  voice:
    default: twilio
    twilio:
      enabled: true
      secret_id: ${TWILIO_VOICE_SECRET_ID}

# External service URLs (from config, not hardcoded)
services:
  secret_management:
    url: ${SECRET_MANAGEMENT_URL:-http://localhost:3013}
  logging:
    url: ${LOGGING_URL:-http://localhost:3014}
  user_management:
    url: ${USER_MANAGEMENT_URL:-http://localhost:3000}

# Feature flags
features:
  escalation: true
  presence_aware: true
  quiet_hours: true
  batch_digest: true
  webhooks: true
```

### 7.2 Configuration Validation

Configuration MUST be validated against `config/schema.json` using Ajv.

---

## 8. Error Handling

### 8.1 Error Types

```typescript
// Use shared error classes from @coder/shared
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
} from '@coder/shared';

// Custom errors
export class ProviderError extends AppError {
  constructor(
    provider: string,
    message: string,
    details?: unknown
  ) {
    super('PROVIDER_ERROR', `Provider ${provider}: ${message}`, 502, details);
  }
}

export class TemplateNotFoundError extends NotFoundError {
  constructor(templateName: string) {
    super('Template', templateName);
  }
}

export class DeliveryFailedError extends AppError {
  constructor(
    channel: NotificationChannel,
    reason: string,
    details?: unknown
  ) {
    super(
      'DELIVERY_FAILED',
      `Failed to deliver via ${channel}: ${reason}`,
      502,
      details
    );
  }
}
```

### 8.2 Error Handling Middleware

All errors MUST be handled by the error handler middleware following the pattern in ModuleImplementationGuide.md.

---

## 9. Observability & Metrics

### 9.1 Health Endpoints

```typescript
// GET /health - Liveness
{
  "status": "healthy",
  "timestamp": "2025-01-22T10:00:00Z"
}

// GET /ready - Readiness
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok", "latency_ms": 5 },
    "rabbitmq": { "status": "ok", "latency_ms": 3 },
    "redis": { "status": "ok", "latency_ms": 2 }
  },
  "timestamp": "2025-01-22T10:00:00Z"
}
```

### 9.2 Metrics

Expose Prometheus metrics:

```typescript
// Key metrics
const metrics = {
  // Counters
  'notifications_received_total': Counter,
  'notifications_delivered_total': Counter,
  'notifications_failed_total': Counter,
  'deliveries_attempted_total': Counter,
  
  // Histograms
  'notification_processing_duration_seconds': Histogram,
  'delivery_duration_seconds': Histogram,
  
  // Gauges
  'notifications_pending': Gauge,
  'notifications_processing': Gauge,
  'queue_depth': Gauge,
  'active_escalations': Gauge
};
```

### 9.3 Structured Logging

All logs MUST use structured logging with context:

```typescript
logger.info('Notification processed', {
  notificationId: notification.id,
  recipientId: notification.recipientId,
  channels: notification.channelsDelivered,
  duration_ms: Date.now() - startTime,
});
```

---

## 10. Integration Points

### 10.1 RabbitMQ Events

**Consumed Events**:
- `task.assigned`
- `task.completed`
- `task.due_soon`
- `collaboration.message`
- `collaboration.mention`
- `incident.created`
- `incident.updated`
- `incident.resolved`
- `system.maintenance`
- `calendar.event_reminder`
- `security.alert`
- `billing.invoice_due`

**Published Events**:
- `notification.sent`
- `notification.delivered`
- `notification.failed`
- `notification.escalated`

### 10.2 Secret Management Module

All provider credentials MUST be stored in Secret Management module:
- API keys
- OAuth tokens
- SMTP credentials

### 10.3 Logging Module

All notification events MUST be logged to Logging module for audit trail.

### 10.4 User Management Module

Fetch user information (email, phone, preferences) via REST API.

### 10.5 Main Application

- Publish events to RabbitMQ
- Consume in-app notifications from RabbitMQ
- Forward in-app notifications via WebSocket

---

## 11. Testing Strategy

### 11.1 Test Coverage Requirements

| Test Type | Coverage | Mandatory |
|-----------|----------|-----------|
| Unit Tests | ≥ 80% | ✅ Yes |
| Integration Tests | Critical paths | ✅ Yes |
| API Contract Tests | All endpoints | ✅ Yes |
| E2E Tests | Happy paths | ⚠️ Recommended |

### 11.2 Unit Test Examples

```typescript
// tests/unit/engine/RoutingEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingEngine } from '../../../src/engine/RoutingEngine';

describe('RoutingEngine', () => {
  let engine: RoutingEngine;
  
  beforeEach(() => {
    engine = new RoutingEngine(mockConfig);
  });
  
  it('should select channels based on preferences', () => {
    const channels = engine.selectChannels({
      preferences: { EMAIL: true, PUSH: false },
      criticality: 'MEDIUM',
      presence: 'online'
    });
    
    expect(channels).toEqual(['IN_APP', 'EMAIL']);
  });
});
```

### 11.3 Integration Test Examples

```typescript
// tests/integration/notification-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/server';

describe('Notification Flow', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    await setupTestDatabase();
    app = await buildApp();
  });
  
  afterAll(async () => {
    await app.close();
    await cleanupTestDatabase();
  });
  
  it('should process event and deliver notification', async () => {
    // Publish event to RabbitMQ
    await publishEvent('task.assigned', {
      userId: 'user-123',
      taskId: 'task-456',
      data: { title: 'Test Task' }
    });
    
    // Wait for processing
    await waitFor(() => {
      const notification = await getNotification('task-456');
      expect(notification.status).toBe('DELIVERED');
    });
  });
});
```

---

## 12. Frontend Implementation

### 12.1 Frontend Module Structure

```
src/renderer/modules/notifications/
├── index.ts
├── pages/
│   ├── index.ts
│   ├── NotificationCenterPage.tsx
│   ├── NotificationPreferencesPage.tsx
│   └── NotificationAdminPage.tsx
├── components/
│   ├── index.ts
│   ├── NotificationCard.tsx
│   ├── NotificationList.tsx
│   ├── NotificationFilters.tsx
│   ├── PreferenceEditor.tsx
│   └── TemplateEditor.tsx
├── hooks/
│   ├── index.ts
│   ├── useNotifications.ts
│   ├── useNotificationPreferences.ts
│   └── useNotificationTemplates.ts
├── services/
│   ├── index.ts
│   └── notificationService.ts
├── types/
│   └── index.ts
└── constants/
    └── index.ts
```

### 12.2 Key Components

#### NotificationCenterPage

- Real-time notification list
- Mark as read/unread
- Filter by type, status, date
- Pagination
- Empty state
- Loading state

#### NotificationPreferencesPage

- Channel preferences (enable/disable)
- Category preferences
- Quiet hours configuration
- Criticality thresholds

#### NotificationAdminPage

- Template management (CRUD)
- Provider configuration
- Notification history
- Metrics dashboard
- Webhook management

### 12.3 UI Requirements

- Use shadcn/ui components
- Use @iconify/react with lucide icons
- Use react-i18next for internationalization
- Responsive design (mobile-first)
- No modals on mobile (use full-screen pages)
- Accessible (ARIA, keyboard navigation)

---

## 13. Deployment Checklist

### 13.1 Code Quality

- [ ] All linting rules pass
- [ ] No TypeScript errors
- [ ] No console.log statements (use logger)
- [ ] No hardcoded values (URLs, ports, secrets)
- [ ] No TODO/FIXME in critical paths

### 13.2 Configuration

- [ ] `config/default.yaml` exists with all settings
- [ ] `config/schema.json` validates config
- [ ] All secrets from environment variables
- [ ] Service URLs from config (not hardcoded)

### 13.3 API

- [ ] `docs/openapi.yaml` complete and valid
- [ ] All endpoints documented
- [ ] Authentication on all routes (except health)
- [ ] Input validation on all routes
- [ ] Consistent error responses

### 13.4 Database

- [ ] Tables prefixed with module name (`notification_*`)
- [ ] Migrations idempotent
- [ ] Indexes for common queries
- [ ] Foreign keys where appropriate

### 13.5 Testing

- [ ] Unit tests ≥ 80% coverage
- [ ] Integration tests for critical paths
- [ ] All tests passing
- [ ] No skipped tests

### 13.6 Documentation

- [ ] README.md complete
- [ ] CHANGELOG.md updated
- [ ] API documented in OpenAPI
- [ ] Events documented

### 13.7 Security

- [ ] Authentication middleware applied
- [ ] RBAC permissions checked
- [ ] Input validated and sanitized
- [ ] Sensitive data not logged
- [ ] No secrets in code
- [ ] Credentials stored in Secret Management

### 13.8 Observability

- [ ] `/health` endpoint implemented
- [ ] `/ready` endpoint implemented
- [ ] Structured logging
- [ ] Metrics exposed (Prometheus)

### 13.9 Abstraction

- [ ] External services use provider pattern
- [ ] Providers configurable via config
- [ ] No direct integration with external APIs

### 13.10 Events

- [ ] Published events documented
- [ ] Consumed events documented
- [ ] Event handlers idempotent

### 13.11 Frontend

- [ ] Components follow naming conventions
- [ ] Pages use proper layout structure
- [ ] Proper loading and error states
- [ ] Accessible (ARIA, keyboard navigation)
- [ ] Responsive design
- [ ] Unit tests for components

---

## Related Documentation

- [Module Implementation Guide](../../../global/ModuleImplementationGuide.md) - Implementation standards
- [Notification Manager Specification](./SPECIFICATION.md) - Detailed specification
- [Module Overview](../../../global/ModuleOverview.md) - Module list and responsibilities

---

*Document Version: 1.0*  
*Last Updated: 2025-01-22*


