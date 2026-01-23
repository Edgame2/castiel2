# c_conversation - AI Conversation ShardType

## Overview

The `c_conversation` ShardType stores AI conversations between users and AI assistants. It supports multi-user participation, multiple AI models per message, context retrieval tracking, user feedback, and conversation branching.

> **AI Role**: Conversations are the primary interface for AI interactions. They capture context, responses, feedback, and can be linked to business entities for rich insights.

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Name** | `c_conversation` |
| **Display Name** | AI Conversation |
| **Category** | DATA |
| **Global** | No |
| **System** | Yes |
| **Icon** | `MessageSquare` |
| **Color** | `#6366f1` (Indigo) |
| **Embedding** | Optional (summary) |

---

## Schema Definition

### structuredData Fields

#### Conversation Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Conversation title (auto-generated or user-set) |
| `summary` | string | No | AI-generated summary of conversation |
| `status` | enum | **Yes** | `active`, `archived`, `deleted` |
| `visibility` | enum | **Yes** | `private`, `shared`, `public` |
| `assistantId` | reference | No | Link to `c_assistant` used |
| `templateId` | reference | No | Link to `c_contextTemplate` used |
| `defaultModelId` | reference | No | Link to default `c_aimodel` |
| `tags` | string[] | No | Organizational tags |

#### Participants

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `participants` | Participant[] | **Yes** | Users involved in conversation |

```typescript
interface Participant {
  userId: string;
  role: 'owner' | 'participant' | 'viewer';
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}
```

#### Messages

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | Message[] | **Yes** | Array of conversation messages |

```typescript
interface Message {
  id: string;                        // Unique message ID
  parentId?: string;                 // For branching (null = root)
  branchIndex?: number;              // Which branch (0 = original)
  
  // Role & Author
  role: 'user' | 'assistant' | 'system' | 'tool';
  userId?: string;                   // Who sent (for user messages)
  modelId?: string;                  // c_aimodel reference (for assistant)
  
  // Content
  content: string;                   // Message text (markdown supported)
  contentType: 'text' | 'markdown' | 'code' | 'error';
  
  // Attachments
  attachments?: Attachment[];
  
  // Tool/Function Calls
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  
  // Context Sources (RAG)
  contextSources?: ContextSource[];
  
  // Metrics
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;                     // Estimated cost in USD
  latencyMs?: number;                // Response time
  
  // Feedback
  feedback?: MessageFeedback;
  
  // Status
  status: 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';
  errorMessage?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  
  // Regeneration
  isRegenerated: boolean;
  regeneratedFrom?: string;          // Original message ID
  regenerationCount: number;
}
```

#### Attachments

```typescript
interface Attachment {
  id: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'document';
  name: string;
  url: string;
  mimeType: string;
  size: number;                      // Bytes
  shardId?: string;                  // Link to c_document if stored
}
```

#### Tool Calls

```typescript
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;               // JSON string
  };
  status: 'pending' | 'running' | 'success' | 'error';
}

interface ToolResult {
  toolCallId: string;
  result: string;                    // JSON string or text
  error?: string;
  durationMs?: number;
}
```

#### Context Sources (RAG)

```typescript
interface ContextSource {
  id: string;
  query: string;                     // User query that triggered retrieval
  
  // Retrieved chunks
  chunks: RetrievedChunk[];
  
  // Metadata
  retrievedAt: Date;
  totalChunks: number;
  totalTokens: number;
}

interface RetrievedChunk {
  shardId: string;                   // Source shard
  shardTypeId: string;
  shardName: string;                 // For display
  
  chunkIndex: number;
  content: string;                   // Chunk content (snapshot)
  
  // Similarity
  score: number;                     // 0-1 similarity score
  
  // Metadata
  fieldPath?: string;                // Which field was matched
  highlight?: string;                // Highlighted match
}
```

#### Message Feedback

```typescript
interface MessageFeedback {
  id: string;
  userId: string;
  
  // Rating
  rating?: number;                   // 1-5 stars
  thumbs?: 'up' | 'down';
  
  // Categories
  categories?: FeedbackCategory[];
  
  // Comments
  comment?: string;
  
  // Actions
  regenerateRequested: boolean;
  reportedAsHarmful: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

type FeedbackCategory = 
  | 'accurate'
  | 'helpful'
  | 'creative'
  | 'clear'
  | 'detailed'
  | 'concise'
  | 'inaccurate'
  | 'unhelpful'
  | 'confusing'
  | 'incomplete'
  | 'off_topic'
  | 'harmful';
```

#### Branching

