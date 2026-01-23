# Notification Manager Module Specification - Part 1

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** Infrastructure / Separate Container

---

## Table of Contents - Part 1

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Notification Channels](#4-notification-channels)
5. [Event Types & Triggers](#5-event-types--triggers)
6. [Provider Abstraction Layer](#6-provider-abstraction-layer)
7. [Secret Management Integration](#7-secret-management-integration)

---

## 1. Overview

### 1.1 Purpose

The Notification Manager is a **dedicated, independently deployable container** responsible for all notification delivery across the Coder IDE platform. It provides a unified, scalable, and highly configurable notification system supporting multiple channels with intelligent routing, fallback mechanisms, and delivery guarantees.

### 1.2 Key Responsibilities

- **Multi-Channel Delivery**: In-App, Push, Email, SMS, WhatsApp, Phone Call
- **Event-Driven Architecture**: Subscribe to platform events via RabbitMQ
- **Provider Abstraction**: Easy switching between notification providers
- **Intelligent Routing**: Presence-aware, preference-based channel selection
- **Escalation & Fallback**: Automatic escalation for critical notifications
- **Template Management**: Multi-language, dynamic templates with rich content
- **Delivery Guarantees**: Retry, deduplication, rate limiting, delivery tracking
- **Preference Management**: Hierarchical preferences (Global → Organization → Team → Project → User)

### 1.3 Design Principles

1. **Provider Agnostic**: Abstract provider implementations; easy to switch without code changes
2. **Event-Driven**: Loosely coupled via message queue; no direct dependencies on main application
3. **Horizontally Scalable**: Stateless workers for high notification volume
4. **Configurable by Default**: All behaviors configurable at organization level
5. **Presence-Aware**: Smart channel selection based on user online status
6. **Reliable Delivery**: At-least-once delivery with deduplication
7. **Audit Everything**: Complete audit trail for compliance and debugging

### 1.4 Container Isolation

The Notification Manager runs as a **separate container** with:
- Uses shared Cosmos DB NoSQL database (notification container)
- Own RabbitMQ connection (consumer)
- Internal API for admin operations
- No direct access to main application database

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CODER IDE PLATFORM                                      │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         MAIN APPLICATION CONTAINER                           │   │
│  │                                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Fastify    │  │   WebSocket  │  │    Event     │  │    Secret    │    │   │
│  │  │   API Server │  │    Server    │  │   Emitter    │  │  Management  │    │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘    │   │
│  │         │                 │                 │                               │   │
│  │         │                 │                 ▼                               │   │
│  │         │                 │        ┌───────────────┐                       │   │
│  │         │                 │        │   RabbitMQ    │◄──────────────────────┼───┼──┐
│  │         │                 │        │   Publisher   │                       │   │  │
│  │         │                 │        └───────┬───────┘                       │   │  │
│  │         │                 │                │                               │   │  │
│  └─────────┼─────────────────┼────────────────┼───────────────────────────────┘   │  │
│            │                 │                │                                    │  │
│            │                 ▼                ▼                                    │  │
│            │         ┌─────────────────────────────┐                              │  │
│            │         │        RabbitMQ             │                              │  │
│            │         │    (Message Broker)         │                              │  │
│            │         │  • notification.events      │                              │  │
│            │         │  • notification.commands    │                              │  │
│            │         │  • notification.dlq         │                              │  │
│            │         └─────────────┬───────────────┘                              │  │
│            │                       │                                              │  │
│            │                       ▼                                              │  │
│  ┌─────────┼───────────────────────────────────────────────────────────────────┐ │  │
│  │         │      NOTIFICATION MANAGER CONTAINER                                │ │  │
│  │         │                                                                    │ │  │
│  │         │  ┌─────────────────────────────────────────────────────────────┐  │ │  │
│  │         │  │                    Event Consumer                            │  │ │  │
│  │         │  │  • Consumes events from RabbitMQ                            │  │ │  │
│  │         │  │  • Routes to appropriate handlers                           │  │ │  │
│  │         │  └─────────────────────────┬───────────────────────────────────┘  │ │  │
│  │         │                            │                                       │ │  │
│  │         │                            ▼                                       │ │  │
│  │         │  ┌─────────────────────────────────────────────────────────────┐  │ │  │
│  │         │  │                  Notification Engine                         │  │ │  │
│  │         │  │                                                              │  │ │  │
│  │         │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │ │  │
│  │         │  │  │ Routing  │ │ Template │ │Preference│ │  Escalation  │   │  │ │  │
│  │         │  │  │ Engine   │ │ Renderer │ │ Resolver │ │   Manager    │   │  │ │  │
│  │         │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │  │ │  │
│  │         │  │                                                              │  │ │  │
│  │         │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │ │  │
│  │         │  │  │ Presence │ │  Rate    │ │  Dedup   │ │   Delivery   │   │  │ │  │
│  │         │  │  │ Tracker  │ │ Limiter  │ │ Service  │ │   Tracker    │   │  │ │  │
│  │         │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │  │ │  │
│  │         │  └─────────────────────────┬───────────────────────────────────┘  │ │  │
│  │         │                            │                                       │ │  │
│  │         │                            ▼                                       │ │  │
│  │         │  ┌─────────────────────────────────────────────────────────────┐  │ │  │
│  │         │  │              Provider Abstraction Layer                      │  │ │  │
│  │         │  │                                                              │  │ │  │
│  │         │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │  │ │  │
│  │         │  │  │ Email  │ │  SMS   │ │  Push  │ │WhatsApp│ │  Voice   │  │  │ │  │
│  │         │  │  │Provider│ │Provider│ │Provider│ │Provider│ │ Provider │  │  │ │  │
│  │         │  │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └────┬─────┘  │  │ │  │
│  │         │  └──────┼──────────┼──────────┼──────────┼───────────┼─────────┘  │ │  │
│  │         │         │          │          │          │           │            │ │  │
│  │         │         ▼          ▼          ▼          ▼           ▼            │ │  │
│  │         │  ┌──────────────────────────────────────────────────────────┐    │ │  │
│  │         │  │              External Notification Services               │    │ │  │
│  │         │  │  SendGrid │ Twilio │ FCM │ WhatsApp API │ Vonage │ etc.  │    │ │  │
│  │         │  └──────────────────────────────────────────────────────────┘    │ │  │
│  │         │                                                                    │ │  │
│  │         │  ┌─────────────────┐  ┌─────────────────┐                        │ │  │
│  │         │  │   Admin API     │  │   Cosmos DB     │                        │ │  │
│  │         └─►│  (Internal)     │  │   (Own DB)      │                        │ │  │
│  │            └─────────────────┘  └─────────────────┘                        │ │  │
│  │                                                                             │ │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │ │  │
│  │  │                    In-App Notification Flow                          │  │ │  │
│  │  │   Notification Manager ──RabbitMQ──► Main App ──WebSocket──► Client  │  │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │ │  │
│  └─────────────────────────────────────────────────────────────────────────────┘ │  │
│                                                                                   │  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │  │
│  │                    WEBHOOK ENDPOINTS                                         │ │  │
│  │  • Incoming: Receive events from external systems                           │◄┘  │
│  │  • Outgoing: Notify external systems of platform events                     │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Event Consumer** | Consumes notification events from RabbitMQ queues |
| **Routing Engine** | Determines which channels to use based on event type, criticality, preferences |
| **Template Renderer** | Renders notification content from templates with variable substitution |
| **Preference Resolver** | Resolves effective preferences from hierarchy (Global → Org → Team → Project → User) |
| **Escalation Manager** | Manages escalation chains and timing for critical notifications |
| **Presence Tracker** | Tracks user online status for presence-aware delivery |
| **Rate Limiter** | Enforces rate limits per user/channel to prevent spam |
| **Dedup Service** | Prevents duplicate notification delivery |
| **Delivery Tracker** | Tracks delivery status, receipts, and metrics |
| **Provider Layer** | Abstract interface to external notification services |
| **Admin API** | Internal API for template/preference management |

### 2.3 Module Location

```
notification-manager/
├── src/
│   ├── index.ts                      # Container entry point
│   ├── config/
│   │   ├── index.ts                  # Configuration loader
│   │   ├── rabbitmq.config.ts        # RabbitMQ configuration
│   │   └── database.config.ts        # Database configuration
│   │
│   ├── consumers/
│   │   ├── EventConsumer.ts          # Main event consumer
│   │   ├── CommandConsumer.ts        # Command handler (admin operations)
│   │   └── handlers/
│   │       ├── TaskEventHandler.ts
│   │       ├── CollaborationEventHandler.ts
│   │       ├── IncidentEventHandler.ts
│   │       └── SystemEventHandler.ts
│   │
│   ├── engine/
│   │   ├── NotificationEngine.ts     # Core orchestration
│   │   ├── RoutingEngine.ts          # Channel selection logic
│   │   ├── EscalationManager.ts      # Escalation chains
│   │   ├── DeliveryManager.ts        # Delivery orchestration
│   │   └── BatchProcessor.ts         # Digest/batch processing
│   │
│   ├── preferences/
│   │   ├── PreferenceResolver.ts     # Hierarchical preference resolution
│   │   ├── PreferenceService.ts      # Preference CRUD
│   │   └── QuietHoursService.ts      # DND/quiet hours logic
│   │
│   ├── templates/
│   │   ├── TemplateEngine.ts         # Template rendering
│   │   ├── TemplateService.ts        # Template CRUD
│   │   ├── VariableResolver.ts       # Dynamic variable resolution
│   │   └── i18n/
│   │       ├── LocaleManager.ts      # Locale management
│   │       ├── en.json               # English translations
│   │       └── fr.json               # French translations
│   │
│   ├── providers/
│   │   ├── ProviderFactory.ts        # Provider instantiation
│   │   ├── ProviderRegistry.ts       # Provider registration
│   │   ├── BaseProvider.ts           # Abstract base class
│   │   │
│   │   ├── email/
│   │   │   ├── EmailProvider.ts      # Email interface
│   │   │   ├── SendGridProvider.ts
│   │   │   ├── SESProvider.ts
│   │   │   ├── MailgunProvider.ts
│   │   │   └── SMTPProvider.ts
│   │   │
│   │   ├── sms/
│   │   │   ├── SMSProvider.ts        # SMS interface
│   │   │   ├── TwilioSMSProvider.ts
│   │   │   ├── AWSSNSProvider.ts
│   │   │   └── VonageSMSProvider.ts
│   │   │
│   │   ├── push/
│   │   │   ├── PushProvider.ts       # Push interface
│   │   │   ├── FCMProvider.ts
│   │   │   ├── OneSignalProvider.ts
│   │   │   └── WebPushProvider.ts
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── WhatsAppProvider.ts   # WhatsApp interface
│   │   │   ├── TwilioWhatsAppProvider.ts
│   │   │   └── MetaWhatsAppProvider.ts
│   │   │
│   │   └── voice/
│   │       ├── VoiceProvider.ts      # Voice interface
│   │       ├── TwilioVoiceProvider.ts
│   │       └── VonageVoiceProvider.ts
│   │
│   ├── presence/
│   │   ├── PresenceTracker.ts        # User presence tracking
│   │   └── PresenceStore.ts          # Redis-based presence store
│   │
│   ├── reliability/
│   │   ├── RetryService.ts           # Retry with exponential backoff
│   │   ├── DeduplicationService.ts   # Duplicate detection
│   │   ├── RateLimiter.ts            # Rate limiting
│   │   └── CircuitBreaker.ts         # Provider circuit breaker
│   │
│   ├── tracking/
│   │   ├── DeliveryTracker.ts        # Delivery status tracking
│   │   ├── MetricsCollector.ts       # Notification metrics
│   │   └── AuditLogger.ts            # Audit logging
│   │
│   ├── webhooks/
│   │   ├── IncomingWebhookHandler.ts # Process external webhooks
│   │   ├── OutgoingWebhookService.ts # Send webhooks to external systems
│   │   └── WebhookValidator.ts       # Webhook signature validation
│   │
│   ├── api/
│   │   ├── server.ts                 # Fastify admin API server
│   │   ├── routes/
│   │   │   ├── templates.ts          # Template management
│   │   │   ├── preferences.ts        # Preference management
│   │   │   ├── providers.ts          # Provider configuration
│   │   │   ├── history.ts            # Notification history
│   │   │   ├── webhooks.ts           # Webhook management
│   │   │   └── health.ts             # Health check
│   │   └── middleware/
│   │       ├── auth.ts               # Internal API auth
│   │       └── validation.ts
│   │
│   ├── database/
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Database schema
│   │   ├── migrations/
│   │   └── seed.ts                   # Seed default templates
│   │
│   └── types/
│       ├── notification.types.ts
│       ├── channel.types.ts
│       ├── provider.types.ts
│       ├── preference.types.ts
│       ├── template.types.ts
│       └── event.types.ts
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

### 2.4 Communication Flow

#### Event-Driven Flow (Main Path)

```
1. Main App Event Occurs (e.g., Task Assigned)
                │
                ▼
2. Main App publishes to RabbitMQ
   Exchange: notification.events
   Routing Key: task.assigned
   Payload: { eventType, userId, data, metadata }
                │
                ▼
3. Notification Manager Consumer receives event
                │
                ▼
4. Routing Engine determines:
   - Recipient preferences
   - User presence status
   - Applicable channels
   - Criticality level
                │
                ▼
5. Template Engine renders content per channel
                │
                ▼
6. Delivery Manager sends via providers
   - In-App → RabbitMQ → Main App → WebSocket
   - Email → SendGrid/SES
   - Push → FCM
   - SMS → Twilio
                │
                ▼
7. Delivery Tracker records status
   - Delivery receipts
   - Metrics
   - Audit log
```

#### In-App Notification Flow (WebSocket via Main App)

```
Notification Manager                 RabbitMQ                Main App               Client
       │                                │                        │                     │
       │  Publish to                    │                        │                     │
       │  notification.inapp.deliver    │                        │                     │
       │ ────────────────────────────►  │                        │                     │
       │                                │  Consume               │                     │
       │                                │ ─────────────────────► │                     │
       │                                │                        │  WebSocket emit     │
       │                                │                        │ ──────────────────► │
       │                                │                        │                     │
       │                                │  ACK delivery          │                     │
       │  ◄─────────────────────────────│─────────────────────── │                     │
       │                                │                        │                     │
```

---

## 3. Data Models

### 3.1 Database Schema

```prisma
// ============================================================
// NOTIFICATION CORE
// ============================================================

model Notification {
  id                    String                @id @default(uuid())
  
  // Event source
  eventType             String                // e.g., "task.assigned", "incident.created"
  eventCategory         EventCategory
  sourceModule          String                // e.g., "task-management", "incidents"
  sourceResourceId      String?               // e.g., Task ID, Incident ID
  sourceResourceType    String?               // e.g., "task", "incident"
  
  // Recipient
  recipientId           String                // User ID
  recipientEmail        String?
  recipientPhone        String?
  
  // Content
  title                 String
  body                  String
  bodyHtml              String?               // Rich HTML content
  actionUrl             String?               // Deep link
  actionLabel           String?               // e.g., "View Task"
  imageUrl              String?
  
  // Metadata
  metadata              Json?                 // Additional context
  
  // Criticality & Routing
  criticality           NotificationCriticality
  channelsRequested     NotificationChannel[]
  channelsDelivered     NotificationChannel[]
  
  // Status
  status                NotificationStatus    @default(PENDING)
  
  // Timing
  scheduledFor          DateTime?             // Scheduled delivery
  expiresAt             DateTime?             // Notification expiry
  
  // Context
  organizationId        String
  teamId                String?
  projectId             String?
  
  // Tracking
  deliveries            NotificationDelivery[]
  
  // Escalation
  escalationChainId     String?
  escalationChain       EscalationChain?      @relation(fields: [escalationChainId], references: [id])
  escalationLevel       Int                   @default(0)
  
  // Batch/Digest
  batchId               String?
  batch                 NotificationBatch?    @relation(fields: [batchId], references: [id])
  
  // Timestamps
  createdAt             DateTime              @default(now())
  processedAt           DateTime?
  completedAt           DateTime?
  
  // Deduplication
  deduplicationKey      String?
  
  @@index([recipientId, status])
  @@index([recipientId, createdAt])
  @@index([organizationId, createdAt])
  @@index([eventType, createdAt])
  @@index([status, scheduledFor])
  @@index([deduplicationKey])
}

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
  PENDING           // Awaiting processing
  PROCESSING        // Being processed
  DELIVERED         // Successfully delivered (at least one channel)
  PARTIALLY_DELIVERED // Some channels succeeded
  FAILED            // All channels failed
  SCHEDULED         // Scheduled for future
  HELD              // Held (quiet hours)
  EXPIRED           // Expired before delivery
  CANCELLED         // Cancelled
}

// ============================================================
// DELIVERY TRACKING
// ============================================================

model NotificationDelivery {
  id                    String                @id @default(uuid())
  notificationId        String
  notification          Notification          @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  
  // Channel
  channel               NotificationChannel
  providerId            String                // Which provider was used
  
  // Status
  status                DeliveryStatus        @default(PENDING)
  
  // Provider response
  providerMessageId     String?               // Provider's message ID
  providerResponse      Json?                 // Raw provider response
  
  // Timing
  attemptedAt           DateTime?
  deliveredAt           DateTime?
  failedAt              DateTime?
  
  // Retry tracking
  attemptCount          Int                   @default(0)
  maxAttempts           Int                   @default(3)
  nextRetryAt           DateTime?
  lastError             String?
  
  // Engagement tracking
  openedAt              DateTime?
  clickedAt             DateTime?
  
  // Cost tracking (for SMS/Voice)
  cost                  Decimal?
  currency              String?
  
  @@index([notificationId])
  @@index([status, nextRetryAt])
  @@index([channel, status])
}

enum DeliveryStatus {
  PENDING
  SENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  FAILED
  BOUNCED
  REJECTED
  UNSUBSCRIBED
}

// ============================================================
// NOTIFICATION BATCHING / DIGEST
// ============================================================

model NotificationBatch {
  id                    String                @id @default(uuid())
  
  // Recipient
  recipientId           String
  
  // Batch configuration
  batchType             BatchType
  frequency             BatchFrequency
  
  // Status
  status                BatchStatus           @default(COLLECTING)
  
  // Timing
  collectUntil          DateTime              // Collect notifications until this time
  scheduledDelivery     DateTime              // When to deliver the digest
  deliveredAt           DateTime?
  
  // Content
  notifications         Notification[]
  
  // Context
  organizationId        String
  
  createdAt             DateTime              @default(now())
  
  @@index([recipientId, status])
  @@index([status, scheduledDelivery])
}

enum BatchType {
  DIGEST              // Combined summary
  GROUPED             // Grouped by category
}

enum BatchFrequency {
  HOURLY
  DAILY
  WEEKLY
}

enum BatchStatus {
  COLLECTING
  READY
  PROCESSING
  DELIVERED
  FAILED
}

// ============================================================
// TEMPLATES
// ============================================================

model NotificationTemplate {
  id                    String                @id @default(uuid())
  
  // Identification
  code                  String                // Unique template code, e.g., "task.assigned"
  name                  String
  description           String?
  
  // Scoping
  scope                 TemplateScope
  organizationId        String?
  
  // Event binding
  eventType             String                // Which event this template handles
  
  // Channel-specific content
  channels              TemplateChannel[]
  
  // Default criticality
  defaultCriticality    NotificationCriticality @default(MEDIUM)
  
  // Status
  isActive              Boolean               @default(true)
  isDefault             Boolean               @default(false) // Platform default
  
  // Versioning
  version               Int                   @default(1)
  
  // Audit
  createdAt             DateTime              @default(now())
  createdById           String?
  updatedAt             DateTime              @updatedAt
  updatedById           String?
  
  @@unique([code, scope, organizationId])
  @@index([eventType])
  @@index([scope, organizationId])
}

enum TemplateScope {
  GLOBAL                // Platform default (Super Admin)
  ORGANIZATION          // Organization custom
}

model TemplateChannel {
  id                    String                @id @default(uuid())
  templateId            String
  template              NotificationTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Channel
  channel               NotificationChannel
  
  // Content per locale
  localizations         TemplateLocalization[]
  
  // Channel-specific settings
  settings              Json?                 // e.g., email: { replyTo, attachments }
  
  @@unique([templateId, channel])
}

model TemplateLocalization {
  id                    String                @id @default(uuid())
  channelId             String
  channel               TemplateChannel       @relation(fields: [channelId], references: [id], onDelete: Cascade)
  
  // Locale
  locale                String                // e.g., "en", "fr"
  
  // Content (with variable placeholders)
  subject               String?               // For email
  title                 String
  body                  String                // Plain text or markdown
  bodyHtml              String?               // HTML (for email)
  actionLabel           String?               // e.g., "View Task"
  
  @@unique([channelId, locale])
}

// ============================================================
// PREFERENCES
// ============================================================

model NotificationPreference {
  id                    String                @id @default(uuid())
  
  // Scoping (hierarchy: Global < Organization < Team < Project < User)
  scope                 PreferenceScope
  organizationId        String?
  teamId                String?
  projectId             String?
  userId                String?
  
  // Event-specific preferences (optional - if null, applies to all events)
  eventType             String?
  eventCategory         EventCategory?
  
  // Channel preferences
  channelPreferences    ChannelPreference[]
  
  // Criticality threshold (receive notifications at or above this level)
  minCriticality        NotificationCriticality @default(LOW)
  
  // Enabled
  isEnabled             Boolean               @default(true)
  
  // Audit
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([scope, organizationId, teamId, projectId, userId, eventType, eventCategory])
  @@index([userId])
  @@index([organizationId])
}

enum PreferenceScope {
  GLOBAL
  ORGANIZATION
  TEAM
  PROJECT
  USER
}

model ChannelPreference {
  id                    String                @id @default(uuid())
  preferenceId          String
  preference            NotificationPreference @relation(fields: [preferenceId], references: [id], onDelete: Cascade)
  
  channel               NotificationChannel
  isEnabled             Boolean               @default(true)
  
  // Presence-aware delivery
  onlyWhenOffline       Boolean               @default(false) // Only send if user offline
  
  // Delivery settings
  digestEnabled         Boolean               @default(false)
  digestFrequency       BatchFrequency?
  
  @@unique([preferenceId, channel])
}

// ============================================================
// QUIET HOURS / DO NOT DISTURB
// ============================================================

model QuietHours {
  id                    String                @id @default(uuid())
  
  // Owner
  userId                String?
  organizationId        String?               // Org-level defaults
  
  // Schedule
  timezone              String                @default("UTC")
  
  // Recurring schedule
  schedules             QuietHoursSchedule[]
  
  // Override: currently active DND
  dndActiveUntil        DateTime?             // Manual DND override
  
  // Behavior
  holdNonCritical       Boolean               @default(true)
  allowCritical         Boolean               @default(true)
  
  // Channel-specific rules
  channelRules          QuietHoursChannelRule[]
  
  isEnabled             Boolean               @default(true)
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([userId])
  @@index([organizationId])
}

model QuietHoursSchedule {
  id                    String                @id @default(uuid())
  quietHoursId          String
  quietHours            QuietHours            @relation(fields: [quietHoursId], references: [id], onDelete: Cascade)
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek             Int[]                 // Multiple days
  
  // Time range (in minutes from midnight, local time)
  startMinutes          Int                   // e.g., 1320 = 22:00
  endMinutes            Int                   // e.g., 420 = 07:00
  
  @@index([quietHoursId])
}

model QuietHoursChannelRule {
  id                    String                @id @default(uuid())
  quietHoursId          String
  quietHours            QuietHours            @relation(fields: [quietHoursId], references: [id], onDelete: Cascade)
  
  channel               NotificationChannel
  behavior              QuietHoursBehavior
  
  @@unique([quietHoursId, channel])
}

enum QuietHoursBehavior {
  BLOCK                 // Block during quiet hours
  ALLOW                 // Always allow
  HOLD                  // Hold and deliver after
}

// ============================================================
// ESCALATION CHAINS
// ============================================================

model EscalationChain {
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String
  description           String?
  
  // Scoping
  scope                 EscalationScope
  organizationId        String?
  
  // Trigger conditions
  triggerCriticality    NotificationCriticality @default(CRITICAL)
  triggerEventTypes     String[]              // Which events trigger this chain
  
  // Chain definition
  levels                EscalationLevel[]
  
  // Status
  isActive              Boolean               @default(true)
  
  // Linked notifications
  notifications         Notification[]
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([name, scope, organizationId])
}

enum EscalationScope {
  GLOBAL
  ORGANIZATION
}

model EscalationLevel {
  id                    String                @id @default(uuid())
  chainId               String
  chain                 EscalationChain       @relation(fields: [chainId], references: [id], onDelete: Cascade)
  
  // Level order
  level                 Int                   // 0, 1, 2, ...
  
  // Timing
  delayMinutes          Int                   // Wait this long before escalating to this level
  
  // Channels for this level
  channels              NotificationChannel[]
  
  // Recipients (for escalation to different people, e.g., on-call)
  recipientType         EscalationRecipientType @default(ORIGINAL)
  recipientRoleId       String?               // If escalating to a role
  recipientUserId       String?               // If escalating to specific user
  
  // Condition to escalate
  escalateIf            EscalationCondition   @default(NOT_ACKNOWLEDGED)
  
  @@unique([chainId, level])
}

enum EscalationRecipientType {
  ORIGINAL              // Original recipient
  ROLE                  // Users with specific role
  USER                  // Specific user
  ON_CALL               // Current on-call person
}

enum EscalationCondition {
  NOT_ACKNOWLEDGED      // If not acknowledged within delay
  NOT_RESOLVED          // If source event not resolved
  ALWAYS                // Always escalate
}

// ============================================================
// PROVIDER CONFIGURATION
// ============================================================

model NotificationProvider {
  id                    String                @id @default(uuid())
  
  // Identification
  code                  String                // e.g., "sendgrid", "twilio"
  name                  String
  description           String?
  
  // Channel
  channel               NotificationChannel
  
  // Scoping
  scope                 ProviderScope
  organizationId        String?
  
  // Configuration (references Secret Management)
  secretId              String?               // Reference to Secret Management
  configJson            Json?                 // Non-sensitive config
  
  // Status
  isActive              Boolean               @default(true)
  isDefault             Boolean               @default(false)
  
  // Priority (for failover)
  priority              Int                   @default(0)       // Lower = higher priority
  
  // Health
  lastHealthCheck       DateTime?
  healthStatus          ProviderHealthStatus  @default(UNKNOWN)
  
  // Rate limits
  rateLimit             Int?                  // Requests per minute
  dailyLimit            Int?                  // Daily limit
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([code, scope, organizationId])
  @@index([channel, isActive])
}

enum ProviderScope {
  GLOBAL                // Platform-wide (Super Admin)
  ORGANIZATION          // Organization-specific (BYOC)
}

enum ProviderHealthStatus {
  HEALTHY
  DEGRADED
  UNHEALTHY
  UNKNOWN
}

// ============================================================
// CHANNEL CONFIGURATION (Organization-level)
// ============================================================

model ChannelConfiguration {
  id                    String                @id @default(uuid())
  
  // Scoping
  organizationId        String?               // null = global defaults
  
  // Channel
  channel               NotificationChannel
  
  // Enabled
  isEnabled             Boolean               @default(true)
  
  // Default provider
  defaultProviderId     String?
  
  // Criticality routing
  criticalityRouting    CriticalityRouting[]
  
  // Fallback chain
  fallbackChain         NotificationChannel[] // Ordered fallback channels
  
  // Rate limits (organization-level)
  rateLimitPerUser      Int?                  // Per user per hour
  rateLimitTotal        Int?                  // Total per hour
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([organizationId, channel])
}

model CriticalityRouting {
  id                    String                @id @default(uuid())
  configurationId       String
  configuration         ChannelConfiguration  @relation(fields: [configurationId], references: [id], onDelete: Cascade)
  
  criticality           NotificationCriticality
  isEnabled             Boolean               @default(true)
  
  @@unique([configurationId, criticality])
}

// ============================================================
// WEBHOOKS
// ============================================================

model Webhook {
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String
  description           String?
  
  // Scoping
  organizationId        String
  
  // Direction
  direction             WebhookDirection
  
  // Configuration
  url                   String                // Target URL (outgoing) or endpoint path (incoming)
  
  // Authentication
  authType              WebhookAuthType
  authSecretId          String?               // Reference to Secret Management
  
  // Filtering (outgoing)
  eventTypes            String[]              // Which events to send
  eventCategories       EventCategory[]
  
  // Status
  isActive              Boolean               @default(true)
  
  // Reliability
  retryEnabled          Boolean               @default(true)
  maxRetries            Int                   @default(3)
  
  // Health
  lastTriggeredAt       DateTime?
  lastSuccessAt         DateTime?
  failureCount          Int                   @default(0)
  
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@index([organizationId, direction])
  @@index([isActive, direction])
}

enum WebhookDirection {
  INCOMING              // Receive from external
  OUTGOING              // Send to external
}

enum WebhookAuthType {
  NONE
  BASIC
  BEARER
  HMAC_SHA256           // Signature verification
  API_KEY
}

// ============================================================
// AUDIT LOG
// ============================================================

model NotificationAuditLog {
  id                    String                @id @default(uuid())
  
  // Event
  eventType             AuditEventType
  
  // Actor
  actorType             AuditActorType
  actorId               String?
  
  // Resource
  notificationId        String?
  templateId            String?
  providerId            String?
  webhookId             String?
  
  // Context
  organizationId        String?
  userId                String?
  
  // Details
  action                String
  details               Json?
  
  // Outcome
  outcome               AuditOutcome
  errorMessage          String?
  
  // Timestamp
  timestamp             DateTime              @default(now())
  
  @@index([notificationId])
  @@index([organizationId, timestamp])
  @@index([eventType, timestamp])
}

enum AuditEventType {
  // Notification lifecycle
  NOTIFICATION_CREATED
  NOTIFICATION_PROCESSED
  NOTIFICATION_DELIVERED
  NOTIFICATION_FAILED
  NOTIFICATION_ESCALATED
  NOTIFICATION_HELD
  NOTIFICATION_RELEASED
  
  // Delivery
  DELIVERY_ATTEMPTED
  DELIVERY_SUCCEEDED
  DELIVERY_FAILED
  DELIVERY_OPENED
  DELIVERY_CLICKED
  
  // Template
  TEMPLATE_CREATED
  TEMPLATE_UPDATED
  TEMPLATE_DELETED
  
  // Provider
  PROVIDER_CONFIGURED
  PROVIDER_HEALTH_CHECK
  PROVIDER_FAILOVER
  
  // Preference
  PREFERENCE_UPDATED
  
  // Webhook
  WEBHOOK_RECEIVED
  WEBHOOK_SENT
  WEBHOOK_FAILED
}

enum AuditActorType {
  USER
  SYSTEM
  PROVIDER
  WEBHOOK
}

enum AuditOutcome {
  SUCCESS
  FAILURE
  PARTIAL
}

// ============================================================
// USER PRESENCE (for presence-aware delivery)
// ============================================================

model UserPresence {
  id                    String                @id @default(uuid())
  userId                String                @unique
  
  // Status
  status                PresenceStatus        @default(OFFLINE)
  
  // Last activity
  lastSeenAt            DateTime              @default(now())
  lastActiveAt          DateTime?             // Last meaningful activity
  
  // Connection info
  connectionId          String?               // WebSocket connection ID
  deviceType            String?               // desktop, mobile, web
  
  // Updated via Redis pub/sub from main app
  updatedAt             DateTime              @updatedAt
  
  @@index([status])
  @@index([lastSeenAt])
}

enum PresenceStatus {
  ONLINE
  AWAY
  DND                   // Do not disturb (manual)
  OFFLINE
}
```

---

## 4. Notification Channels

### 4.1 Channel Overview

| Channel | Use Case | Immediacy | Cost | Reach |
|---------|----------|-----------|------|-------|
| **In-App** | Primary for active users | Instant | Free | App users only |
| **Push** | Mobile/Desktop alerts | Instant | Low | Device users |
| **Email** | Detailed notifications, receipts | Minutes | Low | Universal |
| **SMS** | Urgent, when offline | Instant | Medium | Phone users |
| **WhatsApp** | Rich messaging, global reach | Instant | Medium | WhatsApp users |
| **Voice** | Critical escalation | Instant | High | Phone users |

### 4.2 Channel Interface

```typescript
interface NotificationChannel {
  readonly code: NotificationChannelCode;
  readonly name: string;
  readonly supportsRichContent: boolean;
  readonly supportsActions: boolean;
  readonly supportsAttachments: boolean;
  readonly requiresOptIn: boolean;
  readonly costTier: 'free' | 'low' | 'medium' | 'high';
}

enum NotificationChannelCode {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  VOICE = 'voice'
}

const channelDefinitions: Record<NotificationChannelCode, NotificationChannel> = {
  [NotificationChannelCode.IN_APP]: {
    code: NotificationChannelCode.IN_APP,
    name: 'In-App Notification',
    supportsRichContent: true,
    supportsActions: true,
    supportsAttachments: false,
    requiresOptIn: false,
    costTier: 'free'
  },
  [NotificationChannelCode.EMAIL]: {
    code: NotificationChannelCode.EMAIL,
    name: 'Email',
    supportsRichContent: true,
    supportsActions: true,
    supportsAttachments: true,
    requiresOptIn: false,
    costTier: 'low'
  },
  [NotificationChannelCode.PUSH]: {
    code: NotificationChannelCode.PUSH,
    name: 'Push Notification',
    supportsRichContent: false,
    supportsActions: true,
    supportsAttachments: false,
    requiresOptIn: true,
    costTier: 'low'
  },
  [NotificationChannelCode.SMS]: {
    code: NotificationChannelCode.SMS,
    name: 'SMS',
    supportsRichContent: false,
    supportsActions: false,
    supportsAttachments: false,
    requiresOptIn: true,
    costTier: 'medium'
  },
  [NotificationChannelCode.WHATSAPP]: {
    code: NotificationChannelCode.WHATSAPP,
    name: 'WhatsApp',
    supportsRichContent: true,
    supportsActions: true,
    supportsAttachments: true,
    requiresOptIn: true,
    costTier: 'medium'
  },
  [NotificationChannelCode.VOICE]: {
    code: NotificationChannelCode.VOICE,
    name: 'Voice Call',
    supportsRichContent: false,
    supportsActions: false,
    supportsAttachments: false,
    requiresOptIn: true,
    costTier: 'high'
  }
};
```

### 4.3 In-App Notifications

```typescript
interface InAppNotificationPayload {
  notificationId: string;
  recipientId: string;
  
  // Content
  title: string;
  body: string;
  icon?: string;
  imageUrl?: string;
  
  // Action
  actionUrl?: string;
  actionLabel?: string;
  actions?: InAppAction[];
  
  // Display
  type: 'toast' | 'banner' | 'silent';
  duration?: number;        // Auto-dismiss duration (ms)
  persistent?: boolean;     // Stays until dismissed
  
  // Grouping
  groupKey?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  expiresAt?: Date;
}

interface InAppAction {
  id: string;
  label: string;
  action: 'navigate' | 'dismiss' | 'custom';
  url?: string;
  data?: Record<string, unknown>;
}

// Delivered via RabbitMQ to Main App
// Main App then pushes via WebSocket to client
```

### 4.4 Email Notifications

```typescript
interface EmailNotificationPayload {
  notificationId: string;
  
  // Recipient
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  
  // Content
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  
  // Attachments
  attachments?: EmailAttachment[];
  
  // Tracking
  trackOpens?: boolean;
  trackClicks?: boolean;
  
  // Headers
  headers?: Record<string, string>;
  
  // Template (if using provider templates)
  templateId?: string;
  templateData?: Record<string, unknown>;
}

interface EmailAttachment {
  filename: string;
  content: string;          // Base64 encoded
  contentType: string;
  contentId?: string;       // For inline images
}
```

### 4.5 Push Notifications

```typescript
interface PushNotificationPayload {
  notificationId: string;
  
  // Target
  userId: string;
  deviceTokens?: string[];  // If targeting specific devices
  
  // Content
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;
  
  // Action
  clickAction?: string;
  actionUrl?: string;
  
  // Data payload
  data?: Record<string, string>;
  
  // Platform-specific
  android?: {
    channelId?: string;
    priority?: 'normal' | 'high';
    ttl?: number;
  };
  ios?: {
    badge?: number;
    sound?: string;
    contentAvailable?: boolean;
  };
  web?: {
    icon?: string;
    badge?: string;
    requireInteraction?: boolean;
  };
}
```

### 4.6 SMS Notifications

```typescript
interface SMSNotificationPayload {
  notificationId: string;
  
  // Recipient
  to: string;               // E.164 format: +1234567890
  
  // Content
  body: string;             // Max 160 chars for single SMS
  
  // Sender
  from?: string;            // Sender ID or number
  
  // Options
  unicode?: boolean;
  maxSegments?: number;
}
```

### 4.7 WhatsApp Notifications

```typescript
interface WhatsAppNotificationPayload {
  notificationId: string;
  
  // Recipient
  to: string;               // WhatsApp ID or phone number
  
  // Template (required by WhatsApp for non-reply messages)
  templateName: string;
  templateLanguage: string;
  templateComponents?: WhatsAppTemplateComponent[];
  
  // OR Free-form (only for 24h reply window)
  text?: string;
  
  // Media
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'video';
  
  // Interactive
  buttons?: WhatsAppButton[];
}

interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: WhatsAppParameter[];
}

interface WhatsAppParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
}

interface WhatsAppButton {
  type: 'reply' | 'url';
  text: string;
  url?: string;
}
```

### 4.8 Voice Call Notifications

```typescript
interface VoiceNotificationPayload {
  notificationId: string;
  
  // Recipient
  to: string;               // E.164 format
  
  // Caller ID
  from: string;
  
  // Message
  message: string;          // TTS content
  language?: string;        // TTS language
  voice?: string;           // TTS voice selection
  
  // OR Pre-recorded
  audioUrl?: string;
  
  // Call flow
  maxRetries?: number;
  retryDelay?: number;      // Seconds between retries
  
  // DTMF options (press 1 to acknowledge)
  requireAcknowledgment?: boolean;
  acknowledgmentDigit?: string;
  
  // Recording
  record?: boolean;
}
```

---

## 5. Event Types & Triggers

### 5.1 Event Taxonomy

```typescript
// Event naming convention: {category}.{entity}.{action}
// Examples: task.assigned, incident.created, review.requested

interface NotificationEvent {
  type: string;                     // e.g., "task.assigned"
  category: EventCategory;
  
  // Actor (who triggered)
  actorId?: string;
  actorType: 'user' | 'system';
  
  // Recipients
  recipientIds: string[];           // User IDs
  
  // Resource context
  resourceType: string;             // e.g., "task", "incident"
  resourceId: string;
  resourceName?: string;
  
  // Additional context
  organizationId: string;
  teamId?: string;
  projectId?: string;
  
  // Notification hints
  suggestedCriticality?: NotificationCriticality;
  suggestedChannels?: NotificationChannel[];
  
  // Payload
  data: Record<string, unknown>;
  
  // Metadata
  timestamp: Date;
  correlationId?: string;
  
  // Deduplication
  deduplicationKey?: string;
}
```

### 5.2 Event Categories & Types

#### Project Management Events

| Event Type | Description | Default Criticality | Recipients |
|------------|-------------|---------------------|------------|
| `task.assigned` | Task assigned to user | MEDIUM | Assignee |
| `task.unassigned` | Task unassigned from user | LOW | Previous assignee |
| `task.status_changed` | Task status updated | LOW | Assignee, watchers |
| `task.due_soon` | Task due within 24h | MEDIUM | Assignee |
| `task.overdue` | Task past due date | HIGH | Assignee, manager |
| `task.mentioned` | User mentioned in task comment | MEDIUM | Mentioned user |
| `task.comment_added` | New comment on task | LOW | Assignee, watchers |

#### Collaboration Events

| Event Type | Description | Default Criticality | Recipients |
|------------|-------------|---------------------|------------|
| `team.invite` | Invited to team | MEDIUM | Invitee |
| `team.member_added` | New member joined team | LOW | Team admins |
| `team.member_removed` | Member removed from team | LOW | Team admins |
| `project.access_requested` | Access request to project | MEDIUM | Project admins |
| `project.access_granted` | Access granted | MEDIUM | Requester |
| `review.requested` | Code review requested | MEDIUM | Reviewer |
| `review.approved` | Code review approved | LOW | Author |
| `review.changes_requested` | Changes requested in review | MEDIUM | Author |
| `review.commented` | Comment on review | LOW | Participants |

#### AI & Planning Events

| Event Type | Description | Default Criticality | Recipients |
|------------|-------------|---------------------|------------|
| `plan.generated` | AI plan generated | LOW | Requester |
| `plan.approved` | Plan approved | LOW | Requester, team |
| `plan.rejected` | Plan rejected | MEDIUM | Requester |
| `execution.started` | Execution started | LOW | Requester |
| `execution.completed` | Execution completed | MEDIUM | Requester |
| `execution.failed` | Execution failed | HIGH | Requester |
| `ai.error` | AI system error | HIGH | Requester, admins |

#### System & Admin Events

| Event Type | Description | Default Criticality | Recipients |
|------------|-------------|---------------------|------------|
| `system.maintenance` | Scheduled maintenance | MEDIUM | All users |
| `system.outage` | System outage | CRITICAL | Super Admins |
| `api_key.expiring` | API key expiring soon | HIGH | Key owner |
| `api_key.expired` | API key expired | HIGH | Key owner |
| `security.suspicious_login` | Suspicious login detected | CRITICAL | User, admins |
| `security.password_changed` | Password changed | MEDIUM | User |
| `security.2fa_disabled` | 2FA disabled | HIGH | User, admins |

#### Incident Events

| Event Type | Description | Default Criticality | Recipients |
|------------|-------------|---------------------|------------|
| `incident.created` | New incident created | HIGH | On-call, team |
| `incident.assigned` | Incident assigned | HIGH | Assignee |
| `incident.escalated` | Incident escalated | CRITICAL | Escalation target |
| `incident.updated` | Incident updated | MEDIUM | Assignee, watchers |
| `incident.resolved` | Incident resolved | MEDIUM | Stakeholders |
| `incident.reopened` | Incident reopened | HIGH | Assignee |

#### Calendar Events

| Event Type | Description | Default Criticality | Recipients |
|------------|-------------|---------------------|------------|
| `meeting.reminder` | Meeting starting soon | MEDIUM | Attendees |
| `meeting.cancelled` | Meeting cancelled | MEDIUM | Attendees |
| `meeting.rescheduled` | Meeting rescheduled | MEDIUM | Attendees |
| `calendar.conflict` | Schedule conflict detected | LOW | User |

### 5.3 Event-to-Template Mapping

```typescript
interface EventTemplateMapping {
  eventType: string;
  defaultTemplateCode: string;
  defaultCriticality: NotificationCriticality;
  defaultChannels: NotificationChannel[];
  allowedChannels: NotificationChannel[];
  
  // Variable mapping for template rendering
  variableMapping: Record<string, string>;
}

const eventTemplateMappings: EventTemplateMapping[] = [
  {
    eventType: 'task.assigned',
    defaultTemplateCode: 'task.assigned',
    defaultCriticality: 'MEDIUM',
    defaultChannels: ['IN_APP', 'EMAIL'],
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH', 'SMS'],
    variableMapping: {
      'task.title': 'data.taskTitle',
      'task.id': 'resourceId',
      'assigner.name': 'data.assignerName',
      'project.name': 'data.projectName'
    }
  },
  {
    eventType: 'incident.created',
    defaultTemplateCode: 'incident.created',
    defaultCriticality: 'HIGH',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH', 'SMS'],
    allowedChannels: ['IN_APP', 'EMAIL', 'PUSH', 'SMS', 'WHATSAPP', 'VOICE'],
    variableMapping: {
      'incident.title': 'data.incidentTitle',
      'incident.severity': 'data.severity',
      'incident.id': 'resourceId'
    }
  },
  // ... more mappings
];
```

---

## 6. Provider Abstraction Layer

### 6.1 Provider Interface

```typescript
// Base provider interface
interface NotificationProvider<TPayload, TResult> {
  readonly code: string;
  readonly name: string;
  readonly channel: NotificationChannel;
  readonly supportedFeatures: ProviderFeature[];
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  shutdown(): Promise<void>;
  
  // Send
  send(payload: TPayload): Promise<TResult>;
  sendBatch?(payloads: TPayload[]): Promise<TResult[]>;
  
  // Status
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatus>;
  
  // Webhooks
  handleWebhook?(payload: unknown): Promise<WebhookHandleResult>;
}

interface ProviderConfig {
  secretId?: string;        // Reference to Secret Management
  config: Record<string, unknown>;
}

interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

enum ProviderFeature {
  BATCH_SEND = 'batch_send',
  DELIVERY_STATUS = 'delivery_status',
  OPEN_TRACKING = 'open_tracking',
  CLICK_TRACKING = 'click_tracking',
  TEMPLATES = 'templates',
  SCHEDULING = 'scheduling',
  WEBHOOKS = 'webhooks'
}
```

### 6.2 Email Provider Implementations

```typescript
// SendGrid Provider
class SendGridEmailProvider implements NotificationProvider<EmailPayload, EmailResult> {
  readonly code = 'sendgrid';
  readonly name = 'SendGrid';
  readonly channel = NotificationChannel.EMAIL;
  readonly supportedFeatures = [
    ProviderFeature.BATCH_SEND,
    ProviderFeature.DELIVERY_STATUS,
    ProviderFeature.OPEN_TRACKING,
    ProviderFeature.CLICK_TRACKING,
    ProviderFeature.TEMPLATES,
    ProviderFeature.SCHEDULING,
    ProviderFeature.WEBHOOKS
  ];
  
  private client: SendGridClient;
  
  async initialize(config: ProviderConfig): Promise<void> {
    // Fetch API key from Secret Management
    const apiKey = await secretService.getSecret(config.secretId);
    this.client = new SendGridClient(apiKey);
  }
  
  async send(payload: EmailPayload): Promise<EmailResult> {
    const msg = {
      to: payload.to,
      from: payload.from || this.defaultFrom,
      subject: payload.subject,
      text: payload.bodyText,
      html: payload.bodyHtml,
      trackingSettings: {
        clickTracking: { enable: payload.trackClicks },
        openTracking: { enable: payload.trackOpens }
      }
    };
    
    const [response] = await this.client.send(msg);
    
    return {
      success: response.statusCode === 202,
      messageId: response.headers['x-message-id'],
      providerResponse: response
    };
  }
  
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.request({ method: 'GET', url: '/v3/user/profile' });
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return { healthy: false, message: error.message };
    }
  }
  
  async handleWebhook(payload: SendGridWebhookPayload): Promise<WebhookHandleResult> {
    // Process SendGrid event webhooks (delivered, opened, clicked, etc.)
    const events: DeliveryEvent[] = payload.map(event => ({
      messageId: event.sg_message_id,
      eventType: this.mapEventType(event.event),
      timestamp: new Date(event.timestamp * 1000),
      metadata: event
    }));
    
    return { events };
  }
}

