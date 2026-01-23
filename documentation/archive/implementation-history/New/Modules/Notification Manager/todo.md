# Notification Manager Module

## Specification Documents

- [Part 1: Core Specification](./notification-manager-specification-part1.md) - Overview, Architecture, Data Models, Notification Channels, Event Types, Provider Abstraction, Secret Management Integration
- [Part 2: Delivery & Preferences](./notification-manager-specification-part2.md) - Delivery Engine, Template System, Preference Resolution, Escalation & Fallback, Quiet Hours & DND
- [Part 3: API & Implementation](./notification-manager-specification-part3.md) - API Endpoints, UI Views, Webhook Integration, Implementation Guidelines

---

## Dependencies

| Module | Purpose |
|--------|---------|
| **[Secret Management Module](../Secret%20Management/todo.md)** | Secure storage for provider credentials (API keys, OAuth tokens) |
| **Main Application** | WebSocket relay for in-app notifications, presence tracking |
| **RabbitMQ** | Event-driven communication between services |
| **Redis** | Presence tracking, rate limiting, caching |

---

## Core Requirements

- ✅ Multi-channel notification delivery (In-App, Push, Email, SMS, WhatsApp, Voice)
- ✅ Separate container architecture with own PostgreSQL database
- ✅ Event-driven communication via RabbitMQ
- ✅ Provider abstraction layer (easy switching between providers)
- ✅ Secret Management integration for provider credentials
- ✅ Hierarchical preferences (Global → Organization → Team → Project → User)
- ✅ Presence-aware delivery (configurable)
- ✅ Escalation chains for critical notifications
- ✅ Channel fallback on failure
- ✅ Quiet hours / Do Not Disturb with configurable rules
- ✅ Template system with i18n (English, French)
- ✅ Retry with exponential backoff (criticality-based)
- ✅ Deduplication and rate limiting
- ✅ Batch/Digest support for low-priority notifications
- ✅ Delivery tracking and metrics
- ✅ Webhook integration (incoming & outgoing, CloudEvents format)
- ✅ BYOC (Bring Your Own Credentials) for organizations
- ✅ Full admin UI for template/provider management

---

## Notification Channels

| Channel | Providers | Status |
|---------|-----------|--------|
| **In-App** | WebSocket via Main App | Planned |
| **Email** | SendGrid, AWS SES, Mailgun, SMTP | Planned |
| **Push** | Firebase FCM, OneSignal, Web Push | Planned |
| **SMS** | Twilio, AWS SNS, Vonage | Planned |
| **WhatsApp** | Twilio, Meta WhatsApp Business API | Planned |
| **Voice** | Twilio, Vonage | Planned |

---

## Phone Call Scenarios

| Scenario | Recipient |
|----------|-----------|
| Incident escalation | On-call, Assignee |
| Security breach / Suspicious login | User, Admins |
| System-wide outage | Super Admins |
| On-call rotation escalation | On-call team |

---

## Implementation Status

- [ ] **Phase 1: Core Infrastructure** (2-3 weeks)
  - [ ] Container setup (Docker, docker-compose)
  - [ ] PostgreSQL database setup
  - [ ] RabbitMQ consumer
  - [ ] Prisma schema
  - [ ] Fastify admin API
  - [ ] Secret Management client
  - [ ] Health checks

- [ ] **Phase 2: In-App & Email** (2 weeks)
  - [ ] In-App notification payload
  - [ ] RabbitMQ publisher to main app
  - [ ] Email provider abstraction
  - [ ] SendGrid implementation
  - [ ] SMTP implementation
  - [ ] Basic template engine
  - [ ] Delivery tracking
  - [ ] Retry mechanism
  - [ ] Notification Center UI
  - [ ] Notification bell component

- [ ] **Phase 3: Push & SMS** (2 weeks)
  - [ ] Push provider abstraction
  - [ ] FCM implementation
  - [ ] SMS provider abstraction
  - [ ] Twilio SMS implementation
  - [ ] Device token management

- [ ] **Phase 4: Preferences & Templates** (2 weeks)
  - [ ] Preference resolver (hierarchy)
  - [ ] Preference API
  - [ ] Template engine with Handlebars
  - [ ] i18n support (en, fr)
  - [ ] Default templates
  - [ ] Template CRUD API
  - [ ] Preferences UI

- [ ] **Phase 5: Escalation & Fallback** (1-2 weeks)
  - [ ] Escalation manager
  - [ ] Escalation chain configuration
  - [ ] Fallback handler
  - [ ] Acknowledgment tracking

- [ ] **Phase 6: WhatsApp & Voice** (1-2 weeks)
  - [ ] WhatsApp provider abstraction
  - [ ] Twilio WhatsApp implementation
  - [ ] Voice provider abstraction
  - [ ] Twilio Voice implementation
  - [ ] TwiML generation

- [ ] **Phase 7: Webhooks** (1 week)
  - [ ] Incoming webhook handler
  - [ ] Outgoing webhook service
  - [ ] CloudEvents format
  - [ ] Signature validation
  - [ ] Webhook CRUD API

- [ ] **Phase 8: Admin UI** (2 weeks)
  - [ ] Admin dashboard
  - [ ] Template editor with preview
  - [ ] Provider configuration UI
  - [ ] Channel configuration UI
  - [ ] Delivery stats/analytics
  - [ ] Audit log viewer

- [ ] **Phase 9: Testing & Polish** (2 weeks)
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] Load testing
  - [ ] Documentation
  - [ ] Performance optimization

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Container isolation | Separate container with own DB | True microservice isolation |
| Communication | RabbitMQ (event-driven) | Loose coupling, reliable delivery |
| WebSocket ownership | Main App owns WebSocket | Single WS connection per user |
| Database | Own PostgreSQL instance | Container independence |
| Webhook format | CloudEvents | Industry standard |
| Presence tracking | Redis + Main App relay | Real-time, scalable |

---

## Technology Stack

- **Runtime**: Node.js / TypeScript
- **API Framework**: Fastify
- **Database**: PostgreSQL + Prisma ORM
- **Message Broker**: RabbitMQ
- **Cache**: Redis
- **Container**: Docker

---

## Estimated Total Duration

**14-18 weeks** for full implementation

