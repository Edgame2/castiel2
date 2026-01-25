# Collaboration Service Module - Architecture

## Overview

The Collaboration Service module provides real-time collaboration features for Castiel, including conversation management and chat functionality.

## Database Architecture

### Cosmos DB NoSQL Structure

The module uses the following Cosmos DB containers in the shared database:

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `collaboration_conversations` | `/tenantId` | Conversation data |
| `collaboration_messages` | `/tenantId` | Message data |
| `collaboration_insights` | `/tenantId` | Collaboration insights |

### Partition Key Strategy

All containers are partitioned by `/tenantId` to ensure tenant isolation.

## Service Architecture

### Core Services

1. **ConversationService** - Conversation management
2. **MessageService** - Message handling
3. **InsightService** - Collaboration insights

## Data Flow

```
User Request
    ↓
Collaboration Service
    ↓
Shard Manager (store data)
    ↓
User Management (user context)
    ↓
Notification Manager (notifications)
    ↓
AI Insights (collaboration insights)
    ↓
Cosmos DB (store conversations)
    ↓
Event Publisher (RabbitMQ)
```

## External Dependencies

- **Shard Manager**: For data sharding
- **User Management**: For user context
- **Notification Manager**: For notifications
- **AI Insights**: For collaboration insights
- **Logging Service**: For audit logging

## Configuration

All configuration is managed via `config/default.yaml` with environment variable overrides. Service URLs are config-driven, not hardcoded.