// AWS SES Provider
class AWSSESEmailProvider implements NotificationProvider<EmailPayload, EmailResult> {
  readonly code = 'aws_ses';
  readonly name = 'AWS SES';
  readonly channel = NotificationChannel.EMAIL;
  // ... similar implementation
}

// SMTP Provider (generic)
class SMTPEmailProvider implements NotificationProvider<EmailPayload, EmailResult> {
  readonly code = 'smtp';
  readonly name = 'SMTP';
  readonly channel = NotificationChannel.EMAIL;
  // ... implementation using nodemailer
}
```

### 6.3 SMS Provider Implementations

```typescript
// Twilio SMS Provider
class TwilioSMSProvider implements NotificationProvider<SMSPayload, SMSResult> {
  readonly code = 'twilio_sms';
  readonly name = 'Twilio SMS';
  readonly channel = NotificationChannel.SMS;
  readonly supportedFeatures = [
    ProviderFeature.DELIVERY_STATUS,
    ProviderFeature.WEBHOOKS
  ];
  
  private client: TwilioClient;
  
  async initialize(config: ProviderConfig): Promise<void> {
    const credentials = await secretService.getSecret<TwilioCredentials>(config.secretId);
    this.client = new TwilioClient(credentials.accountSid, credentials.authToken);
  }
  
