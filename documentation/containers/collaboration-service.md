# collaboration-service

Full specification for the Collaboration Service container.

## 1. Reference

### Purpose

Real-time collaboration: conversations, messages; collaboration insights. Builds on collaboration-service for shared context and notifications.

### Configuration

From `config/default.yaml`: server.port (3031), cosmos_db (collaboration_*), services (shard_manager, logging, user_management, notification_manager, ai_insights).

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Conversations, messages, real-time collaboration, collaboration insights, notifications. See [containers/collaboration-service/openapi.yaml](../../containers/collaboration-service/openapi.yaml).

### Events

See container logs-events.md if present.

### Dependencies

- **Downstream:** shard-manager, logging, user-management, notification-manager, ai-insights.
- **Upstream:** Gateway, document-manager, pipeline-manager.

### Cosmos DB containers

collaboration_* (partition key: tenantId).

---

## 2. Architecture

Conversation/message services, collaboration intelligence, Cosmos. [containers/collaboration-service/README.md](../../containers/collaboration-service/README.md).

---

## 3. Deployment

- **Port:** 3031. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `collaboration-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/collaboration-service/README.md](../../containers/collaboration-service/README.md)
- [containers/collaboration-service/config/default.yaml](../../containers/collaboration-service/config/default.yaml)
- [containers/collaboration-service/openapi.yaml](../../containers/collaboration-service/openapi.yaml)