```typescript
interface ConversationBranch {
  id: string;
  name?: string;
  parentMessageId: string;           // Where branch started
  branchIndex: number;               // 0 = original, 1+ = branches
  createdAt: Date;
  createdBy: string;
  messageCount: number;
}
```

#### Statistics

| Field | Type | Description |
|-------|------|-------------|
| `stats` | ConversationStats | Aggregated statistics |

```typescript
interface ConversationStats {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  toolCallCount: number;
  
  totalTokens: number;
  totalCost: number;
  averageLatencyMs: number;
  
  participantCount: number;
  branchCount: number;
  
  feedbackCount: number;
  averageRating?: number;
  
  lastActivityAt: Date;
}
```

---

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "maxLength": 200
    },
    "summary": {
      "type": "string",
      "maxLength": 2000
    },
    "status": {
      "type": "string",
      "enum": ["active", "archived", "deleted"],
      "default": "active"
    },
    "visibility": {
      "type": "string",
      "enum": ["private", "shared", "public"],
      "default": "private"
    },
    "assistantId": {
      "type": "string",
      "description": "Reference to c_assistant"
    },
    "templateId": {
      "type": "string",
      "description": "Reference to c_contextTemplate"
    },
    "defaultModelId": {
      "type": "string",
      "description": "Reference to c_aimodel"
    },
    "participants": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "userId": { "type": "string" },
          "role": { "type": "string", "enum": ["owner", "participant", "viewer"] },
          "joinedAt": { "type": "string", "format": "date-time" },
          "leftAt": { "type": "string", "format": "date-time" },
          "isActive": { "type": "boolean" }
        },
        "required": ["userId", "role", "joinedAt", "isActive"]
      },
      "minItems": 1
    },
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "parentId": { "type": "string" },
          "branchIndex": { "type": "integer", "default": 0 },
          "role": { "type": "string", "enum": ["user", "assistant", "system", "tool"] },
          "userId": { "type": "string" },
          "modelId": { "type": "string" },
          "content": { "type": "string" },
          "contentType": { "type": "string", "enum": ["text", "markdown", "code", "error"] },
          "attachments": { "type": "array" },
          "toolCalls": { "type": "array" },
          "toolResults": { "type": "array" },
          "contextSources": { "type": "array" },
          "tokens": {
            "type": "object",
            "properties": {
              "prompt": { "type": "integer" },
              "completion": { "type": "integer" },
              "total": { "type": "integer" }
            }
          },
          "cost": { "type": "number" },
          "latencyMs": { "type": "integer" },
          "feedback": { "type": "object" },
          "status": { "type": "string", "enum": ["pending", "streaming", "complete", "error", "cancelled"] },
          "errorMessage": { "type": "string" },
          "createdAt": { "type": "string", "format": "date-time" },
          "updatedAt": { "type": "string", "format": "date-time" },
          "isRegenerated": { "type": "boolean", "default": false },
          "regeneratedFrom": { "type": "string" },
          "regenerationCount": { "type": "integer", "default": 0 }
        },
        "required": ["id", "role", "content", "contentType", "status", "createdAt"]
      }
    },
    "branches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "parentMessageId": { "type": "string" },
          "branchIndex": { "type": "integer" },
          "createdAt": { "type": "string", "format": "date-time" },
          "createdBy": { "type": "string" },
          "messageCount": { "type": "integer" }
        }
      }
    },
    "stats": {
      "type": "object",
      "properties": {
        "messageCount": { "type": "integer" },
        "userMessageCount": { "type": "integer" },
        "assistantMessageCount": { "type": "integer" },
        "toolCallCount": { "type": "integer" },
        "totalTokens": { "type": "integer" },
        "totalCost": { "type": "number" },
        "averageLatencyMs": { "type": "number" },
        "participantCount": { "type": "integer" },
        "branchCount": { "type": "integer" },
        "feedbackCount": { "type": "integer" },
        "averageRating": { "type": "number" },
        "lastActivityAt": { "type": "string", "format": "date-time" }
      }
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": ["status", "visibility", "participants", "messages"]
}
```

---

## Access Control

| Action | User | Participant | Owner | Tenant Admin | Super Admin |
|--------|------|-------------|-------|--------------|-------------|
| View own conversations | ✓ | - | - | - | - |
| View shared conversations | ✓ | ✓ | ✓ | ✓ | ✓ |
| View public conversations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send messages | - | ✓ | ✓ | - | - |
| Add participants | - | - | ✓ | - | ✓ |
| Remove participants | - | - | ✓ | - | ✓ |
| Change visibility | - | - | ✓ | ✓ | ✓ |
| Delete conversation | - | - | ✓ | ✓ | ✓ |
| View all tenant conversations | - | - | - | ✓ | ✓ |

---

## Relationships

### Internal Relationships

| Relationship Type | Target | Description |
|-------------------|--------|-------------|
| `uses_assistant` | `c_assistant` | AI assistant configuration |
| `uses_template` | `c_contextTemplate` | Context template used |
| `uses_model` | `c_aimodel` | Default AI model |
| `about_project` | `c_project` | Related project |
| `about_company` | `c_company` | Related company |
| `about_opportunity` | `c_opportunity` | Related opportunity |
| `about_contact` | `c_contact` | Related contact |
| `references_document` | `c_document` | Documents referenced |
| `references_shard` | Any | Other shards referenced |

### Incoming Relationships

| From | Relationship Type | Description |
|------|-------------------|-------------|
| `c_project` | `has_conversation` | Conversations about this project |
| `c_assistant` | `used_in` | Conversations using this assistant |

---

## Examples

### Example 1: Simple Q&A Conversation

```json
{
  "shardTypeId": "c_conversation",
  "structuredData": {
    "title": "Sales Strategy Discussion",
    "status": "active",
    "visibility": "private",
    "assistantId": "assistant-sales-coach",
    "defaultModelId": "c_aimodel_gpt_4o",
    "participants": [
      {
        "userId": "user-123",
        "role": "owner",
        "joinedAt": "2025-11-30T10:00:00Z",
        "isActive": true
      }
    ],
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "userId": "user-123",
        "content": "What's the best approach for the Acme deal?",
        "contentType": "text",
        "status": "complete",
        "createdAt": "2025-11-30T10:00:00Z"
      },
      {
        "id": "msg-2",
        "parentId": "msg-1",
        "role": "assistant",
        "modelId": "c_aimodel_gpt_4o",
        "content": "Based on the Acme Corp deal context, I recommend focusing on three key areas:\n\n1. **Value Proposition**: Emphasize ROI...",
        "contentType": "markdown",
        "tokens": { "prompt": 1250, "completion": 450, "total": 1700 },
        "cost": 0.0125,
        "latencyMs": 2340,
        "status": "complete",
        "createdAt": "2025-11-30T10:00:03Z",
        "isRegenerated": false,
        "regenerationCount": 0
      }
    ],
    "stats": {
      "messageCount": 2,
      "userMessageCount": 1,
      "assistantMessageCount": 1,
      "totalTokens": 1700,
      "totalCost": 0.0125,
      "averageLatencyMs": 2340,
      "participantCount": 1,
      "branchCount": 0,
      "lastActivityAt": "2025-11-30T10:00:03Z"
    }
  }
}
```

### Example 2: Conversation with RAG Context

```json
{
  "id": "msg-5",
  "role": "assistant",
  "modelId": "c_aimodel_gpt_4o",
  "content": "According to the project requirements document, the key deliverables are...",
  "contentType": "markdown",
  "contextSources": [
    {
      "id": "ctx-1",
      "query": "What are the project deliverables?",
      "chunks": [
        {
          "shardId": "doc-requirements-v2",
          "shardTypeId": "c_document",
          "shardName": "Project Requirements v2.0",
          "chunkIndex": 3,
          "content": "## Deliverables\n\n1. Phase 1: Discovery Report\n2. Phase 2: Technical Specification...",
          "score": 0.92,
          "fieldPath": "content",
          "highlight": "**Deliverables**: Phase 1: Discovery Report..."
        },
        {
          "shardId": "doc-proposal",
          "shardTypeId": "c_document",
          "shardName": "Sales Proposal",
          "chunkIndex": 7,
          "content": "The proposed solution includes the following deliverables...",
          "score": 0.85,
          "fieldPath": "content"
        }
      ],
      "retrievedAt": "2025-11-30T10:05:00Z",
      "totalChunks": 2,
      "totalTokens": 450
    }
  ],
  "tokens": { "prompt": 2100, "completion": 380, "total": 2480 },
  "status": "complete",
  "createdAt": "2025-11-30T10:05:02Z"
}
```

### Example 3: Message with Feedback

```json
{
  "id": "msg-8",
  "role": "assistant",
  "content": "Here's a draft email for the follow-up...",
  "feedback": {
    "id": "fb-1",
    "userId": "user-123",
    "rating": 4,
    "thumbs": "up",
    "categories": ["helpful", "clear"],
    "comment": "Good draft, but needs more specific numbers",
    "regenerateRequested": false,
    "reportedAsHarmful": false,
    "createdAt": "2025-11-30T10:10:00Z"
  }
}
```

### Example 4: Conversation Branching

```json
{
  "branches": [
    {
      "id": "branch-1",
      "name": "Alternative approach",
      "parentMessageId": "msg-3",
      "branchIndex": 1,
      "createdAt": "2025-11-30T10:15:00Z",
      "createdBy": "user-123",
      "messageCount": 4
    }
  ],
  "messages": [
    {
      "id": "msg-3",
      "role": "assistant",
      "content": "Original response...",
      "branchIndex": 0
    },
    {
      "id": "msg-3-alt",
      "parentId": "msg-3",
      "role": "assistant",
      "content": "Alternative response after regeneration...",
      "branchIndex": 1,
      "isRegenerated": true,
      "regeneratedFrom": "msg-3",
      "regenerationCount": 1
    }
  ]
}
```

### Example 5: Multi-User Conversation

```json
{
  "title": "Team Strategy Session",
  "visibility": "shared",
  "participants": [
    {
      "userId": "user-alice",
      "role": "owner",
      "joinedAt": "2025-11-30T14:00:00Z",
      "isActive": true
    },
    {
      "userId": "user-bob",
      "role": "participant",
      "joinedAt": "2025-11-30T14:05:00Z",
      "isActive": true
    },
    {
      "userId": "user-charlie",
      "role": "viewer",
      "joinedAt": "2025-11-30T14:10:00Z",
      "leftAt": "2025-11-30T15:00:00Z",
      "isActive": false
    }
  ],
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "userId": "user-alice",
      "content": "Let's discuss the Q1 targets"
    },
    {
      "id": "msg-2",
      "role": "user",
      "userId": "user-bob",
      "content": "I think we should focus on enterprise deals"
    },
    {
      "id": "msg-3",
      "role": "assistant",
      "content": "Based on both your inputs, here's a synthesis..."
    }
  ]
}
```

### Example 6: Tool Calls

```json
{
  "id": "msg-10",
  "role": "assistant",
  "content": "",
  "toolCalls": [
    {
      "id": "call-1",
      "type": "function",
      "function": {
        "name": "searchShards",
        "arguments": "{\"query\": \"Acme Corp\", \"shardType\": \"c_company\"}"
      },
      "status": "success"
    }
  ],
  "toolResults": [
    {
      "toolCallId": "call-1",
      "result": "{\"shards\": [{\"id\": \"company-acme\", \"name\": \"Acme Corporation\"}]}",
      "durationMs": 150
    }
  ]
}
```

---

## API Reference

### Create Conversation

```http
POST /api/conversations
Body: {
  "title": "New Conversation",
  "visibility": "private",
  "assistantId": "assistant-123",
  "linkedShards": ["project-abc"]
}
```

### Send Message

```http
POST /api/conversations/:id/messages
Body: {
  "content": "What's the status of the project?",
  "attachments": [],
  "parentId": null  // For branching
}
```

### Regenerate Response

```http
POST /api/conversations/:id/messages/:messageId/regenerate
Body: {
  "modelId": "c_aimodel_claude_3_5_sonnet",  // Optional: use different model
  "createBranch": true
}
```

### Add Feedback

```http
POST /api/conversations/:id/messages/:messageId/feedback
Body: {
  "rating": 5,
  "thumbs": "up",
  "categories": ["helpful", "accurate"],
  "comment": "Great insight!"
}
```

### Add Participant

```http
POST /api/conversations/:id/participants
Body: {
  "userId": "user-456",
  "role": "participant"
}
```

### Update Visibility

```http
PATCH /api/conversations/:id
Body: {
  "visibility": "shared"
}
```

### List Conversations

```http
GET /api/conversations
Query: ?status=active&visibility=private,shared&limit=20
```

### Get Conversation with Messages

```http
GET /api/conversations/:id
Query: ?includeBranches=true&messageLimit=50
```

### Archive Conversation

```http
POST /api/conversations/:id/archive
```

---

## Related Documentation

- [c_assistant](./c_assistant.md) - AI Assistant configuration
- [c_aimodel](./c_aimodel.md) - AI Model definitions
- [c_contextTemplate](./c_contextTemplate.md) - Context assembly templates
- [c_document](./c_document.md) - Document storage
- [AI Tenant Isolation](../ai-tenant-isolation.md) - Multi-tenant AI best practices

---

**Last Updated**: November 2025  
**Version**: 1.0.0  
**Maintainer**: Castiel Development Team











