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

The Notification Manager is a **dedicated, independently deployable container** responsible for all notification delivery across the Castiel platform. It provides a unified, scalable, and highly configurable notification system supporting multiple channels with intelligent routing, fallback mechanisms, and delivery guarantees.

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
│                              CASTIEL PLATFORM                                        │
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

# Notification Manager Module Specification - Part 2

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft

---

## Table of Contents - Part 2

8. [Delivery Engine](#8-delivery-engine)
9. [Template System](#9-template-system)
10. [Preference Resolution](#10-preference-resolution)
11. [Escalation & Fallback](#11-escalation--fallback)
12. [Quiet Hours & DND](#12-quiet-hours--dnd)

---

## 8. Delivery Engine

### 8.1 Delivery Flow

```typescript
class DeliveryManager {
  private routingEngine: RoutingEngine;
  private templateEngine: TemplateEngine;
  private preferenceResolver: PreferenceResolver;
  private presenceTracker: PresenceTracker;
  private rateLimiter: RateLimiter;
  private deduplicationService: DeduplicationService;
  private providerRegistry: ProviderRegistry;
  
  /**
   * Main delivery orchestration
   */
  async processNotification(event: NotificationEvent): Promise<ProcessingResult> {
    // 1. Deduplication check
    if (await this.deduplicationService.isDuplicate(event)) {
      return { status: 'DEDUPLICATED', notificationId: null };
    }
    
    // 2. Create notification record
    const notification = await this.createNotification(event);
    
    // 3. For each recipient
    const results = await Promise.all(
      event.recipientIds.map(recipientId => 
        this.processForRecipient(notification, recipientId, event)
      )
    );
    
    return {
      status: 'PROCESSED',
      notificationId: notification.id,
      recipientResults: results
    };
  }
  
  private async processForRecipient(
    notification: Notification,
    recipientId: string,
    event: NotificationEvent
  ): Promise<RecipientResult> {
    // 1. Resolve effective preferences
    const preferences = await this.preferenceResolver.resolve({
      userId: recipientId,
      organizationId: event.organizationId,
      teamId: event.teamId,
      projectId: event.projectId,
      eventType: event.type,
      eventCategory: event.category
    });
    
    // 2. Check if notifications enabled
    if (!preferences.isEnabled) {
      return { recipientId, status: 'DISABLED' };
    }
    
    // 3. Check quiet hours
    const quietHoursStatus = await this.checkQuietHours(recipientId, event);
    if (quietHoursStatus.isQuietHours && !quietHoursStatus.allowCritical) {
      await this.holdNotification(notification, recipientId);
      return { recipientId, status: 'HELD' };
    }
    
    // 4. Determine channels based on criticality and preferences
    const channels = await this.routingEngine.determineChannels({
      event,
      preferences,
      criticality: notification.criticality
    });
    
    // 5. Check presence for smart delivery
    const presence = await this.presenceTracker.getPresence(recipientId);
    const adjustedChannels = this.adjustChannelsForPresence(channels, presence, preferences);
    
    // 6. Render content for each channel
    const renderedContent = await this.templateEngine.render({
      eventType: event.type,
      channels: adjustedChannels,
      data: event.data,
      locale: await this.getUserLocale(recipientId)
    });
    
    // 7. Deliver to each channel
    const deliveryResults = await Promise.all(
      adjustedChannels.map(channel => 
        this.deliverToChannel(notification, recipientId, channel, renderedContent[channel])
      )
    );
    
    // 8. Handle escalation if needed
    if (notification.criticality === 'CRITICAL') {
      await this.escalationManager.scheduleEscalation(notification, recipientId);
    }
    
    return {
      recipientId,
      status: 'DELIVERED',
      channels: deliveryResults
    };
  }
  
  private async deliverToChannel(
    notification: Notification,
    recipientId: string,
    channel: NotificationChannel,
    content: RenderedContent
  ): Promise<ChannelDeliveryResult> {
    // 1. Rate limit check
    const rateLimitResult = await this.rateLimiter.check(recipientId, channel);
    if (!rateLimitResult.allowed) {
      return { channel, status: 'RATE_LIMITED' };
    }
    
    // 2. Create delivery record
    const delivery = await this.createDeliveryRecord(notification, recipientId, channel);
    
    // 3. Get provider
    const provider = await this.providerRegistry.getProvider(
      channel,
      notification.organizationId
    );
    
    // 4. Build payload
    const payload = await this.buildPayload(channel, recipientId, content, notification);
    
    // 5. Send with circuit breaker
    try {
      const result = await this.circuitBreaker.execute(
        provider.code,
        () => provider.send(payload)
      );
      
      await this.updateDeliveryStatus(delivery, 'SENT', result);
      return { channel, status: 'SENT', messageId: result.messageId };
    } catch (error) {
      await this.updateDeliveryStatus(delivery, 'FAILED', null, error);
      
      // 6. Attempt failover to backup provider
      const failoverResult = await this.attemptFailover(channel, payload, notification.organizationId);
      if (failoverResult.success) {
        return { channel, status: 'SENT_FAILOVER', messageId: failoverResult.messageId };
      }
      
      // 7. Schedule retry
      await this.scheduleRetry(delivery, error);
      return { channel, status: 'FAILED', error: error.message };
    }
  }
  
  private adjustChannelsForPresence(
    channels: NotificationChannel[],
    presence: UserPresence,
    preferences: ResolvedPreferences
  ): NotificationChannel[] {
    if (!preferences.presenceAware) {
      return channels;
    }
    
    if (presence.status === 'ONLINE') {
      // User is online - prioritize in-app
      return channels.filter(ch => {
        const pref = preferences.channelPreferences[ch];
        return !pref?.onlyWhenOffline;
      });
    }
    
    return channels;
  }
}
```

### 8.2 Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  
  // Criticality-based overrides
  criticalityOverrides: Record<NotificationCriticality, Partial<RetryConfig>>;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,      // 1 second
  maxDelayMs: 3600000,    // 1 hour
  backoffMultiplier: 2,
  
  criticalityOverrides: {
    LOW: { maxAttempts: 2, maxDelayMs: 86400000 },    // 24h max
    MEDIUM: { maxAttempts: 3, maxDelayMs: 3600000 },   // 1h max
    HIGH: { maxAttempts: 5, maxDelayMs: 1800000 },     // 30m max
    CRITICAL: { maxAttempts: 10, maxDelayMs: 300000 }  // 5m max
  }
};

class RetryService {
  private config: RetryConfig;
  
  async scheduleRetry(delivery: NotificationDelivery, error: Error): Promise<void> {
    const criticality = delivery.notification.criticality;
    const effectiveConfig = {
      ...this.config,
      ...this.config.criticalityOverrides[criticality]
    };
    
    if (delivery.attemptCount >= effectiveConfig.maxAttempts) {
      // Max retries exceeded - mark as failed
      await this.markAsFailed(delivery, error);
      return;
    }
    
    // Calculate delay with exponential backoff + jitter
    const delay = Math.min(
      effectiveConfig.baseDelayMs * Math.pow(effectiveConfig.backoffMultiplier, delivery.attemptCount),
      effectiveConfig.maxDelayMs
    );
    const jitter = delay * 0.1 * Math.random();
    const nextRetryAt = new Date(Date.now() + delay + jitter);
    
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        attemptCount: { increment: 1 },
        nextRetryAt,
        lastError: error.message,
        status: 'PENDING'
      }
    });
    
    // Publish retry event
    await this.rabbitMQ.publish('notification.retry', {
      deliveryId: delivery.id,
      scheduledFor: nextRetryAt
    });
  }
}
```

### 8.3 Deduplication

```typescript
class DeduplicationService {
  private redis: Redis;
  private ttlSeconds: number = 3600; // 1 hour window
  
  /**
   * Check if notification is a duplicate
   * Deduplication key format: {eventType}:{resourceId}:{recipientId}:{hash}
   */
  async isDuplicate(event: NotificationEvent): Promise<boolean> {
    const key = this.buildDeduplicationKey(event);
    
    const result = await this.redis.set(
      `dedup:${key}`,
      '1',
      'EX', this.ttlSeconds,
      'NX'  // Only set if not exists
    );
    
    // If null, key already existed (duplicate)
    return result === null;
  }
  
  private buildDeduplicationKey(event: NotificationEvent): string {
    if (event.deduplicationKey) {
      return event.deduplicationKey;
    }
    
    // Default key: event type + resource + content hash
    const contentHash = crypto
      .createHash('md5')
      .update(JSON.stringify(event.data))
      .digest('hex')
      .substring(0, 8);
    
    return `${event.type}:${event.resourceId}:${contentHash}`;
  }
}
```

### 8.4 Rate Limiting

```typescript
interface RateLimitConfig {
  // Per-channel limits (per user per hour)
  channelLimits: Record<NotificationChannel, number>;
  
  // Per-user total limit
  userTotalLimit: number;
  
  // Burst allowance
  burstMultiplier: number;
}

const defaultRateLimits: RateLimitConfig = {
  channelLimits: {
    IN_APP: 100,      // 100 per hour
    EMAIL: 20,        // 20 per hour
    PUSH: 50,         // 50 per hour
    SMS: 10,          // 10 per hour
    WHATSAPP: 10,
    VOICE: 5          // 5 per hour (expensive)
  },
  userTotalLimit: 200,
  burstMultiplier: 2
};

class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  
  async check(userId: string, channel: NotificationChannel): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = 3600000; // 1 hour
    const windowKey = Math.floor(now / windowMs);
    
    // Channel-specific key
    const channelKey = `ratelimit:${userId}:${channel}:${windowKey}`;
    
    // Get current count
    const currentCount = await this.redis.incr(channelKey);
    if (currentCount === 1) {
      await this.redis.expire(channelKey, 3600);
    }
    
    const limit = this.config.channelLimits[channel];
    
    if (currentCount > limit) {
      return {
        allowed: false,
        currentCount,
        limit,
        resetAt: new Date((windowKey + 1) * windowMs)
      };
    }
    
    return { allowed: true, currentCount, limit };
  }
}
```

### 8.5 Batch/Digest Processing

```typescript
class BatchProcessor {
  /**
   * Collect low-priority notifications for digest
   */
  async collectForDigest(notification: Notification, recipientId: string): Promise<void> {
    const preferences = await this.getDigestPreferences(recipientId);
    
    if (!preferences.digestEnabled) {
      return;
    }
    
    // Find or create active batch
    let batch = await prisma.notificationBatch.findFirst({
      where: {
        recipientId,
        status: 'COLLECTING',
        frequency: preferences.digestFrequency
      }
    });
    
    if (!batch) {
      batch = await this.createBatch(recipientId, preferences);
    }
    
    // Add notification to batch
    await prisma.notification.update({
      where: { id: notification.id },
      data: { batchId: batch.id, status: 'SCHEDULED' }
    });
  }
  
