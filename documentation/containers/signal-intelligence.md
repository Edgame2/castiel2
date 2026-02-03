# signal-intelligence

Full specification for the Signal Intelligence container.

## 1. Reference

### Purpose

Communication analysis, calendar intelligence, social signals, product usage, competitive intelligence, customer success. Feeds competitive and behavioral signals for risk/forecasting.

### Configuration

From `config/default.yaml`: server.port (3059), cosmos_db (signal_*), services (ai_service, analytics_service, integration_manager, auth, logging, user_management), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`, service URLs.

### API

Communications, signals, integration and analytics. See [containers/signal-intelligence/openapi.yaml](../../containers/signal-intelligence/openapi.yaml).

### Events

RabbitMQ for signal and communication events. See [containers/signal-intelligence/logs-events.md](../../containers/signal-intelligence/logs-events.md).

### Dependencies

- **Downstream:** ai-service, analytics-service, integration-manager, auth, logging, user-management.
- **Upstream:** risk-analytics, forecasting; Gateway.

### Cosmos DB containers

signal_* (partition key: tenantId).

---

## 2. Architecture

Signal and communication services, Cosmos, event consumers. [containers/signal-intelligence/README.md](../../containers/signal-intelligence/README.md).

---

## 3. Deployment

- **Port:** 3059. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `signal-intelligence`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/signal-intelligence/README.md](../../containers/signal-intelligence/README.md)
- [containers/signal-intelligence/config/default.yaml](../../containers/signal-intelligence/config/default.yaml)
- [containers/signal-intelligence/openapi.yaml](../../containers/signal-intelligence/openapi.yaml)