  async send(payload: SMSPayload): Promise<SMSResult> {
    const message = await this.client.messages.create({
      to: payload.to,
      from: payload.from || this.defaultFrom,
      body: payload.body,
      statusCallback: this.webhookUrl
    });
    
    return {
      success: true,
      messageId: message.sid,
      cost: parseFloat(message.price),
      currency: message.priceUnit,
      providerResponse: message
    };
  }
  
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatus> {
    const message = await this.client.messages(messageId).fetch();
    return this.mapStatus(message.status);
  }
}

// AWS SNS Provider
class AWSSNSProvider implements NotificationProvider<SMSPayload, SMSResult> {
  readonly code = 'aws_sns';
  readonly name = 'AWS SNS';
  readonly channel = NotificationChannel.SMS;
  // ... implementation
}
```

### 6.4 Push Provider Implementations

```typescript
// Firebase Cloud Messaging Provider
class FCMPushProvider implements NotificationProvider<PushPayload, PushResult> {
  readonly code = 'fcm';
  readonly name = 'Firebase Cloud Messaging';
  readonly channel = NotificationChannel.PUSH;
  readonly supportedFeatures = [
    ProviderFeature.BATCH_SEND,
    ProviderFeature.DELIVERY_STATUS
  ];
  
  private messaging: FirebaseMessaging;
  