  /**
   * Process and send digest
   */
  async processDigest(batchId: string): Promise<void> {
    const batch = await prisma.notificationBatch.findUnique({
      where: { id: batchId },
      include: { notifications: true }
    });
    
    if (!batch || batch.status !== 'READY') {
      return;
    }
    
    // Update status
    await prisma.notificationBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' }
    });
    
    // Group notifications by category
    const grouped = this.groupNotifications(batch.notifications);
    
    // Render digest content
    const content = await this.templateEngine.renderDigest({
      recipientId: batch.recipientId,
      groups: grouped,
      period: batch.frequency,
      locale: await this.getUserLocale(batch.recipientId)
    });
    
    // Send via email
    await this.deliveryManager.deliverToChannel(
      batch,
      batch.recipientId,
      'EMAIL',
      content
    );
    
    // Update status
    await prisma.notificationBatch.update({
      where: { id: batchId },
      data: { status: 'DELIVERED', deliveredAt: new Date() }
    });
  }
  
  private groupNotifications(notifications: Notification[]): GroupedNotifications {
    return notifications.reduce((groups, notification) => {
      const category = notification.eventCategory;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(notification);
      return groups;
    }, {} as GroupedNotifications);
  }
}
```

---

## 9. Template System

### 9.1 Template Engine

```typescript
class TemplateEngine {
  private templateCache: Map<string, CompiledTemplate> = new Map();
  private variableResolver: VariableResolver;
  private localeManager: LocaleManager;
  
  /**
   * Render notification content for all requested channels
   */
  async render(params: RenderParams): Promise<Record<NotificationChannel, RenderedContent>> {
    const template = await this.getTemplate(params.eventType, params.organizationId);
    const results: Record<NotificationChannel, RenderedContent> = {};
    
    for (const channel of params.channels) {
      const channelTemplate = template.channels.find(c => c.channel === channel);
      if (!channelTemplate) {
        throw new Error(`No template for channel ${channel}`);
      }
      
      results[channel] = await this.renderChannel(channelTemplate, params);
    }
    
    return results;
  }
  
  private async renderChannel(
    channelTemplate: TemplateChannel,
    params: RenderParams
  ): Promise<RenderedContent> {
    // Get localized content
    const localization = this.getLocalization(channelTemplate, params.locale);
    
    // Resolve variables
    const variables = await this.variableResolver.resolve(params.data, params.eventType);
    
    // Compile and render templates
    const title = this.compileAndRender(localization.title, variables);
    const body = this.compileAndRender(localization.body, variables);
    const bodyHtml = localization.bodyHtml 
      ? this.compileAndRender(localization.bodyHtml, variables)
      : undefined;
    const subject = localization.subject
      ? this.compileAndRender(localization.subject, variables)
      : undefined;
    const actionLabel = localization.actionLabel
      ? this.compileAndRender(localization.actionLabel, variables)
      : undefined;
    
    return {
      title,
      body,
      bodyHtml,
      subject,
      actionLabel,
      actionUrl: variables.actionUrl
    };
  }
  
  private compileAndRender(template: string, variables: Record<string, unknown>): string {
    // Use Handlebars or similar
    const compiled = Handlebars.compile(template);
    return compiled(variables);
  }
  
