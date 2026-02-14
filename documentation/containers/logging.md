# logging

Full specification for the Logging container.

## 1. Reference

### Purpose

Audit logging: tamper-evident hash chain, retention, redaction, compliance (SOC2, GDPR, PCI-DSS). **DataLakeCollector** and **MLAuditConsumer** for BI Risk: Parquet and ML audit blobs to Azure Data Lake when `data_lake.connection_string` is set.

### Configuration

Main entries from `config/default.yaml`:

- **server:** `port` (3014), `host`
- **cosmos_db:** endpoint, key, database_id; containers (audit_logs, audit_retention_policies, audit_alert_rules, audit_hash_checkpoints, audit_configurations, audit_exports)
- **storage.provider:** cosmos | elasticsearch
- **data_lake.connection_string:** Azure Storage connection (required for DataLakeCollector and MLAuditConsumer in BI Risk)
- **rabbitmq:** bindings for event-driven ingestion (auth.#, user.#, secret.#, notification.#, risk.*, ml.*, etc.)

### Environment variables

- `PORT`, `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`, `RABBITMQ_URL`
- `DATA_LAKE_CONNECTION_STRING` or equivalent for Data Lake

### API

Log ingest, batch, search, aggregate, my-activity; retention and export. See [containers/logging/openapi.yaml](../../containers/logging/openapi.yaml) or docs.

### Events

- **Consumed:** auth.#, user.#, secret.#, notification.#, risk.evaluated, ml.prediction.completed, and other ML/risk events for audit and Data Lake write.
- **Published:** (optional) audit.ingested or similar.

### Dependencies

- **Downstream:** Cosmos DB; Azure Data Lake (optional).
- **Upstream:** All services send audit events or call logging APIs; gateway client path: `/api/v1/logs`, `/api/v1/export`, `/api/v1/config` (per API_RULES).

### Cosmos DB containers

- `audit_logs`, `audit_retention_policies`, `audit_alert_rules`, `audit_hash_checkpoints`, `audit_configurations`, `audit_exports` (partition key: tenantId).

---

## 2. Architecture

- **Internal structure:** Ingest API, event consumers (RabbitMQ), DataLakeCollector, MLAuditConsumer, hash chain, retention/redaction, search/aggregate.
- **Data flow:** REST ingest or event → validation → Cosmos (+ optional Data Lake Parquet/ML audit).
- **Links:** [containers/logging/README.md](../../containers/logging/README.md), [containers/logging/docs/architecture.md](../../containers/logging/docs/architecture.md).

---

## 3. Deployment

- **Port:** 3014.
- **Health:** `/health` (see server).
- **Scaling:** Stateless ingest; scale consumers for RabbitMQ.
- **Docker Compose service name:** `logging`.

---

## 4. Security / tenant isolation

- **X-Tenant-ID:** Required on ingest; all queries and storage are tenant-scoped; partition key tenantId for audit_* containers.

---

## 5. Links

- [containers/logging/README.md](../../containers/logging/README.md)
- [containers/logging/config/default.yaml](../../containers/logging/config/default.yaml)
- [containers/logging/openapi.yaml](../../containers/logging/openapi.yaml) or docs
