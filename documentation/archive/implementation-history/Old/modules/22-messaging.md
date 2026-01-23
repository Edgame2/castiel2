# Messaging Module

**Category:** Productivity & Workflow  
**Location:** `src/core/messaging/`, `src/renderer/contexts/MessagingContext.tsx`  
**Last Updated:** 2025-01-27

---

## Overview

The Messaging Module provides team messaging and communication with context-anchored conversations, structured message types, and agent participation for the Coder IDE.

## Purpose

- Context-anchored conversations
- Structured message types
- Team messaging
- Channel management
- Agent participation
- Message history
- Notification system

---

## Key Components

### 1. Conversation Manager (`ConversationManager.ts`)

**Location:** `src/core/messaging/ConversationManager.ts`

**Purpose:** Core conversation management

**Features:**
- Context-anchored conversations
- No orphan conversations
- Conversation CRUD
- Context validation

**Key Methods:**
```typescript
async createConversation(contextType: ConversationContextType, contextId: string, projectId?: string, title?: string): Promise<Conversation>
async getConversation(conversationId: string): Promise<Conversation | null>
async getConversationsForContext(contextType: ConversationContextType, contextId: string): Promise<Conversation[]>
```

### 2. Message Manager (`MessageManager.ts`)

**Location:** `src/core/messaging/MessageManager.ts`

**Purpose:** Message management with structured types

**Features:**
- Structured message types
- Message lifecycle
- Expected actions
- Audit rules

**Key Methods:**
```typescript
async createMessage(input: CreateMessageInput): Promise<Message>
async getMessage(messageId: string): Promise<Message | null>
async listMessages(conversationId: string, options?: MessageListOptions): Promise<Message[]>
```

### 3. Agent Message Handler (`AgentMessageHandler.ts`)

**Location:** `src/core/messaging/AgentMessageHandler.ts`

**Purpose:** Agent participation in messaging

**Features:**
- Agent message sending
- Discussion summarization
- Agent conversation management
- Agent status updates

**Key Methods:**
```typescript
async sendAgentMessage(agentId: string, conversationId: string, content: string, messageType?: MessageType): Promise<Message>
async summarizeDiscussion(agentId: string, agentDefinition: AgentDefinition, conversationId: string, summary: string, keyPoints?: string[], decisions?: string[]): Promise<Message>
async getOrCreateAgentConversation(agentId: string, projectId?: string): Promise<string>
```

### 4. Escalation Manager (`EscalationManager.ts`)

**Location:** `src/core/messaging/EscalationManager.ts`

**Purpose:** Message escalation

**Features:**
- Escalation rules
- Escalation triggers
- Escalation handling
- Priority management

---

## Conversation Context

### Context Types

- `plan` - Linked to plan
- `step` - Linked to plan step
- `artifact` - Linked to artifact
- `agent` - Linked to agent
- `decision` - Linked to decision
- `incident` - Linked to incident

### Context-Anchored Principle

**No Orphan Conversations:**
- Every conversation must have context
- Context provides structure
- Context enables discovery
- Context links to related items

### Conversation Model

```typescript
interface Conversation {
  id: string;
  projectId?: string;
  title?: string;
  contextType: ConversationContextType;
  contextId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Message Types

### Structured Message Types

- `discussion` - General discussion
- `decision` - Decision made
- `approval_request` - Approval request
- `risk_notification` - Risk notification
- `incident_report` - Incident report
- `ai_recommendation` - AI recommendation
- `agent_status` - Agent status update

### Message Model

```typescript
interface Message {
  id: string;
  conversationId: string;
  threadId?: string;
  content: string;
  messageType: MessageType;
  senderType: 'human' | 'agent';
  senderId: string;
  agentId?: string;
  structuredData?: any;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Lifecycle

**Discussion:**
- Created → Active → Resolved

**Decision:**
- Created → Under Review → Approved/Rejected → Implemented

**Approval Request:**
- Created → Pending → Approved/Rejected → Notified

**Risk Notification:**
- Created → Acknowledged → Mitigated → Closed

---

## Message Operations

### Create Message

```typescript
// Create discussion message
const message = await messageManager.createMessage({
  conversationId: 'conv-123',
  content: 'What do you think about this approach?',
  messageType: 'discussion',
  senderType: 'human',
  senderId: userId,
});

// Create decision message
const decision = await messageManager.createMessage({
  conversationId: 'conv-123',
  content: 'We decided to use React for the frontend',
  messageType: 'decision',
  senderType: 'human',
  senderId: userId,
  structuredData: {
    decision: 'Use React',
    rationale: 'Better ecosystem',
    alternatives: ['Vue', 'Angular'],
  },
});
```

### List Messages

```typescript
// List messages in conversation
const messages = await messageManager.listMessages('conv-123', {
  limit: 50,
  offset: 0,
  order: 'asc',
});
```

---

## Agent Participation

### Agent Messages

```typescript
// Agent sends message
const agentMessage = await agentHandler.sendAgentMessage(
  'agent-123',
  'conv-123',
  'I recommend using TypeScript for type safety',
  'ai_recommendation'
);
```

### Discussion Summarization

```typescript
// Agent summarizes discussion
const summary = await agentHandler.summarizeDiscussion(
  'agent-123',
  agentDefinition,
  'conv-123',
  'Discussion summary: We decided to use React...',
  ['React chosen', 'TypeScript recommended'],
  ['Use React for frontend', 'Add TypeScript']
);
```

### Agent Conversations

```typescript
// Get or create agent conversation
const conversationId = await agentHandler.getOrCreateAgentConversation(
  'agent-123',
  projectId
);
```

---

## Escalation

### Escalation Rules

```typescript
// Escalation triggers
- Unanswered approval request > 24 hours
- High-risk notification not acknowledged
- Incident report requires attention
- Decision pending > 48 hours
```

### Escalation Process

```typescript
// Escalate message
await escalationManager.escalate(messageId, {
  reason: 'Unanswered approval request',
  escalateTo: ['manager-123', 'admin-456'],
  priority: 'high',
});
```

---

## Usage Examples

### Create Context-Anchored Conversation

```typescript
// Create conversation for plan
const conversation = await conversationManager.createConversation(
  'plan',
  planId,
  projectId,
  `Discussion: ${plan.title}`
);

// Create conversation for step
const stepConversation = await conversationManager.createConversation(
  'step',
  stepId,
  projectId,
  `Discussion: ${step.title}`
);
```

### Send Structured Message

```typescript
// Send approval request
const approval = await messageManager.createMessage({
  conversationId: conversation.id,
  content: 'Please approve this deployment',
  messageType: 'approval_request',
  senderType: 'human',
  senderId: userId,
  structuredData: {
    requestedBy: userId,
    requestedFrom: ['manager-123'],
    deadline: new Date('2025-01-30'),
    context: {
      deployment: 'v1.2.3',
      environment: 'production',
    },
  },
});
```

### Agent Participation

```typescript
// Agent participates in conversation
const agentMessage = await agentHandler.sendAgentMessage(
  'code-review-agent',
  conversationId,
  'I found 3 potential issues in the code',
  'ai_recommendation'
);
```

---

## Related Modules

- **Planning Module** - Conversations linked to plans
- **Execution Module** - Conversations linked to steps
- **Agents Module** - Agent participation
- **Knowledge Base Module** - Conversations converted to knowledge

---

## Summary

The Messaging Module provides comprehensive team messaging with context-anchored conversations and structured message types for the Coder IDE. With conversation management, structured messaging, agent participation, and escalation, it enables effective team communication throughout the development workflow.