  private getLocalization(channel: TemplateChannel, locale: string): TemplateLocalization {
    // Try exact match
    let localization = channel.localizations.find(l => l.locale === locale);
    
    // Try language only (e.g., 'en' for 'en-US')
    if (!localization) {
      const language = locale.split('-')[0];
      localization = channel.localizations.find(l => l.locale === language);
    }
    
    // Fall back to English
    if (!localization) {
      localization = channel.localizations.find(l => l.locale === 'en');
    }
    
    if (!localization) {
      throw new Error(`No localization found for channel`);
    }
    
    return localization;
  }
}
```

### 9.2 Variable Resolver

```typescript
class VariableResolver {
  /**
   * Resolve template variables from event data
   */
  async resolve(
    data: Record<string, unknown>,
    eventType: string
  ): Promise<Record<string, unknown>> {
    const mapping = this.getVariableMapping(eventType);
    const resolved: Record<string, unknown> = {};
    
    // Standard variables
    resolved.app = {
      name: 'Castiel',
      url: config.appUrl,
      supportEmail: config.supportEmail
    };
    
    resolved.timestamp = new Date();
    resolved.year = new Date().getFullYear();
    
    // Event-specific variables
    for (const [templateVar, dataPath] of Object.entries(mapping)) {
      resolved[templateVar] = this.getNestedValue(data, dataPath);
    }
    
    // Generate action URL
    resolved.actionUrl = this.generateActionUrl(eventType, data);
    
    return resolved;
  }
  
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => 
      current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined,
      obj
    );
  }
  
  private generateActionUrl(eventType: string, data: Record<string, unknown>): string {
    // Generate deep link based on event type
    const urlPatterns: Record<string, string> = {
      'task.assigned': '/projects/{{projectId}}/tasks/{{taskId}}',
      'task.mentioned': '/projects/{{projectId}}/tasks/{{taskId}}#comment-{{commentId}}',
      'incident.created': '/incidents/{{incidentId}}',
      'review.requested': '/reviews/{{reviewId}}',
      'team.invite': '/invitations/{{invitationId}}'
    };
    
    const pattern = urlPatterns[eventType] || '/';
    let url = `${config.appUrl}${pattern}`;
    
    // Replace placeholders
    url = url.replace(/\{\{(\w+)\}\}/g, (_, key) => 
      String(data[key] || '')
    );
    
    return url;
  }
}
```

### 9.3 Default Templates

```typescript
// Seed default templates
const defaultTemplates: NotificationTemplateInput[] = [
  // Task Assigned
  {
    code: 'task.assigned',
    name: 'Task Assigned',
    eventType: 'task.assigned',
    scope: 'GLOBAL',
    defaultCriticality: 'MEDIUM',
    channels: [
      {
        channel: 'IN_APP',
        localizations: [
          {
            locale: 'en',
            title: 'New task assigned',
            body: '{{assigner.name}} assigned you "{{task.title}}"',
            actionLabel: 'View Task'
          },
          {
            locale: 'fr',
            title: 'Nouvelle tâche assignée',
            body: '{{assigner.name}} vous a assigné "{{task.title}}"',
            actionLabel: 'Voir la tâche'
          }
        ]
      },
      {
        channel: 'EMAIL',
        localizations: [
          {
            locale: 'en',
            subject: '[{{project.name}}] Task assigned: {{task.title}}',
            title: 'Task Assigned',
            body: 'Hi {{recipient.firstName}},\n\n{{assigner.name}} has assigned you a new task in {{project.name}}.\n\nTask: {{task.title}}\nDue: {{task.dueDate}}\n\nClick below to view the task details.',
            bodyHtml: `
              <h1>Task Assigned</h1>
              <p>Hi {{recipient.firstName}},</p>
              <p><strong>{{assigner.name}}</strong> has assigned you a new task in <strong>{{project.name}}</strong>.</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>{{task.title}}</strong></p>
                <p style="margin: 8px 0 0 0; color: #666;">Due: {{task.dueDate}}</p>
              </div>
              <a href="{{actionUrl}}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Task</a>
            `,
            actionLabel: 'View Task'
          },
          {
            locale: 'fr',
            subject: '[{{project.name}}] Tâche assignée: {{task.title}}',
            title: 'Tâche Assignée',
            body: 'Bonjour {{recipient.firstName}},\n\n{{assigner.name}} vous a assigné une nouvelle tâche dans {{project.name}}.\n\nTâche: {{task.title}}\nÉchéance: {{task.dueDate}}\n\nCliquez ci-dessous pour voir les détails.',
            bodyHtml: '...',
            actionLabel: 'Voir la tâche'
          }
        ]
      },
      {
        channel: 'PUSH',
        localizations: [
          {
            locale: 'en',
            title: '📋 Task assigned',
            body: '{{assigner.name}}: {{task.title}}'
          },
          {
            locale: 'fr',
            title: '📋 Tâche assignée',
            body: '{{assigner.name}}: {{task.title}}'
          }
        ]
      },
      {
        channel: 'SMS',
        localizations: [
          {
            locale: 'en',
            title: 'Task Assigned',
            body: '[Coder] {{assigner.name}} assigned you "{{task.title}}" in {{project.name}}. View: {{actionUrl}}'
          }
        ]
      }
    ]
  },
  
  // Incident Created (Critical)
  {
    code: 'incident.created',
    name: 'Incident Created',
    eventType: 'incident.created',
    scope: 'GLOBAL',
    defaultCriticality: 'HIGH',
    channels: [
      {
        channel: 'IN_APP',
        localizations: [
          {
            locale: 'en',
            title: '🚨 New Incident',
            body: '{{incident.severity}} severity incident: {{incident.title}}',
            actionLabel: 'View Incident'
          }
        ]
      },
      {
        channel: 'EMAIL',
        localizations: [
          {
            locale: 'en',
            subject: '🚨 [INCIDENT] {{incident.severity}}: {{incident.title}}',
            title: 'Incident Created',
            body: 'A new {{incident.severity}} severity incident has been created.\n\nTitle: {{incident.title}}\nReported by: {{reporter.name}}\nTime: {{incident.createdAt}}\n\nImmediate attention required.',
            bodyHtml: '...',
            actionLabel: 'View Incident'
          }
        ]
      },
      {
        channel: 'SMS',
        localizations: [
          {
            locale: 'en',
            title: 'INCIDENT',
            body: '[INCIDENT] {{incident.severity}}: {{incident.title}}. View: {{actionUrl}}'
          }
        ]
      },
      {
        channel: 'VOICE',
        localizations: [
          {
            locale: 'en',
            title: 'Incident Alert',
            body: 'Alert! A {{incident.severity}} severity incident has been created. Title: {{incident.title}}. Please check the Coder platform immediately. Press 1 to acknowledge.'
          }
        ]
      }
    ]
  },
  
  // Security Alert
  {
    code: 'security.suspicious_login',
    name: 'Suspicious Login Alert',
    eventType: 'security.suspicious_login',
    scope: 'GLOBAL',
    defaultCriticality: 'CRITICAL',
    channels: [
      {
        channel: 'EMAIL',
        localizations: [
          {
            locale: 'en',
            subject: '⚠️ [Security Alert] Suspicious login detected',
            title: 'Suspicious Login Detected',
            body: 'We detected a suspicious login attempt on your account.\n\nTime: {{login.timestamp}}\nLocation: {{login.location}}\nDevice: {{login.device}}\nIP: {{login.ip}}\n\nIf this was you, you can ignore this message. Otherwise, please secure your account immediately.',
            bodyHtml: '...',
            actionLabel: 'Secure Account'
          }
        ]
      },
      {
        channel: 'SMS',
        localizations: [
          {
            locale: 'en',
            title: 'Security Alert',
            body: '[Coder Security] Suspicious login from {{login.location}}. If not you, secure account: {{actionUrl}}'
          }
        ]
      },
      {
        channel: 'VOICE',
        localizations: [
          {
            locale: 'en',
            title: 'Security Alert',
            body: 'Security alert from Coder. A suspicious login was detected on your account from {{login.location}}. If this was not you, please secure your account immediately by visiting the Coder platform. Press 1 to acknowledge.'
          }
        ]
      }
    ]
  }
  
  // ... more templates
];
```

---

## 10. Preference Resolution

### 10.1 Preference Hierarchy

```
GLOBAL (Platform defaults)
    ↓
