# learning-service

Full specification for the Learning Service container.

## 1. Reference

### Purpose

Feedback loop: record feedback and outcomes, aggregate, satisfaction, trends. Publishes feedback.recorded, outcome.recorded, feedback.trend.alert. Feeds into model improvement and BI/risk quality.

### Configuration

From `config/default.yaml`: server.port (3063), cosmos_db (user_feedback, outcome), rabbitmq.

### Environment variables

`PORT`, `COSMOS_DB_*`, `RABBITMQ_URL`.

### API

Feedback and outcome recording, aggregation, satisfaction, trends. See [containers/learning-service/openapi.yaml](../../containers/learning-service/openapi.yaml).

### Events

- **Published:** feedback.recorded, outcome.recorded, feedback.trend.alert.

### Dependencies

- **Downstream:** Cosmos, RabbitMQ.
- **Upstream:** risk-analytics (outcome-sync), ml-service, quality flows; Gateway if exposed.

### Cosmos DB containers

user_feedback, outcome (partition key: tenantId).

---

## 2. Architecture

Feedback and outcome services, Cosmos, event publisher. [containers/learning-service/README.md](../../containers/learning-service/README.md).

---

## 3. Deployment

- **Port:** 3063. **Health:** /health. **Scaling:** Stateless. **Docker Compose:** `learning-service`.

---

## 4. Security / tenant isolation

X-Tenant-ID required; partition key tenantId.

---

## 5. Links

- [containers/learning-service/README.md](../../containers/learning-service/README.md)
- [containers/learning-service/config/default.yaml](../../containers/learning-service/config/default.yaml)
- [containers/learning-service/openapi.yaml](../../containers/learning-service/openapi.yaml)
