# quality-monitoring

Full specification for the Quality Monitoring container.

## 1. Reference

### Purpose

Anomaly detection, explanation quality, explainable AI, data quality validation. Used for ML/risk explanation and data quality.

### Configuration

From `config/default.yaml`: server.port (3060), cosmos_db, services (ai_service, ml_service, analytics_service, auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Quality anomalies, AI/ML/analytics-driven monitoring. See [containers/quality-monitoring/openapi.yaml](../../containers/quality-monitoring/openapi.yaml).

### Events

RabbitMQ for quality and anomaly events. See [containers/quality-monitoring/logs-events.md](../../containers/quality-monitoring/logs-events.md).

### Dependencies

- **Downstream:** ai-service, ml-service, analytics-service, auth, logging, user-management.
- **Upstream:** validation-engine, configuration-service, pattern-recognition; Gateway.

### Cosmos DB containers

Per config (partition key: tenantId).

---

## 2. Architecture

Quality and anomaly services, Cosmos, event consumers. [containers/quality-monitoring/README.md](../../containers/quality-monitoring/README.md).

---

## 3. Deployment

- **Port:** 3060. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `quality-monitoring`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/quality-monitoring/README.md](../../containers/quality-monitoring/README.md)
- [containers/quality-monitoring/config/default.yaml](../../containers/quality-monitoring/config/default.yaml)
- [containers/quality-monitoring/openapi.yaml](../../containers/quality-monitoring/openapi.yaml)