  async initialize(config: ProviderConfig): Promise<void> {
    const serviceAccount = await secretService.getSecret<ServiceAccount>(config.secretId);
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    this.messaging = getMessaging(app);
  }
  
  async send(payload: PushPayload): Promise<PushResult> {
    const message: Message = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon
      },
      data: payload.data,
      android: payload.android,
      apns: {
        payload: {
          aps: {
            badge: payload.ios?.badge,
            sound: payload.ios?.sound
          }
        }
      },
      webpush: payload.web,
      token: payload.deviceToken
    };
    
    const response = await this.messaging.send(message);
    
    return {
      success: true,
      messageId: response,
      providerResponse: response
    };
  }
  
  async sendBatch(payloads: PushPayload[]): Promise<PushResult[]> {
    const messages = payloads.map(p => this.buildMessage(p));
    const response = await this.messaging.sendAll(messages);
    
    return response.responses.map((r, i) => ({
      success: r.success,
      messageId: r.messageId,
      error: r.error?.message
    }));
  }
}

// OneSignal Provider
class OneSignalPushProvider implements NotificationProvider<PushPayload, PushResult> {
  readonly code = 'onesignal';
  readonly name = 'OneSignal';
  readonly channel = NotificationChannel.PUSH;
  // ... implementation
}
```

### 6.5 Voice Provider Implementation

```typescript
// Twilio Voice Provider
class TwilioVoiceProvider implements NotificationProvider<VoicePayload, VoiceResult> {
  readonly code = 'twilio_voice';
  readonly name = 'Twilio Voice';
  readonly channel = NotificationChannel.VOICE;
  readonly supportedFeatures = [
    ProviderFeature.DELIVERY_STATUS,
    ProviderFeature.WEBHOOKS
  ];
  
