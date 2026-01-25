# AI Conversation Module - Logs Events

Per ModuleImplementationGuide Section 9.5: Event Documentation Requirements

## Overview

This document describes all events **published** by the AI Conversation module that get logged by the Logging module. These events represent important conversation and context management activities that should be tracked for audit and compliance purposes.

---

## Published Events

The AI Conversation module publishes the following events to the `coder_events` exchange:

| Event | Description | Logged By |
|-------|-------------|-----------|
| `conversation.created` | Conversation created | Logging module |
| `conversation.message.added` | Message added to conversation | Logging module |
| `conversation.context.assembled` | Context assembled for conversation | Logging module |

---

### conversation.created

**Description**: Emitted when a new conversation is created.

**Triggered When**:
- User creates a new conversation
- Conversation metadata is stored in database

**Event Type**: `conversation.created`

**Publisher**: `src/events/publishers/ConversationEventPublisher.ts` → `publishConversationEvent()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event identifier"
    },
    "type": {
      "type": "string",
      "const": "conversation.created"
    },
    "version": {
      "type": "string",
      "const": "1.0.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant ID"
    },
    "source": {
      "type": "string",
      "const": "ai-conversation"
    },
    "data": {
      "type": "object",
      "required": ["conversationId", "userId"],
      "properties": {
        "conversationId": {
          "type": "string",
          "format": "uuid",
          "description": "Conversation ID"
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID who created the conversation"
        },
        "title": {
          "type": "string",
          "description": "Conversation title"
        }
      }
    }
  }
}
```

**Example Event**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "conversation.created",
  "version": "1.0.0",
  "timestamp": "2026-01-23T10:00:00Z",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "source": "ai-conversation",
  "data": {
    "conversationId": "789e4567-e89b-12d3-a456-426614174001",
    "userId": "456e7890-e89b-12d3-a456-426614174002",
    "title": "Project Planning Discussion"
  }
}
```

---

### conversation.message.added

**Description**: Emitted when a message is added to a conversation.

**Triggered When**:
- User sends a message
- Assistant responds with a message
- Message is stored in database

**Event Type**: `conversation.message.added`

**Publisher**: `src/events/publishers/ConversationEventPublisher.ts` → `publishConversationEvent()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "type": {
      "type": "string",
      "const": "conversation.message.added"
    },
    "version": {
      "type": "string",
      "const": "1.0.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid"
    },
    "source": {
      "type": "string",
      "const": "ai-conversation"
    },
    "data": {
      "type": "object",
      "required": ["conversationId", "messageId", "role"],
      "properties": {
        "conversationId": {
          "type": "string",
          "format": "uuid"
        },
        "messageId": {
          "type": "string",
          "format": "uuid"
        },
        "role": {
          "type": "string",
          "enum": ["user", "assistant", "system"]
        },
        "userId": {
          "type": "string",
          "format": "uuid",
          "description": "User ID (if role is user)"
        }
      }
    }
  }
}
```

---

### conversation.context.assembled

**Description**: Emitted when context is assembled for a conversation.

**Triggered When**:
- Context assembly completes
- Relevant shards are retrieved and assembled
- Context is stored for conversation

**Event Type**: `conversation.context.assembled`

**Publisher**: `src/events/publishers/ConversationEventPublisher.ts` → `publishConversationEvent()`

**Event Schema**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "version", "timestamp", "tenantId", "source", "data"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "type": {
      "type": "string",
      "const": "conversation.context.assembled"
    },
    "version": {
      "type": "string",
      "const": "1.0.0"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "tenantId": {
      "type": "string",
      "format": "uuid"
    },
    "source": {
      "type": "string",
      "const": "ai-conversation"
    },
    "data": {
      "type": "object",
      "required": ["conversationId", "shardCount"],
      "properties": {
        "conversationId": {
          "type": "string",
          "format": "uuid"
        },
        "shardCount": {
          "type": "integer",
          "description": "Number of shards included in context"
        },
        "contextSize": {
          "type": "integer",
          "description": "Context size in tokens"
        }
      }
    }
  }
}
```

---

## Consumed Events

The AI Conversation module consumes the following events:

| Event | Description | Handler |
|-------|-------------|---------|
| `shard.updated` | Shard updated | Updates conversation context when linked shards change |
