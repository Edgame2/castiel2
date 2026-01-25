# Web Search Module - Architecture

## Overview

The Web Search module provides web search integration and context services for the Castiel system. It integrates with web search providers, caches results, and integrates search results into AI context.

## Database Architecture

### Cosmos DB NoSQL Structure

| Container Name | Partition Key | Description |
|----------------|---------------|-------------|
| `web_search_results` | `/tenantId` | Web search results |
| `web_search_cache` | `/tenantId` | Web search cache |

## Service Architecture

### Core Services

1. **WebSearchService** - Web search orchestration
   - Web search integration
   - Result caching
   - Context integration

## Integration Points

- **ai-service**: AI-powered search processing
- **context-service**: Context integration
- **embeddings**: Semantic search
