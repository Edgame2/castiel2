# ai-conversation

Full specification for the AI Conversation container.

## 1. Reference

### Purpose

AI conversation and context: conversations, messages, context assembly, grounding, intent analysis, citation. Used by UI and agents for chat and contextual AI.

### Configuration

From `config/default.yaml`: server.port (3045), cosmos_db (conversation_*), services (auth, ai_service, context_service, shard_manager, embeddings, search_service), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Conversation CRUD, messages, context retrieval, summarization, citation, grounding, intent. See [containers/ai-conversation/openapi.yaml](../../containers/ai-conversation/openapi.yaml).

### Events

Consumes shard.updated; publishes conversation events. See container logs-events.md.

### Dependencies

- **Downstream:** ai-service, context-service, shard-manager, embeddings, search-service, auth, logging, user-management.
- **Upstream:** UI, gateway.

### Cosmos DB containers

conversation_* (partition key: tenantId).

---

## 2. Architecture

Conversation/message services, context assembly, Cosmos, event consumers. [containers/ai-conversation/README.md](../../containers/ai-conversation/README.md).

---

## 3. Deployment

- **Port:** 3045. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `ai-conversation`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/ai-conversation/README.md](../../containers/ai-conversation/README.md)
- [containers/ai-conversation/config/default.yaml](../../containers/ai-conversation/config/default.yaml)
- [containers/ai-conversation/openapi.yaml](../../containers/ai-conversation/openapi.yaml)