  private client: TwilioClient;
  
  async send(payload: VoicePayload): Promise<VoiceResult> {
    // Build TwiML for the call
    const twiml = this.buildTwiML(payload);
    
    const call = await this.client.calls.create({
      to: payload.to,
      from: payload.from,
      twiml: twiml,
      statusCallback: this.webhookUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      machineDetection: 'Enable'
    });
    
    return {
      success: true,
      callId: call.sid,
      providerResponse: call
    };
  }
  
  private buildTwiML(payload: VoicePayload): string {
    let twiml = '<Response>';
    
    if (payload.message) {
      twiml += `<Say voice="${payload.voice || 'alice'}" language="${payload.language || 'en-US'}">${payload.message}</Say>`;
    } else if (payload.audioUrl) {
      twiml += `<Play>${payload.audioUrl}</Play>`;
    }
    
    if (payload.requireAcknowledgment) {
      twiml += `<Gather numDigits="1" action="${this.acknowledgeUrl}">`;
      twiml += `<Say>Press ${payload.acknowledgmentDigit || '1'} to acknowledge this notification.</Say>`;
      twiml += '</Gather>';
    }
    
    twiml += '</Response>';
    return twiml;
  }
}
```

### 6.6 Provider Factory & Registry

```typescript
class ProviderRegistry {
  private providers: Map<string, NotificationProvider<any, any>> = new Map();
  private providerConfigs: Map<string, NotificationProvider> = new Map();
  