ORGANIZATION (Organization-wide settings)
    ↓
TEAM (Team-level overrides)
    ↓
PROJECT (Project-specific settings)
    ↓
USER (User's personal preferences)
```

### 10.2 Preference Resolver

```typescript
interface PreferenceContext {
  userId: string;
  organizationId: string;
  teamId?: string;
  projectId?: string;
  eventType?: string;
  eventCategory?: EventCategory;
}

interface ResolvedPreferences {
  isEnabled: boolean;
  minCriticality: NotificationCriticality;
  channelPreferences: Record<NotificationChannel, ChannelPreferenceResolved>;
  presenceAware: boolean;
  digestEnabled: boolean;
  digestFrequency?: BatchFrequency;
}

interface ChannelPreferenceResolved {
  isEnabled: boolean;
  onlyWhenOffline: boolean;
  digestEnabled: boolean;
}

class PreferenceResolver {
  /**
   * Resolve effective preferences by merging hierarchy
   */
  async resolve(context: PreferenceContext): Promise<ResolvedPreferences> {
    // Fetch all applicable preferences
    const preferences = await this.fetchPreferences(context);
    
    // Sort by scope priority (GLOBAL -> USER)
    const sorted = this.sortByScope(preferences);
    
    // Merge preferences (later scopes override earlier)
    return this.mergePreferences(sorted);
  }
  
  private async fetchPreferences(context: PreferenceContext): Promise<NotificationPreference[]> {
    const conditions: Prisma.NotificationPreferenceWhereInput[] = [];
    
    // Global
    conditions.push({ scope: 'GLOBAL' });
    
    // Organization
    conditions.push({
      scope: 'ORGANIZATION',
      organizationId: context.organizationId
    });
    
    // Team
    if (context.teamId) {
      conditions.push({
        scope: 'TEAM',
        teamId: context.teamId
      });
    }
    
    // Project
    if (context.projectId) {
      conditions.push({
        scope: 'PROJECT',
        projectId: context.projectId
      });
    }
    
    // User
    conditions.push({
      scope: 'USER',
      userId: context.userId
    });
    
    return prisma.notificationPreference.findMany({
      where: {
        OR: conditions,
        OR: [
          { eventType: null, eventCategory: null },           // Applies to all
          { eventType: context.eventType },                    // Event-specific
          { eventCategory: context.eventCategory }             // Category-specific
        ]
      },
      include: { channelPreferences: true }
    });
  }
  
  private sortByScope(preferences: NotificationPreference[]): NotificationPreference[] {
    const scopePriority: Record<PreferenceScope, number> = {
      GLOBAL: 0,
      ORGANIZATION: 1,
      TEAM: 2,
      PROJECT: 3,
      USER: 4
    };
    
    return preferences.sort((a, b) => 
      scopePriority[a.scope] - scopePriority[b.scope]
    );
  }
  
  private mergePreferences(sorted: NotificationPreference[]): ResolvedPreferences {
    // Start with defaults
    let result: ResolvedPreferences = {
      isEnabled: true,
      minCriticality: 'LOW',
      channelPreferences: this.getDefaultChannelPreferences(),
      presenceAware: true,
      digestEnabled: false
    };
    
    // Merge each preference layer
    for (const pref of sorted) {
      if (pref.isEnabled !== undefined) {
        result.isEnabled = pref.isEnabled;
      }
      
      if (pref.minCriticality) {
        result.minCriticality = pref.minCriticality;
      }
      
      // Merge channel preferences
      for (const channelPref of pref.channelPreferences) {
        result.channelPreferences[channelPref.channel] = {
          isEnabled: channelPref.isEnabled,
          onlyWhenOffline: channelPref.onlyWhenOffline,
          digestEnabled: channelPref.digestEnabled
        };
        
        if (channelPref.digestEnabled) {
          result.digestEnabled = true;
          result.digestFrequency = channelPref.digestFrequency;
        }
      }
    }
    
    return result;
  }
  
  private getDefaultChannelPreferences(): Record<NotificationChannel, ChannelPreferenceResolved> {
    return {
      IN_APP: { isEnabled: true, onlyWhenOffline: false, digestEnabled: false },
      EMAIL: { isEnabled: true, onlyWhenOffline: false, digestEnabled: false },
      PUSH: { isEnabled: true, onlyWhenOffline: true, digestEnabled: false },
      SMS: { isEnabled: false, onlyWhenOffline: true, digestEnabled: false },
      WHATSAPP: { isEnabled: false, onlyWhenOffline: true, digestEnabled: false },
      VOICE: { isEnabled: false, onlyWhenOffline: true, digestEnabled: false }
    };
  }
}
```

---

## 11. Escalation & Fallback

### 11.1 Escalation Manager

```typescript
class EscalationManager {
  private scheduler: Scheduler;
  
  /**
   * Schedule escalation for critical notification
   */
  async scheduleEscalation(notification: Notification, recipientId: string): Promise<void> {
    // Find applicable escalation chain
    const chain = await this.findEscalationChain(notification);
    
    if (!chain) {
      return; // No escalation configured
    }
    
    // Link notification to chain
    await prisma.notification.update({
      where: { id: notification.id },
      data: { escalationChainId: chain.id, escalationLevel: 0 }
    });
    
    // Schedule first escalation check
    const firstLevel = chain.levels.find(l => l.level === 1);
    if (firstLevel) {
      await this.scheduleEscalationCheck(notification, firstLevel);
    }
  }
  
  /**
   * Check and execute escalation
   */
  async checkEscalation(notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        escalationChain: { include: { levels: true } },
        deliveries: true
      }
    });
    
    if (!notification || !notification.escalationChain) {
      return;
    }
    
    // Check if acknowledgment condition is met
    const acknowledged = await this.checkAcknowledgment(notification);
    if (acknowledged) {
      await this.cancelEscalation(notification);
      return;
    }
    
    // Get next escalation level
    const nextLevel = notification.escalationChain.levels.find(
      l => l.level === notification.escalationLevel + 1
    );
    
    if (!nextLevel) {
      // Max escalation reached
      await this.logMaxEscalation(notification);
      return;
    }
    
    // Execute escalation
    await this.executeEscalation(notification, nextLevel);
  }
  
  private async executeEscalation(
    notification: Notification,
    level: EscalationLevel
  ): Promise<void> {
    // Determine recipients
    const recipients = await this.resolveEscalationRecipients(notification, level);
    
    // Send via escalation channels
    for (const recipientId of recipients) {
      for (const channel of level.channels) {
        await this.deliveryManager.deliverToChannel(
          notification,
          recipientId,
          channel,
          await this.renderEscalationContent(notification, level, channel)
        );
      }
    }
    
    // Update notification
    await prisma.notification.update({
      where: { id: notification.id },
      data: { escalationLevel: level.level }
    });
    
    // Audit log
    await this.auditLogger.log({
      eventType: 'NOTIFICATION_ESCALATED',
      notificationId: notification.id,
      details: { level: level.level, channels: level.channels, recipients }
    });
    
    // Schedule next level check
    const nextLevel = notification.escalationChain.levels.find(
      l => l.level === level.level + 1
    );
    if (nextLevel) {
      await this.scheduleEscalationCheck(notification, nextLevel);
    }
  }
  
  private async resolveEscalationRecipients(
    notification: Notification,
    level: EscalationLevel
  ): Promise<string[]> {
    switch (level.recipientType) {
      case 'ORIGINAL':
        return [notification.recipientId];
        
      case 'USER':
        return level.recipientUserId ? [level.recipientUserId] : [];
        
      case 'ROLE':
        return this.getUsersByRole(level.recipientRoleId, notification.organizationId);
        
      case 'ON_CALL':
        return this.getCurrentOnCallUsers(notification.organizationId, notification.teamId);
        
      default:
        return [notification.recipientId];
    }
  }
}
```

### 11.2 Fallback Handler

```typescript
class FallbackHandler {
  /**
   * Attempt fallback channels when primary channel fails
   */
  async attemptFallback(
    notification: Notification,
    failedChannel: NotificationChannel,
    recipientId: string
  ): Promise<FallbackResult> {
    // Get channel configuration
    const channelConfig = await this.getChannelConfig(
      failedChannel,
      notification.organizationId
    );
    
    if (!channelConfig.fallbackChain || channelConfig.fallbackChain.length === 0) {
      return { success: false, reason: 'No fallback configured' };
    }
    
    // Try each fallback channel in order
    for (const fallbackChannel of channelConfig.fallbackChain) {
      // Check if fallback channel is enabled for user
      const preferences = await this.preferenceResolver.resolve({
        userId: recipientId,
        organizationId: notification.organizationId
      });
      
      if (!preferences.channelPreferences[fallbackChannel]?.isEnabled) {
        continue;
      }
      
      // Attempt delivery
      const result = await this.deliveryManager.deliverToChannel(
        notification,
        recipientId,
        fallbackChannel,
        await this.templateEngine.render({
          eventType: notification.eventType,
          channels: [fallbackChannel],
          data: notification.metadata
        })
      );
      
      if (result.status === 'SENT') {
        // Audit log
        await this.auditLogger.log({
          eventType: 'PROVIDER_FAILOVER',
          notificationId: notification.id,
          details: {
            failedChannel,
            fallbackChannel,
            success: true
          }
        });
        
        return { success: true, fallbackChannel, result };
      }
    }
    
    return { success: false, reason: 'All fallback channels failed' };
  }
}
```

### 11.3 Default Escalation Chain

```typescript
// Default critical notification escalation
const defaultCriticalEscalation: EscalationChainInput = {
  name: 'Default Critical Escalation',
  scope: 'GLOBAL',
  triggerCriticality: 'CRITICAL',
  triggerEventTypes: ['incident.created', 'security.suspicious_login', 'system.outage'],
  levels: [
    {
      level: 0,
      delayMinutes: 0,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
      recipientType: 'ORIGINAL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    },
    {
      level: 1,
      delayMinutes: 5,
      channels: ['SMS'],
      recipientType: 'ORIGINAL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    },
    {
      level: 2,
      delayMinutes: 10,
      channels: ['VOICE'],
      recipientType: 'ORIGINAL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    },
    {
      level: 3,
      delayMinutes: 15,
      channels: ['VOICE', 'SMS'],
      recipientType: 'ON_CALL',
      escalateIf: 'NOT_ACKNOWLEDGED'
    }
  ]
};
```

---

## 12. Quiet Hours & DND

### 12.1 Quiet Hours Service

```typescript
class QuietHoursService {
  /**
   * Check if user is in quiet hours
   */
  async checkQuietHours(
    userId: string,
    notification: Notification
  ): Promise<QuietHoursStatus> {
    const quietHours = await this.getQuietHours(userId);
    
    if (!quietHours || !quietHours.isEnabled) {
      return { isQuietHours: false };
    }
    
    // Check manual DND override
    if (quietHours.dndActiveUntil && quietHours.dndActiveUntil > new Date()) {
      return this.applyQuietHoursRules(quietHours, notification);
    }
    
    // Check scheduled quiet hours
    const now = new Date();
    const userTime = this.convertToUserTimezone(now, quietHours.timezone);
    
    const isInSchedule = this.isInSchedule(userTime, quietHours.schedules);
    
    if (!isInSchedule) {
      return { isQuietHours: false };
    }
    
    return this.applyQuietHoursRules(quietHours, notification);
  }
  
  private applyQuietHoursRules(
    quietHours: QuietHours,
    notification: Notification
  ): QuietHoursStatus {
    // Always allow critical if configured
    if (quietHours.allowCritical && notification.criticality === 'CRITICAL') {
      return { isQuietHours: false, overrideReason: 'CRITICAL_ALLOWED' };
    }
    
    // Check channel-specific rules
    const channelRules: Record<NotificationChannel, QuietHoursBehavior> = {};
    for (const rule of quietHours.channelRules) {
      channelRules[rule.channel] = rule.behavior;
    }
    
    return {
      isQuietHours: true,
      holdNonCritical: quietHours.holdNonCritical,
      channelRules
    };
  }
  
  private isInSchedule(userTime: Date, schedules: QuietHoursSchedule[]): boolean {
    const dayOfWeek = userTime.getDay();
    const minutesSinceMidnight = userTime.getHours() * 60 + userTime.getMinutes();
    
    for (const schedule of schedules) {
      if (!schedule.dayOfWeek.includes(dayOfWeek)) {
        continue;
      }
      
      // Handle overnight schedules (e.g., 22:00 - 07:00)
      if (schedule.startMinutes > schedule.endMinutes) {
        if (minutesSinceMidnight >= schedule.startMinutes || 
            minutesSinceMidnight < schedule.endMinutes) {
          return true;
        }
      } else {
        if (minutesSinceMidnight >= schedule.startMinutes && 
            minutesSinceMidnight < schedule.endMinutes) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Release held notifications when quiet hours end
   */
  async releaseHeldNotifications(userId: string): Promise<void> {
    const heldNotifications = await prisma.notification.findMany({
      where: {
        recipientId: userId,
        status: 'HELD'
      }
    });
    
    for (const notification of heldNotifications) {
      // Re-process notification
      await this.deliveryManager.processNotification({
        ...notification,
        // Skip quiet hours check this time
        skipQuietHours: true
      });
      
      // Update status
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'PROCESSING' }
      });
      
      // Audit log
      await this.auditLogger.log({
        eventType: 'NOTIFICATION_RELEASED',
        notificationId: notification.id,
        details: { reason: 'QUIET_HOURS_ENDED' }
      });
    }
  }
}
```

### 12.2 DND API

```typescript
// Enable/disable DND
interface SetDNDRequest {
  enabled: boolean;
  duration?: number;        // Minutes
  untilTime?: Date;         // Specific end time
}

// Quick DND options
const dndPresets = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: 'Until tomorrow', minutes: 'untilTomorrow' },
  { label: 'Until end of day', minutes: 'untilEndOfDay' }
];
```

---

**Continue to Part 3** for:
- API Endpoints
- UI Views & Components
- Webhook Integration
- Implementation Guidelines
- Performance & Scaling

# Notification Manager Module Specification - Part 3

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft

---

## Table of Contents - Part 3

13. [API Endpoints](#13-api-endpoints)
14. [UI Views](#14-ui-views)
15. [Webhook Integration](#15-webhook-integration)
16. [Implementation Guidelines](#16-implementation-guidelines)

---

## 13. API Endpoints

### 13.1 Internal Admin API

Base URL: `http://notification-manager:3001/api/v1`

#### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notifications` | Send notification (direct API call) |
| `GET` | `/notifications` | List notifications (with filters) |
| `GET` | `/notifications/:id` | Get notification details |
| `DELETE` | `/notifications/:id` | Cancel pending notification |
| `POST` | `/notifications/:id/acknowledge` | Mark as acknowledged |

#### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/templates` | List all templates |
| `GET` | `/templates/:id` | Get template details |
| `POST` | `/templates` | Create template |
| `PUT` | `/templates/:id` | Update template |
| `DELETE` | `/templates/:id` | Delete template |
| `POST` | `/templates/:id/preview` | Preview rendered template |
| `POST` | `/templates/:id/duplicate` | Duplicate template |

#### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/preferences/user/:userId` | Get user preferences |
| `PUT` | `/preferences/user/:userId` | Update user preferences |
| `GET` | `/preferences/organization/:orgId` | Get org preferences |
| `PUT` | `/preferences/organization/:orgId` | Update org preferences |
| `GET` | `/preferences/resolved` | Get resolved preferences for context |

#### Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/providers` | List configured providers |
| `GET` | `/providers/:id` | Get provider details |
| `POST` | `/providers` | Configure new provider |
| `PUT` | `/providers/:id` | Update provider config |
| `DELETE` | `/providers/:id` | Remove provider |
| `POST` | `/providers/:id/test` | Test provider connectivity |
| `GET` | `/providers/:id/health` | Get provider health status |

#### Channels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/channels` | List channel configurations |
| `PUT` | `/channels/:channel` | Update channel configuration |
| `GET` | `/channels/:channel/stats` | Get channel statistics |

#### History & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/history` | Notification history (paginated) |
| `GET` | `/history/:notificationId` | Delivery history for notification |
| `GET` | `/audit` | Audit log (admin only) |
| `GET` | `/metrics` | Delivery metrics & analytics |

#### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/webhooks` | List webhooks |
| `POST` | `/webhooks` | Create webhook |
| `PUT` | `/webhooks/:id` | Update webhook |
| `DELETE` | `/webhooks/:id` | Delete webhook |
| `POST` | `/webhooks/:id/test` | Test webhook delivery |

#### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/health/detailed` | Detailed health (providers, queues) |

### 13.2 API Examples

```typescript
// Send notification via API
POST /api/v1/notifications
{
  "eventType": "custom.notification",
  "recipientIds": ["user-123", "user-456"],
  "title": "Custom Alert",
  "body": "This is a custom notification",
  "criticality": "MEDIUM",
  "channels": ["IN_APP", "EMAIL"],
  "actionUrl": "https://app.coder.io/alerts/123",
  "metadata": {
    "alertId": "123",
    "source": "external-system"
  }
}

// Response
{
  "success": true,
  "notificationId": "notif-uuid",
  "recipientCount": 2,
  "status": "PROCESSING"
}
```

```typescript
// Get user preferences
GET /api/v1/preferences/user/user-123

// Response
{
  "userId": "user-123",
  "preferences": {
    "isEnabled": true,
    "minCriticality": "LOW",
    "channels": {
      "IN_APP": { "enabled": true, "onlyWhenOffline": false },
      "EMAIL": { "enabled": true, "onlyWhenOffline": false, "digestEnabled": true, "digestFrequency": "DAILY" },
      "PUSH": { "enabled": true, "onlyWhenOffline": true },
      "SMS": { "enabled": false },
      "WHATSAPP": { "enabled": false },
      "VOICE": { "enabled": false }
    },
    "quietHours": {
      "enabled": true,
      "timezone": "Europe/Paris",
      "schedules": [
        { "days": [0,1,2,3,4,5,6], "start": "22:00", "end": "08:00" }
      ],
      "allowCritical": true
    },
    "eventOverrides": [
      { "eventType": "task.assigned", "channels": ["IN_APP", "PUSH"] },
      { "eventCategory": "INCIDENTS", "minCriticality": "HIGH" }
    ]
  }
}
```

```typescript
// Update user preferences
PUT /api/v1/preferences/user/user-123
{
  "channels": {
    "SMS": { "enabled": true }
  },
  "quietHours": {
    "enabled": true,
    "schedules": [
      { "days": [1,2,3,4,5], "start": "18:00", "end": "09:00" }
    ]
  }
}
```

---

## 14. UI Views

### 14.1 UI Component Structure

```
src/renderer/components/notifications/
├── NotificationCenter/
│   ├── NotificationCenter.tsx       # Main notification inbox
│   ├── NotificationList.tsx         # Notification list with filters
│   ├── NotificationItem.tsx         # Individual notification item
│   ├── NotificationFilters.tsx      # Filter controls
│   └── NotificationEmpty.tsx        # Empty state
│
├── NotificationBell/
│   ├── NotificationBell.tsx         # Header bell icon with badge
│   └── NotificationPopover.tsx      # Quick notifications popover
│
├── NotificationToast/
│   ├── NotificationToast.tsx        # Toast notification component
│   └── ToastContainer.tsx           # Toast positioning container
│
├── Preferences/
│   ├── NotificationPreferences.tsx  # User preferences page
│   ├── ChannelPreferences.tsx       # Per-channel settings
│   ├── EventPreferences.tsx         # Per-event type settings
│   └── QuietHoursSettings.tsx       # Quiet hours configuration
│
└── Admin/
    ├── NotificationDashboard.tsx    # Admin overview dashboard
    ├── TemplateManager.tsx          # Template CRUD
    ├── TemplateEditor.tsx           # Template editing with preview
    ├── ProviderConfig.tsx           # Provider configuration
    ├── ChannelConfig.tsx            # Channel settings
    ├── DeliveryStats.tsx            # Delivery statistics
    └── AuditLog.tsx                 # Audit log viewer
```

### 14.2 Notification Center

```tsx
interface NotificationCenterProps {
  userId: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filters, setFilters] = useState<NotificationFilters>({
    status: 'all',
    category: null,
    dateRange: 'week'
  });
  const [loading, setLoading] = useState(true);

  return (
    <div className="notification-center">
      <header className="notification-center__header">
        <h1>Notifications</h1>
        <div className="notification-center__actions">
          <Button variant="ghost" onClick={markAllAsRead}>
            Mark all as read
          </Button>
          <Button variant="ghost" onClick={() => navigate('/settings/notifications')}>
            <Settings size={16} />
            Settings
          </Button>
        </div>
      </header>

      <NotificationFilters 
        filters={filters} 
        onChange={setFilters} 
      />

      <div className="notification-center__content">
        {loading ? (
          <NotificationSkeleton count={5} />
        ) : notifications.length === 0 ? (
          <NotificationEmpty filters={filters} />
        ) : (
          <NotificationList 
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onNotificationAction={handleNotificationAction}
          />
        )}
      </div>
    </div>
  );
};
```

### 14.3 User Preferences UI

```tsx
const NotificationPreferences: React.FC = () => {
  const { preferences, updatePreferences, loading } = useNotificationPreferences();

  return (
    <div className="notification-preferences">
      <h1>Notification Preferences</h1>
      
      {/* Global Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Switch
            checked={preferences.isEnabled}
            onCheckedChange={(enabled) => updatePreferences({ isEnabled: enabled })}
            label="Enable notifications"
          />
        </CardContent>
      </Card>

      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelPreferences
            channels={preferences.channels}
            onChange={(channels) => updatePreferences({ channels })}
          />
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
          <CardDescription>Set times when non-critical notifications are held</CardDescription>
        </CardHeader>
        <CardContent>
          <QuietHoursSettings
            quietHours={preferences.quietHours}
            onChange={(quietHours) => updatePreferences({ quietHours })}
          />
        </CardContent>
      </Card>

      {/* Event-specific Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Event Preferences</CardTitle>
          <CardDescription>Customize notifications for specific events</CardDescription>
        </CardHeader>
        <CardContent>
          <EventPreferences
            overrides={preferences.eventOverrides}
            onChange={(overrides) => updatePreferences({ eventOverrides: overrides })}
          />
        </CardContent>
      </Card>
    </div>
  );
};
```

### 14.4 Admin Template Editor

```tsx
const TemplateEditor: React.FC<{ templateId?: string }> = ({ templateId }) => {
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [activeChannel, setActiveChannel] = useState<NotificationChannel>('EMAIL');
  const [activeLocale, setActiveLocale] = useState('en');
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  return (
    <div className="template-editor">
      <div className="template-editor__sidebar">
        {/* Template Info */}
        <Card>
          <CardContent>
            <Input
              label="Template Code"
              value={template?.code}
              onChange={(e) => updateTemplate({ code: e.target.value })}
            />
            <Input
              label="Name"
              value={template?.name}
              onChange={(e) => updateTemplate({ name: e.target.value })}
            />
            <Select
              label="Default Criticality"
              value={template?.defaultCriticality}
              options={criticalityOptions}
              onChange={(value) => updateTemplate({ defaultCriticality: value })}
            />
          </CardContent>
        </Card>

        {/* Channel Tabs */}
        <Tabs value={activeChannel} onValueChange={setActiveChannel}>
          <TabsList>
            {channels.map(channel => (
              <TabsTrigger key={channel} value={channel}>
                {channelIcons[channel]} {channel}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Locale Selector */}
        <Select
          label="Locale"
          value={activeLocale}
          options={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'French' }]}
          onChange={setActiveLocale}
        />
      </div>

      <div className="template-editor__main">
        {/* Content Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Content ({activeChannel} - {activeLocale})</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateContentEditor
              channel={activeChannel}
              locale={activeLocale}
              content={getChannelContent(template, activeChannel, activeLocale)}
              onChange={(content) => updateChannelContent(activeChannel, activeLocale, content)}
            />
          </CardContent>
        </Card>

        {/* Available Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Available Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <VariableList eventType={template?.eventType} />
          </CardContent>
        </Card>
      </div>

      <div className="template-editor__preview">
        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <PreviewDataEditor
              data={previewData}
              onChange={setPreviewData}
            />
            <TemplatePreview
              template={template}
              channel={activeChannel}
              locale={activeLocale}
              data={previewData}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

---

## 15. Webhook Integration

### 15.1 CloudEvents Format

Following CloudEvents specification for webhook payloads:

```typescript
interface CloudEvent {
  specversion: '1.0';
  type: string;                    // e.g., 'io.coder.notification.delivered'
  source: string;                  // e.g., '/notification-manager'
  id: string;                      // Unique event ID
  time: string;                    // ISO 8601 timestamp
  datacontenttype: 'application/json';
  data: Record<string, unknown>;
  
  // Extensions
  organizationid?: string;
  correlationid?: string;
}

// Example outgoing webhook payload
const webhookPayload: CloudEvent = {
  specversion: '1.0',
  type: 'io.coder.notification.delivered',
  source: '/notification-manager',
  id: 'evt-uuid-123',
  time: '2026-01-20T10:30:00Z',
  datacontenttype: 'application/json',
  organizationid: 'org-123',
  data: {
    notificationId: 'notif-uuid',
    eventType: 'task.assigned',
    recipientId: 'user-123',
    channel: 'EMAIL',
    deliveryStatus: 'DELIVERED',
    timestamp: '2026-01-20T10:30:00Z'
  }
};
```

### 15.2 Incoming Webhook Handler

```typescript
class IncomingWebhookHandler {
  /**
   * Process incoming webhook to trigger notification
   */
  async handleWebhook(
    webhookId: string,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    // 1. Validate webhook exists and is active
    const webhook = await this.getWebhook(webhookId);
    if (!webhook || !webhook.isActive) {
      throw new NotFoundError('Webhook not found or inactive');
    }
    
    // 2. Validate signature
    await this.validateSignature(webhook, payload, headers);
    
    // 3. Parse and validate payload
    const event = this.parsePayload(payload, webhook);
    
    // 4. Create notification event
    await this.rabbitMQ.publish('notification.events', {
      type: event.eventType,
      category: event.category || 'SYSTEM_ADMIN',
      recipientIds: event.recipientIds,
      data: event.data,
      organizationId: webhook.organizationId,
      source: 'webhook',
      webhookId: webhook.id
    });
    
    // 5. Audit log
    await this.auditLogger.log({
      eventType: 'WEBHOOK_RECEIVED',
      webhookId: webhook.id,
      details: { eventType: event.eventType, recipientCount: event.recipientIds.length }
    });
    
    return { success: true, eventId: event.id };
  }
  
  private async validateSignature(
    webhook: Webhook,
    payload: unknown,
    headers: Record<string, string>
  ): Promise<void> {
    if (webhook.authType === 'HMAC_SHA256') {
      const secret = await this.secretService.getProviderSecret(webhook.authSecretId);
      const signature = headers['x-webhook-signature'] || headers['x-hub-signature-256'];
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(`sha256=${expectedSignature}`)
      )) {
        throw new UnauthorizedError('Invalid webhook signature');
      }
    }
  }
}
```

### 15.3 Outgoing Webhook Service

```typescript
class OutgoingWebhookService {
  /**
   * Send webhook to external system
   */
  async sendWebhook(
    webhook: Webhook,
    event: NotificationEvent
  ): Promise<WebhookDeliveryResult> {
    // Build CloudEvents payload
    const payload = this.buildCloudEvent(event, webhook);
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/cloudevents+json',
      'User-Agent': 'Coder-Notification-Manager/1.0'
    };
    
