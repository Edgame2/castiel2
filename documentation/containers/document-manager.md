# document-manager

Full specification for the Document Manager container.

## 1. Reference

### Purpose

Document and file management: upload/download, Azure Blob Storage, collections, templates, versioning.

### Configuration

From `config/default.yaml`: server.port (3024), cosmos_db (document_*), blob storage, services (shard_manager, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `AZURE_BLOB_*`, `RABBITMQ_URL`, service URLs.

### API

Document CRUD, upload/download, chunks, collections, templates. See [containers/document-manager/openapi.yaml](../../containers/document-manager/openapi.yaml).

### Events

RabbitMQ for document lifecycle. See container logs-events.md.

### Dependencies

- **Downstream:** shard-manager, logging, user-management; Azure Blob.
- **Upstream:** Gateway, integration-processors, content-generation.

### Cosmos DB containers

document_* (partition key: tenantId); Azure Blob for files.

---

## 2. Architecture

Document and collection services, Blob client, Cosmos. [containers/document-manager/README.md](../../containers/document-manager/README.md).

---

## 3. Deployment

- **Port:** 3024. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `document-manager`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId; blob paths tenant-scoped.

---

## 5. Links

- [containers/document-manager/README.md](../../containers/document-manager/README.md)
- [containers/document-manager/config/default.yaml](../../containers/document-manager/config/default.yaml)
- [containers/document-manager/openapi.yaml](../../containers/document-manager/openapi.yaml)
