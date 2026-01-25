# AI Conversation Module

Complete AI conversation and context management system for Castiel, providing conversation management, context assembly, grounding, intent analysis, and related AI conversation features.

## Features

- **Conversation Management**: Create, update, and manage AI conversations
- **Message Handling**: Send messages, edit messages, manage message history
- **Context Assembly**: Assemble context from shards for conversations (ai-context-assembly)
- **Grounding**: Response grounding and citation
- **Intent Analysis**: Intent classification and analysis (intent-analyzer)
- **Context Quality**: Context quality assessment (context-quality)
- **Context Caching**: Context caching for performance (context-cache)
- **Citation Validation**: Validate citations in responses (citation-validation)
- **Conversation Summarization**: Summarize long conversations (conversation-summarization)
- **Context Retrieval**: Retrieve conversation context (conversation-context-retrieval)
- **Prompt Injection Defense**: Defend against prompt injection attacks (prompt-injection-defense)
- **Query Parsing**: Context-aware query parsing (context-aware-query-parser)

## Quick Start

### Prerequisites

- Node.js 20+
- Azure Cosmos DB NoSQL account
- RabbitMQ 3.12+ (for event publishing)

### Installation

```bash
npm install
```

### Configuration

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your settings
```

### Database Setup

The module uses Azure Cosmos DB NoSQL (shared database with prefixed containers). Ensure the following containers exist:

- `conversation_conversations` - Conversation data (partition: `/tenantId`)
- `conversation_messages` - Message data (partition: `/tenantId`)
- `conversation_contexts` - Context data (partition: `/tenantId`)
- `conversation_citations` - Citation data (partition: `/tenantId`)

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Reference

See [OpenAPI Spec](./openapi.yaml)

## Events

### Published Events

- `conversation.created` - Conversation created
- `conversation.message.added` - Message added to conversation
- `conversation.context.assembled` - Context assembled for conversation

### Consumed Events

- `shard.updated` - Update conversation context when shards change

## Dependencies

- **ai-service**: For LLM completions
- **context-service**: For context assembly
- **shard-manager**: For shard access
- **embeddings**: For semantic search

## Development

### Running Tests

```bash
npm test
```

## License

Proprietary