  // Register available provider implementations
  registerImplementation(provider: NotificationProvider<any, any>): void {
    this.providers.set(provider.code, provider);
  }
  
  // Get provider instance for a channel (respects organization config)
  async getProvider(
    channel: NotificationChannel,
    organizationId?: string
  ): Promise<NotificationProvider<any, any>> {
    // 1. Check for organization-specific provider
    if (organizationId) {
      const orgProvider = await this.getOrgProvider(channel, organizationId);
      if (orgProvider) return orgProvider;
    }
    
    // 2. Fall back to global default
    const globalProvider = await this.getGlobalProvider(channel);
    if (globalProvider) return globalProvider;
    
    throw new Error(`No provider configured for channel: ${channel}`);
  }
  
  // Get all providers for a channel (for failover)
  async getProviders(
    channel: NotificationChannel,
    organizationId?: string
  ): Promise<NotificationProvider<any, any>[]> {
    const configs = await prisma.notificationProvider.findMany({
      where: {
        channel,
        isActive: true,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ORGANIZATION', organizationId }
        ]
      },
      orderBy: { priority: 'asc' }
    });
    
    return Promise.all(
      configs.map(config => this.instantiateProvider(config))
    );
  }
  
  private async instantiateProvider(config: NotificationProviderRecord): Promise<NotificationProvider<any, any>> {
    const implementation = this.providers.get(config.code);
    if (!implementation) {
      throw new Error(`Unknown provider: ${config.code}`);
    }
    
    const instance = Object.create(implementation);
    await instance.initialize({
      secretId: config.secretId,
      config: config.configJson
    });
    
    return instance;
  }
}

