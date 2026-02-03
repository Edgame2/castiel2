# multi-modal-service

Full specification for the Multi-Modal Service container.

## 1. Reference

### Purpose

Multi-modal inputs: image/diagram/audio/video understanding, OCR, code generation from visuals. Used by AI conversation and content flows.

### Configuration

From `config/default.yaml`: server.port (3044), cosmos_db (multimodal_jobs), services (ai_service, context_service, logging).

### Environment variables

`PORT`, `COSMOS_DB_*`, `AI_SERVICE_URL`, `CONTEXT_SERVICE_URL`, `LOGGING_URL`.

### API

Image/diagram/audio/video processing, modal router, design-to-code. See [containers/multi-modal-service/openapi.yaml](../../containers/multi-modal-service/openapi.yaml).

### Events

See container if present.

### Dependencies

- **Downstream:** ai-service, context-service, logging.
- **Upstream:** content-generation, ai-conversation; Gateway.

### Cosmos DB containers

multimodal_jobs (partition key: tenantId).

---

## 2. Architecture

Multi-modal processing pipeline, ai-service and context-service clients, Cosmos. [containers/multi-modal-service/README.md](../../containers/multi-modal-service/README.md).

---

## 3. Deployment

- **Port:** 3044. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `multi-modal-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/multi-modal-service/README.md](../../containers/multi-modal-service/README.md)
- [containers/multi-modal-service/config/default.yaml](../../containers/multi-modal-service/config/default.yaml)
- [containers/multi-modal-service/openapi.yaml](../../containers/multi-modal-service/openapi.yaml)
