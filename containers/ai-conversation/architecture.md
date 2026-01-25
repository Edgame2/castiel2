# AI Conversation Module - Architecture

## Overview

The AI Conversation module provides a complete AI conversation and context management system for Castiel. It handles conversation lifecycle, message management, context assembly, grounding, intent analysis, and related AI conversation features.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `conversation_conversations` | `/tenantId` | Conversation metadata and state |
| `conversation_messages` | `/tenantId` | Message content and history |
| `conversation_contexts` | `/tenantId` | Assembled context for conversations |
| `conversation_citations` | `/tenantId` | Citation data for grounded responses |

## Service Architecture

### Core Services

1. **ConversationService** - Main conversation management
   - Create, update, delete conversations
   - Conversation state management
   - Message history management

2. **ContextAssemblyService** - Context assembly (ai-context-assembly)
   - Assemble context from shards
   - Topic extraction
   - Context relevance scoring

3. **GroundingService** - Response grounding and citation
   - Ground responses in source material
   - Generate citations
   - Validate source references

4. **ConversationSummarizationService** - Conversation summarization
   - Summarize long conversations
   - Extract key points
   - Maintain conversation summaries

5. **IntentAnalyzerService** - Intent classification
   - Classify user intents
   - Pattern-based and LLM-based classification
   - Intent routing

6. **ContextQualityService** - Context quality assessment
   - Assess context relevance
   - Quality scoring
   - Context optimization

7. **ContextCacheService** - Context caching
   - Cache assembled contexts
   - Cache invalidation
   - Performance optimization

8. **CitationValidationService** - Citation validation
   - Validate citation accuracy
   - Source verification
   - Citation quality checks

9. **ConversationContextRetrievalService** - Context retrieval
   - Retrieve conversation context
   - Context search
   - Historical context access

10. **PromptInjectionDefenseService** - Prompt injection defense
    - Detect injection attempts
    - Sanitize inputs
    - Security validation

11. **ContextAwareQueryParserService** - Query parsing
    - Parse user queries
    - Extract entities and intents
    - Context-aware parsing

## Integration Points

- **ai-service**: LLM completions and AI processing
- **context-service**: Context assembly and management
- **shard-manager**: Shard access for context assembly
- **embeddings**: Semantic search for context retrieval

## Event-Driven Communication

### Published Events

- `conversation.created` - Conversation created
- `conversation.message.added` - Message added to conversation
- `conversation.context.assembled` - Context assembled for conversation

### Consumed Events

- `shard.updated` - Update conversation context when shards change

## Data Flow

1. User creates conversation → ConversationService creates conversation
2. User sends message → ConversationService adds message
3. ContextAssemblyService assembles context from shards
4. GroundingService grounds response with citations
5. IntentAnalyzerService classifies user intent
6. ContextQualityService assesses context quality
7. ConversationSummarizationService maintains summaries

## Security

- All queries include tenantId in partition key
- Prompt injection defense on all user inputs
- Citation validation ensures source accuracy
- Context caching respects tenant isolation