// Factory with singleton registry
class ProviderFactory {
  private static registry = new ProviderRegistry();
  
  static {
    // Register all implementations
    this.registry.registerImplementation(new SendGridEmailProvider());
    this.registry.registerImplementation(new AWSSESEmailProvider());
    this.registry.registerImplementation(new SMTPEmailProvider());
    this.registry.registerImplementation(new TwilioSMSProvider());
    this.registry.registerImplementation(new AWSSNSProvider());
    this.registry.registerImplementation(new FCMPushProvider());
    this.registry.registerImplementation(new OneSignalPushProvider());
    this.registry.registerImplementation(new TwilioWhatsAppProvider());
    this.registry.registerImplementation(new TwilioVoiceProvider());
    this.registry.registerImplementation(new VonageVoiceProvider());
  }
  
  static getRegistry(): ProviderRegistry {
    return this.registry;
  }
}
```

---

## 7. Secret Management Integration

### 7.1 Integration Pattern

The Notification Manager integrates with the **Secret Management Module** to securely store and retrieve provider credentials.

```typescript
interface NotificationSecretTypes {
  // Email providers
  SENDGRID_API_KEY: {
    type: 'API_KEY';
    key: string;
  };
  
  AWS_SES_CREDENTIALS: {
    type: 'JSON_CREDENTIAL';
    credential: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    };
  };
  
  SMTP_CREDENTIALS: {
    type: 'USERNAME_PASSWORD';
    username: string;
    password: string;
    host: string;
    port: number;
    secure: boolean;
  };
  
  // SMS/Voice providers
  TWILIO_CREDENTIALS: {
    type: 'JSON_CREDENTIAL';
    credential: {
      accountSid: string;
      authToken: string;
    };
  };
  
  // Push providers
  FCM_SERVICE_ACCOUNT: {
    type: 'JSON_CREDENTIAL';
    credential: ServiceAccountCredential;
  };
  
  ONESIGNAL_CREDENTIALS: {
    type: 'JSON_CREDENTIAL';
    credential: {
      appId: string;
      apiKey: string;
    };
  };
  
  // WhatsApp
  WHATSAPP_BUSINESS_CREDENTIALS: {
    type: 'JSON_CREDENTIAL';
    credential: {
      phoneNumberId: string;
      accessToken: string;
      businessAccountId: string;
    };
  };
}
```

### 7.2 Secret Resolution

```typescript
class NotificationSecretService {
  private secretManagementClient: SecretManagementClient;
  
