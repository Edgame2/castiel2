# Notification Manager Module - Architecture

## Overview

The Notification Manager module provides multi-channel notification service for Castiel, consuming events from RabbitMQ and creating notifications for users and tenants.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `notification_notifications` | `/tenantId` | Notification data |
| `notification_templates` | `/tenantId` | Notification templates |
| `notification_preferences` | `/tenantId` | User notification preferences |
| `notification_delivery_logs` | `/tenantId` | Delivery logs |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **NotificationService** - Notification creation and management
2. **EmailService** - Email notification delivery
3. **TemplateService** - Template management
4. **PreferenceService** - User preference management

## Data Flow

```
RabbitMQ Event
    ↓
Notification Manager (event consumer)
    ↓
Template Service (load template)
    ↓
Email Service (send notification)
    ↓
Cosmos DB (store notification)
    ↓
Event Publisher (RabbitMQ)
```

## Event Consumption

The module consumes all events from RabbitMQ and creates notifications based on event types.

## External Dependencies

- **RabbitMQ**: For event consumption
- **Email Providers**: SendGrid, SMTP, SES
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