    // Add authentication
    if (webhook.authType !== 'NONE') {
      await this.addAuthHeaders(headers, webhook);
    }
    
    // Add signature
    const signature = this.generateSignature(payload, webhook);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
    
    // Send with retry
    try {
      const response = await this.httpClient.post(webhook.url, payload, {
        headers,
        timeout: 30000
      });
      
      await this.recordSuccess(webhook);
      
      return {
        success: true,
        statusCode: response.status,
        responseTime: response.duration
      };
    } catch (error) {
      await this.recordFailure(webhook, error);
      
      if (webhook.retryEnabled) {
        await this.scheduleRetry(webhook, event, error);
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

## 16. Implementation Guidelines

### 16.1 Implementation Phases

| Phase | Scope | Duration |
|-------|-------|----------|
| **Phase 1** | Core Infrastructure | 2-3 weeks |
| **Phase 2** | In-App & Email Channels | 2 weeks |
| **Phase 3** | Push & SMS Channels | 2 weeks |
| **Phase 4** | Preferences & Templates | 2 weeks |
| **Phase 5** | Escalation & Fallback | 1-2 weeks |
| **Phase 6** | WhatsApp & Voice | 1-2 weeks |
| **Phase 7** | Webhooks | 1 week |
| **Phase 8** | Admin UI | 2 weeks |
| **Phase 9** | Testing & Polish | 2 weeks |

### 16.2 Phase 1: Core Infrastructure

```
Tasks:
- [ ] Set up notification-manager container (Docker, docker-compose)
- [ ] Configure Cosmos DB connection
- [ ] Set up RabbitMQ connection (consumer)
- [ ] Implement basic Prisma schema
- [ ] Create event consumer framework
- [ ] Set up Fastify admin API
- [ ] Implement health check endpoints
- [ ] Create Secret Management integration client
- [ ] Set up logging and monitoring
```

### 16.3 Phase 2: In-App & Email

```
Tasks:
- [ ] Implement In-App notification payload builder
- [ ] Set up RabbitMQ publisher for main app WebSocket
- [ ] Implement Email provider abstraction
- [ ] Add SendGrid provider implementation
- [ ] Add SMTP provider implementation
- [ ] Create basic template engine
- [ ] Implement delivery tracking
- [ ] Add retry mechanism
- [ ] Create Notification Center UI component
- [ ] Create notification bell/badge component
```

### 16.4 Technology Stack

```yaml
# notification-manager/docker-compose.yml
version: '3.8'
services:
  notification-manager:
    build: .
    ports:
      - "3001:3001"
    environment:
      - COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_MANAGEMENT_URL=http://secret-management:3002
      - REDIS_URL=redis://redis:6379
    depends_on:
      - notification-db
      - rabbitmq
      - redis

  notification-db:
    # Cosmos DB is a managed service, no local container needed
    # Connection string is provided via environment variable

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  notification-data:
```

### 16.5 RabbitMQ Queue Configuration

```typescript
// Queue definitions
const queues = {
  // Main event queue
  'notification.events': {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'notification.dlx',
      'x-dead-letter-routing-key': 'notification.dlq'
    }
  },
  
  // Retry queue with delay
  'notification.retry': {
    durable: true,
    arguments: {
      'x-message-ttl': 60000, // 1 minute default
      'x-dead-letter-exchange': 'notification.events'
    }
  },
  
  // Dead letter queue
  'notification.dlq': {
    durable: true
  },
  
  // In-app delivery queue (to main app)
  'notification.inapp.deliver': {
    durable: true
  },
  
  // Scheduled/digest processing
  'notification.scheduled': {
    durable: true
  }
};

// Exchange definitions
const exchanges = {
  'notification.events': { type: 'topic', durable: true },
  'notification.dlx': { type: 'direct', durable: true }
};
```

### 16.6 Performance Considerations

| Aspect | Recommendation |
|--------|----------------|
| **Message Processing** | Use prefetch limit (e.g., 10) to control concurrency |
| **Database** | Index on frequently queried fields; use connection pooling |
| **Caching** | Cache templates, preferences in Redis (TTL: 5 min) |
| **Provider Calls** | Use circuit breaker pattern; timeout: 30s |
| **Batch Processing** | Process digests in batches of 100 |
| **Scaling** | Horizontal scaling via multiple consumer instances |

### 16.7 Monitoring & Alerting

```typescript
// Key metrics to track
const metrics = {
  // Counters
  'notifications.created': Counter,
  'notifications.delivered': Counter,
  'notifications.failed': Counter,
  'deliveries.by_channel': Counter,
  'deliveries.by_provider': Counter,
  
  // Histograms
  'delivery.latency': Histogram,
  'provider.response_time': Histogram,
  
  // Gauges
  'queue.depth': Gauge,
  'active.escalations': Gauge,
  'held.notifications': Gauge
};

// Alerts
const alerts = [
  { name: 'HighFailureRate', condition: 'failure_rate > 5%', severity: 'warning' },
  { name: 'QueueBacklog', condition: 'queue_depth > 10000', severity: 'warning' },
  { name: 'ProviderDown', condition: 'health_status = unhealthy', severity: 'critical' },
  { name: 'EscalationTriggered', condition: 'escalation_level >= 2', severity: 'warning' }
];
```

---

## Summary

The Notification Manager module provides:

1. **Multi-Channel Delivery**: In-App, Email, Push, SMS, WhatsApp, Voice
2. **Provider Abstraction**: Easy switching between providers (SendGrid, Twilio, FCM, etc.)
3. **Event-Driven Architecture**: RabbitMQ-based decoupled communication
4. **Intelligent Routing**: Presence-aware, preference-based delivery
5. **Reliability**: Retry, deduplication, rate limiting, circuit breaker
6. **Escalation & Fallback**: Automatic escalation chains for critical notifications
7. **Template System**: Multi-language, dynamic templates with rich content
8. **Hierarchical Preferences**: Global → Organization → Team → Project → User
9. **Quiet Hours/DND**: Configurable hold periods with critical override
10. **Webhook Integration**: CloudEvents-based incoming/outgoing webhooks
11. **Secret Management Integration**: Secure credential storage via Secret Management module
12. **Comprehensive UI**: Notification Center, Preferences, Admin Dashboard

---

**Related Documents:**
- [Part 1: Overview, Architecture, Data Models, Channels, Events, Providers](./notification-manager-specification-part1.md)
- [Part 2: Delivery Engine, Templates, Preferences, Escalation, Quiet Hours](./notification-manager-specification-part2.md)