  constructor() {
    // Connect to Secret Management service
    this.secretManagementClient = new SecretManagementClient({
      baseUrl: config.secretManagement.url,
      serviceToken: config.secretManagement.token
    });
  }
  
  /**
   * Get secret for a notification provider
   */
  async getProviderSecret<T>(
    secretId: string,
    organizationId?: string
  ): Promise<T> {
    const secret = await this.secretManagementClient.getSecret({
      secretId,
      context: {
        organizationId,
        consumerModule: 'notification-manager'
      }
    });
    
    return secret.value as T;
  }
  
  /**
   * Validate provider credentials
   */
  async validateCredentials(
    providerCode: string,
    secretId: string
  ): Promise<ValidationResult> {
    try {
      const secret = await this.getProviderSecret(secretId);
      const provider = ProviderFactory.getRegistry().getProvider(providerCode);
      
      // Initialize with credentials
      await provider.initialize({ secretId, config: {} });
      
      // Health check
      const health = await provider.healthCheck();
      
      return {
        valid: health.healthy,
        message: health.message
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message
      };
    }
  }
}
```

### 7.3 Credential Scoping

| Scope | Who Can Configure | Use Case |
|-------|-------------------|----------|
| **GLOBAL** | Super Admin | Platform-wide default providers |
| **ORGANIZATION** | Org Admin | BYOC - Organization's own credentials |

```typescript
// Example: Organization brings their own SendGrid account
const orgProviderConfig = {
  code: 'sendgrid',
  name: 'Org SendGrid',
  channel: 'EMAIL',
  scope: 'ORGANIZATION',
  organizationId: 'org-123',
  secretId: 'secret-uuid',  // Points to their API key in Secret Management
  isDefault: true,
  priority: 0               // Highest priority for this org
};
```

---

**Continue to Part 2** for:
- Delivery Engine & Reliability
- Template System
- Preference Resolution
- Escalation & Fallback
- Quiet Hours
- API Endpoints
- UI Views
- Implementation Guidelines

